import json
import requests
import simpleflake

from django.db import models
from django.db import IntegrityError
from django.conf import settings
from django.db.models.query import QuerySet
from django.core.cache import cache
from django.core.urlresolvers import reverse

from jsonfield import JSONCharField

from common import models as _models
from common.message_queue import MessageSender

from common.utils import shard_id, current_timestamp, to_org_id, Landbridge
from common.const import DestType, SrcType
import logging

log = logging.getLogger(__name__)


class Message(_models.BaseOrgModel):
    # Const Variables
    TYPE_INVITATION_CREATED = 0
    TYPE_INVITATION_UPDATED = 1

    TYPE_TEXT_CHAT_CREATED = 2
    TYPE_MULTIMEDIA_CHAT_CREATED = 3

    TYPE_TASK_CREATED = 5
    TYPE_TASK_COMPLETED = 47
    TYPE_TASK_COMMENT_CREATED = 22

    TYPE_USER_UPDATED = 8
    TYPE_CONVERSATION_CREATED = 9

    TYPE_ORG_CREATED = 10
    TYPE_ORG_UPDATED = 11

    TYPE_DISCUSSION_GROUP_CREATED = 12
    TYPE_DISCUSSION_GROUP_UPDATED = 13

    TYPE_ORG_MEMBER_JOINED = 14
    TYPE_ORG_MEMBER_LEFT = 15

    TYPE_DISCUSSION_GROUP_MEMBER_JOINED = 16
    TYPE_DISCUSSION_GROUP_MEMBER_LEFT = 17

    TYPE_CONVERSATION_UPDATED = 18

    TYPE_DISCUSSION_GROUP_DISBANDED = 20
    TYPE_CONVERSATION_DELETED = 21

    TYPE_PROJECT_CREATED = 28
    TYPE_PROJECT_UPDATED = 29
    TYPE_PROJECT_DELETED = 30

    TYPE_PROJECT_MEMBER_JOINED = 31
    TYPE_PROJECT_MEMBER_LEFT = 32

    TYPE_PLAN_CREATED_DISUSED = 33
    TYPE_PLAN_UPDATED_DISUSED = 34
    TYPE_PLAN_DELETED_DISUSED = 35

    TYPE_TAG_CREATED = 36
    TYPE_TAG_UPDATED = 37
    TYPE_TAG_DELETED = 38

    TYPE_DEPARTMENT_CREATED = 40
    TYPE_DEPARTMENT_UPDATED = 41
    TYPE_DEPARTMENT_DISBANDED = 42

    TYPE_DEPARTMENT_MEMBER_JOINED = 43
    TYPE_DEPARTMENT_MEMBER_LEFT = 44

    TYPE_AGENT_GOT_ONLINE = 45
    TYPE_AGENT_GOT_OFFLINE = 46

    TYPE_FILES_CREATED = 48

    TYPE_USER_SELF_PASSWORD_CHANGED = 49
    TYPE_USER_GOT_OFFLINE = 50

    TYPE_ORG_MEMBER_UPDATED = 51

    TYPE_ORG_APP_INSTALLED = 58
    TYPE_ORG_APP_UNINSTALLED = 59

    TYPE_ORG_MEMBER_NAVIGATION_APP_INSTALLED = 60
    TYPE_ORG_MEMBER_NAVIGATION_APP_UNINSTALLED = 61

    TYPE_MEMBER_DEPARTMENTS_UPDATED = 55
    TYPE_MEMBER_DEPARTMENTS_UPDATED_V2 = 100

    TYPE_VOICE_MESSAGE_UPDATED = 56

    TYPE_CONVERSATION_MESSAGES_DELETED = 57
    TYPE_MESSAGE_READ = 62

    TYPE_MESSSAGES_UPDATED = 64
    TYPE_MESSAGE_UPDATED = 65

    TYPE_ORG_ADMIN_CREATED = 66
    TYPE_ORG_ADMIN_DELETED = 67

    TYPE_APP_CONTENT_UPDATED = 63

    ########################################################
    STATUS_NULL = 0
    STATUS_READ = 1

    CONTENT_TYPE_SNAPSHOT = 0
    CONTENT_TYPE_RESOURCE = 1

    # instance extra attributes
    _send_to_self = True  # control whether send to self device
    _snapshot = None

    # Fields
    src_id = _models.PositiveBigIntegerField()
    src_type = models.PositiveSmallIntegerField()

    dest_id = _models.PositiveBigIntegerField()
    dest_type = models.PositiveSmallIntegerField()

    type = models.PositiveSmallIntegerField()

    content_type = models.PositiveSmallIntegerField(default=CONTENT_TYPE_SNAPSHOT)
    content = _models.PositiveBigIntegerField(default=0)

    date_added = models.PositiveIntegerField()

    resource_id = _models.PositiveBigIntegerField(default=0)

    is_sent = models.PositiveSmallIntegerField(default=0, db_index=True)

    # Methods
    def has_owner(self, user_id):
        r = UserMessage.objects \
            .using(self._state.db) \
            .filter(user_id=user_id, message_id=self.id)
        if r:
            return True

        return Message.has_owner2(
            user_id, to_org_id(self._state.db),
            self.src_type, self.src_id,
            self.dest_type, self.dest_id,
            self.date_added
        )

    @classmethod
    def has_owner2(cls, user_id, org_id, src_type, src_id, dest_type, dest_id, created_at):
        if dest_type == DestType.ORG_MEMBER:
            if src_type == SrcType.ORG_MEMBER:
                return user_id in (src_id, dest_id)

            return user_id == dest_id

        from apps.account.models import User
        user = User.objects.get_or_none(id=user_id)
        if not user:
            return False

        if dest_type == DestType.DISCUSSION_GROUP:
            r = user.in_discussion_group(org_id, dest_id)
            if not r:
                return False

            return r.date_joined < created_at

        if dest_type == DestType.DEPARTMENT:
            return user.in_department(org_id, dest_id)

        return False

    @classmethod
    def load_by_user_messages(cls, org_id, user_messages):
        if isinstance(user_messages, QuerySet):
            messages_status = {k: v for k, v in user_messages.values_list('message_id', 'status')}
        else:
            messages_status = {um.message_id: um.status for um in user_messages}

        messages = Message.objects\
            .using(org_id)\
            .filter(id__in=messages_status.keys())

        message_contents = MessageContent.objects \
            .using(org_id) \
            .filter(id__in=[i.content for i in messages
                    if i.content_type == Message.CONTENT_TYPE_SNAPSHOT])
        message_contents = dict([(i.id, i) for i in message_contents])

        ret = {}
        for m in messages:
            r = m.to_dict()

            if m.content_type == Message.CONTENT_TYPE_SNAPSHOT:
                r['body'] = message_contents[m.content].content
            elif m.content_type == Message.CONTENT_TYPE_RESOURCE:
                r['body'] = cls._load_resource(m)
                if not r['body']:
                    continue
            else:
                raise ValueError('invalid content type')

            ret[m.id] = r

        return ret

    @classmethod
    def _load_resource(cls, message):
        if message.type == Message.TYPE_INVITATION_CREATED:
            from apps.org.models import Invitation

            r = Invitation.objects.get_or_none(id=message.content)
            if not r:
                return None

            return {'invitation': r.to_dict()}

        raise ValueError('not supported yet!')

    @classmethod
    def unread_users(cls, org_id, *message_ids):
        ums = UserMessage.objects.using(shard_id(org_id))\
            .filter(message_id__in=message_ids, status=Message.STATUS_NULL)\
            .values_list('message_id', 'user_id')

        results = dict((m, []) for m in message_ids)
        for message_id, user_id in ums:
            results[message_id].append(user_id)

        return results

    def save(self, *args, **kwargs):
        if not self.pk:
            if not self.date_added:
                self.date_added = current_timestamp()

        if self.pk:
            return super(Message, self).save(*args, **kwargs)

        self.dest_id = int(self.dest_id)

        kwargs['force_insert'] = True
        for i in range(10):
            self.id = simpleflake.simpleflake()
            try:
                return super(Message, self).save(*args, **kwargs)
            except IntegrityError as e:
                continue

        raise e

    def to_dict(self):
        ret = super(Message, self).to_dict(
            exclude=['content', 'content_type', 'is_sent', 'resource_id']
        )
        ret.update(scope_org_id=self.org_id)
        return ret

    def sendout(self, data, db=None, write_db=False):
        # only TYPE_TEXT_CHAT_CREATED, TYPE_MULTIMEDIA_CHAT_CREATED use _send_to_self=Fasle
        if not self._send_to_self:
            from common.globals import get_current_session_id
            session_id = get_current_session_id()
        else:
            session_id = None

        if not write_db:
            org_id = self.org_id if db is None else to_org_id(db)
            MessageSender(self.type, data, org_id) \
                .send(src_id=self.src_id, src_type=self.src_type,
                      dest_id=self.dest_id, dest_type=self.dest_type,
                      date_added=self.date_added, message_id=self.id, session_id=session_id)
        elif not self.id:
            content_obj = MessageContent(content=data)
            content_obj.save(using=db)

            self.content = content_obj.id
            self._snapshot = content_obj.content
            self.save(using=db)
        else:
            raise RuntimeError('can not MessageContent.sendout(write_db=True) id=%s' % self.id)

    class Meta:
        db_table = 'message'
        index_together = [['type', 'resource_id']]


class UserMessage(_models.BaseOrgModel):
    user_id = _models.PositiveBigIntegerField(db_index=True)

    peer_id = _models.PositiveBigIntegerField()
    peer_type = models.PositiveSmallIntegerField()

    message_id = _models.PositiveBigIntegerField(db_index=True)
    status = models.PositiveSmallIntegerField()
    update_at = models.PositiveIntegerField(default=0)

    @property
    def is_unread(self):
        return int(self.status == Message.STATUS_NULL)

    @property
    def is_read(self):
        return int(self.status == Message.STATUS_READ)

    def save(self, force_save=False, *args, **kwargs):
        if self.id and not force_save:
            #  block user message status update unexpected
            raise RuntimeError('unexpected save UserMessage: %s' % (self.id))

        self.update_at = current_timestamp()
        super(UserMessage, self).save(*args, **kwargs)

    class Meta:
        db_table = 'message_user_message'


class MessageContent(_models.BaseOrgModel):
    content = JSONCharField(max_length=4096 * 16)

    class Meta:
        db_table = 'message_message_content'


class UserConversation(_models.SimpleBaseOrgModel):
    CACHE_EXPIRE_SECONDS = 3600

    user_id = _models.PositiveBigIntegerField()

    peer_id = _models.PositiveBigIntegerField()
    peer_type = models.PositiveSmallIntegerField()

    last_message_id = _models.PositiveBigIntegerField()
    max_message_id = _models.PositiveBigIntegerField(default=0)

    unread_count = models.PositiveIntegerField()
    last_updated = models.PositiveIntegerField()

    is_hide = models.PositiveIntegerField(default=0)

    @classmethod
    def find_by_user(cls, org_id, user_id):
        r = Landbridge.send_request(
            user_id,
            reverse('conversations-list', kwargs={
                'org_id': org_id, 'user_id': user_id}
            )
        )
        return json.loads(r.content.decode('utf8'))

    @classmethod
    def find(cls, org_id, peer_type, peer_id):
        key = 'UserConversationPeerCache:{org_id}:{peer_type}:{peer_id}'.format(
            org_id=org_id,
            peer_type=peer_type,
            peer_id=peer_id
        )
        v = cache.get(key)
        if v is None:
            v = cls._find0(org_id, peer_type, peer_id)
            cache.set(key, v, cls.CACHE_EXPIRE_SECONDS)

        return v

    @classmethod
    def _find0(cls, org_id, peer_type, peer_id):
        result = {}
        for shard, v in settings.LANDBRIDGE_SPEC['shard'].items():
            url = '{prefix}/v1/orgs/{org_id}/conversations'.format(
                prefix=v['rest_url'],
                org_id=org_id
            )
            r = json.loads(requests.get(
                url, params={'peer_type': peer_type, 'peer_id': peer_id}
            ).content.decode('utf8'))
            for i in r:
                result[(i['user_id'], i['id'])] = i

        return result

    class Meta:
        db_table = 'message_user_conversation'
        unique_together = ('user_id', 'peer_type', 'peer_id')
        index_together = [['user_id', 'last_updated']]


class UserLastOldMessage(_models.BaseModel):
    user_id = _models.PositiveBigIntegerField(db_index=True)
    last_old_message_id = _models.PositiveBigIntegerField()

    class Meta:
        db_table = 'message_user_last_old_message'
