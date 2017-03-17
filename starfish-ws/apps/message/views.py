import json

from rest_framework.response import Response
from django.core.urlresolvers import reverse
from django.db.models.base import ModelState

from apps.message.models import (
    Message, UserMessage, UserLastOldMessage)
from apps.message import chat, app
from apps.account.models import User
from apps.search import send_index_cmd

from common.const import ErrorCode, DestType, SrcType
from common.message_queue import MessageSender
from common.utils import current_timestamp, Landbridge, shard_id
from common.viewset import ViewSet

import logging
log = logging.getLogger(__name__)


class BaseMessageViewSet(ViewSet):
    def _build_result(self, request, user_messages, org_id=0):
        messages = Message.load_by_user_messages(org_id, user_messages)
        return [messages[um.message_id] for um in user_messages if um.message_id in messages]


class ConversationViewSet(ViewSet):
    DEFAULT_PAGE_SIZE = 50

    def list(self, request, org_id, user_id):
        r = Landbridge.send_request(
            request.current_uid,
            reverse('conversations-list', kwargs={
                'org_id': org_id,
                'user_id': user_id,
            }),
            request.GET
        )
        return Response({'errcode': ErrorCode.OK, 'data': json.loads(r.content.decode('utf8'))})

    def destroy(self, request, org_id, user_id, conversation_id):
        update_props = {'id': int(conversation_id)}
        MessageSender(
            Message.TYPE_CONVERSATION_DELETED,
            {'conversation': update_props},
            org_id
        ).send(
            src_id=user_id,
            src_type=SrcType.ORG_MEMBER,
            dest_id=user_id,
            dest_type=DestType.ORG_MEMBER,
            date_added=current_timestamp(),
        )

        return Response({'errcode': ErrorCode.OK})

    def partial_update(self, request, org_id, user_id, conversation_id):
        update_props = {'id': int(conversation_id)}
        for prop in ('is_hidden', 'last_old_message_id'):
            if prop in request.DATA:
                update_props[prop] = request.DATA[prop]
        MessageSender(
            Message.TYPE_CONVERSATION_UPDATED,
            {'conversation': update_props},
            org_id
        ).send(
            src_id=user_id,
            src_type=SrcType.ORG_MEMBER,
            dest_id=user_id,
            dest_type=DestType.ORG_MEMBER,
            date_added=current_timestamp(),
        )

        return Response({'errcode': ErrorCode.OK})


class OrgMessageViewSet(
        BaseMessageViewSet,
        chat.ChatMessageMixin, app.AppMessageMixin):

    PAGE_SIZE = 30
    UNREAD_PAGE_SIZE = 100

    def create(self, request, org_id):
        self._normalize_dest(request)

        for dest in request.DATA['dests']:
            dest_type, dest_id = dest['type'], dest['id']
            if dest_type == DestType.ORG_MEMBER:
                u = User.objects.get_or_none(id=dest_id)
                if not u or not u.in_org(org_id):
                    return Response({'errcode': ErrorCode.PERMISSION_DENIED})
            elif dest_type == DestType.DISCUSSION_GROUP:
                if not request.current_user.in_discussion_group(org_id, dest_id):
                    return Response({'errcode': ErrorCode.PERMISSION_DENIED})
            elif dest_type == DestType.DEPARTMENT:
                message_type = int(request.DATA['type'])
                if message_type in (Message.TYPE_APP_CONTENT_UPDATED,):
                    pass
                else:
                    if not request.current_user.in_department(org_id, dest_id):
                        return Response({'errcode': ErrorCode.PERMISSION_DENIED})
            else:
                return Response({'errcode': ErrorCode.INVALID_DEST_TYPE})

        return self._create_message(request, org_id)

    def _create_message(self, request, org_id):
        message_type = int(request.DATA['type'])
        messages, ret = [], []
        if message_type in (Message.TYPE_TEXT_CHAT_CREATED, Message.TYPE_MULTIMEDIA_CHAT_CREATED):
            messages = [
                self.create_chat_message(request, org_id, dest['type'], dest['id'])
                for dest in request.DATA['dests']
            ]

        if message_type in (Message.TYPE_APP_CONTENT_UPDATED, ):
            messages = [
                self.create_app_message(request, org_id, dest['type'], dest['id'])
                for dest in request.DATA['dests']
            ]

        for m in messages:
            m._state = ModelState(db=shard_id(org_id))
            m.date_added = current_timestamp()
            r = m.to_dict()
            r.update({
                'scope_org_id': org_id,
                'body': m._snapshot,
            })

            ret.append(r)

            if not m._send_to_self:
                from common.globals import get_current_session_id
                session_id = get_current_session_id()
            else:
                session_id = None

            MessageSender(
                m.type, m._snapshot, org_id
            ).send(
                src_id=m.src_id,
                src_type=m.src_type,
                dest_id=m.dest_id,
                dest_type=m.dest_type,
                date_added=m.date_added,
                message_id=m.id,
                session_id=session_id
            )

            send_index_cmd(Message, m.id, org_id, True, r)

        if not ret:
            return Response({'errcode': ErrorCode.INVALID_MESSAGE_TYPE})
        elif len(ret) == 1:
            return Response({'errcode': ErrorCode.OK, 'data': ret[0]})
        else:
            return Response({'errcode': ErrorCode.OK, 'data': ret})

    def delete_conversation_messages(self, request, org_id, user_id, conversation_id):
        update_props = {'id': int(conversation_id)}
        MessageSender(
            Message.TYPE_CONVERSATION_MESSAGES_DELETED,
            {'conversation': update_props},
            org_id
        ).send(
            src_id=user_id,
            src_type=SrcType.ORG_MEMBER,
            dest_id=user_id,
            dest_type=DestType.ORG_MEMBER,
            date_added=current_timestamp(),
        )

        return Response({'errcode': ErrorCode.OK})

    def list(self, request, org_id, user_id, conversation_id):
        r = Landbridge.send_request(
            request.current_uid,
            reverse('conversation-messages-list', kwargs={
                'org_id': org_id,
                'user_id': user_id,
                'conversation_id': conversation_id,
            }),
            request.GET
        )
        return Response({'errcode': ErrorCode.OK, 'data': json.loads(r.content.decode('utf8'))})

    def _normalize_dest(self, request):
        # dest_type, dest_id -> dests
        if 'dest_type' in request.DATA:
            request.DATA['dests'] = [
                {'type': request.DATA['dest_type'],
                 'id': request.DATA['dest_id']}
            ]

    def partial_update(self, request, org_id):
        grouped_messages = {}
        for m in request.DATA['messages']:
            key = (m['src_id'], m['src_type'])
            if key not in grouped_messages:
                grouped_messages[key] = set()
            grouped_messages[key].add(m['id'])

        for k, v in grouped_messages.items():
            MessageSender(
                Message.TYPE_MESSAGE_READ,
                {
                    'reader': request.current_uid,
                    'messages': list(v)
                },
                org_id
            ).send(
                src_id=request.current_uid,
                src_type=SrcType.ORG_MEMBER,
                dest_id=k[0],
                dest_type=DestType.ORG_MEMBER,
                date_added=current_timestamp(),
            )

        return Response({'errcode': ErrorCode.OK})


class GlobalMessageViewSet(BaseMessageViewSet):
    PAGE_SIZE = 30

    def list(self, request, user_id):
        qs = UserMessage.objects \
            .filter(user_id=user_id)

        start = int(request.GET.get('start', 0))
        if start:
            qs = qs.filter(message_id__lt=start)

        ret = qs.order_by('-id')[:self.PAGE_SIZE]

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_result(request, ret)})

    def last_old(self, request, user_id):
        r, _ = UserLastOldMessage.objects \
            .get_or_create(
                user_id=user_id,
                defaults={
                    'last_old_message_id': 0
                }
            )
        return Response({
            'errcode': ErrorCode.OK,
            'data': r.last_old_message_id
        })

    def update_last_old(self, request, user_id):
        r, created = UserLastOldMessage.objects \
            .get_or_create(
                user_id=user_id,
                defaults={
                    'last_old_message_id': request.DATA
                }
            )
        if not created:
            r.last_old_message_id = request.DATA
            r.save()

        MessageSender(
            Message.TYPE_MESSSAGES_UPDATED,
            {
                'last_old': r.last_old_message_id
            }
        ).send(
            src_id=0,
            src_type=SrcType.SYSTEM,
            dest_id=request.current_uid,
            dest_type=DestType.ORG_MEMBER,
            date_added=current_timestamp(),
        )

        return Response({'errcode': ErrorCode.OK})


class MessageUpdateViewSet(BaseMessageViewSet):

    HALF_HOUR = 1800

    def update(self, request, org_id, user_id, message_id):
        if request.current_uid != user_id:
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        resp = Landbridge.send_request(
            request.current_uid,
            '/v1/orgs/%s/members/%s/messages/%s' %
            (org_id, request.current_uid, message_id)
        )
        message = json.loads(resp.content.decode('utf8'))
        if not message:
            return Response({'errcode': ErrorCode.NO_SUCH_MESSAGE})

        if not Message.has_owner2(
                request.current_uid, org_id,
                message['src_type'], message['src_id'],
                message['dest_type'], message['dest_id'],
                message['created_at']
                ):
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        update_props = {}
        for prop in ('is_deleted',):
            if prop in request.DATA:
                update_props[prop] = request.DATA[prop]

        if 'is_deleted' in update_props:
            if current_timestamp() - message['created_at'] > self.HALF_HOUR:
                return Response({'errcode': ErrorCode.PROCESS_MSG_EXCEED_TIME_LIMIT})

        MessageSender(
            Message.TYPE_MESSAGE_UPDATED, update_props, org_id
        ).send(
            src_id=message['src_id'],
            src_type=message['src_type'],
            dest_id=message['dest_id'],
            dest_type=message['dest_type'],
            date_added=current_timestamp(),
            message_id=message_id
        )

        return Response({'errcode': ErrorCode.OK})
