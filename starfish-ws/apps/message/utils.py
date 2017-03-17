from apps.message.models import Message, MessageContent
from apps.org.models import UserDiscussionGroup, Department
from common import AutoRegistryBase

from common.const import DestType, PeerType, SrcType

import logging
log = logging.getLogger(__name__)


class UserMessageCreator(AutoRegistryBase):
    NEED_UPDATE_CONVERSATION = True
    REGIST_KEY = (
        Message.TYPE_MULTIMEDIA_CHAT_CREATED,
        Message.TYPE_TEXT_CHAT_CREATED,

        Message.TYPE_APP_CONTENT_UPDATED,

        Message.TYPE_VOICE_MESSAGE_UPDATED,
    )

    def __init__(self, message):
        self.org_id = message.org_id
        self.message = message
        self.peer_type = {
            DestType.ORG_MEMBER: PeerType.ORG_MEMBER,
            DestType.DEPARTMENT: PeerType.DEPARTMENT,
            DestType.DISCUSSION_GROUP: PeerType.DISCUSSION_GROUP,
        }.get(message.dest_type)

        self.result = []  # save a tuple of (user_id, peer_id, peer_type, status)
        self.build_user_messages()  # do the build job

    def _message_content(self):
        body = MessageContent.objects \
            .using(self.message.org_id) \
            .getx(id=self.message.content).content

        return body

    def add(self, user_id, peer_id=None, peer_type=None, status=None):
        if peer_id is None:
            peer_id = self.message.dest_id

        if peer_type is None:
            peer_type = self.peer_type

        if status is None:
            if self.message.src_type == SrcType.ORG_MEMBER and user_id == self.message.src_id:
                status = Message.STATUS_READ
            else:
                status = Message.STATUS_NULL

        self.result.append(
            (user_id, peer_id, peer_type, status)
        )

    def build_user_messages(self):
        if self.message.dest_type is DestType.ORG_MEMBER:
            self.add(self.message.src_id)

            if self.message.dest_id != self.message.src_id:
                self.add(self.message.dest_id, self.message.src_id)

        elif self.message.dest_type is DestType.DISCUSSION_GROUP:
            for user_id in UserDiscussionGroup.user_ids(self.message.org_id, self.message.dest_id):
                self.add(user_id)

        elif self.message.dest_type is DestType.DEPARTMENT:
            for user_id in Department.user_ids(self.message.org_id, self.message.dest_id):
                self.add(user_id)


class GroupDisbandedMessageCreator(UserMessageCreator):
    NEED_UPDATE_CONVERSATION = False
    REGIST_KEY = (
        Message.TYPE_DISCUSSION_GROUP_DISBANDED,
    )

    def build_user_messages(self):
        for user_id in UserDiscussionGroup.user_ids(self.message.org_id, self.message.dest_id,
                                                    filter_disbanded=False):
            self.add(user_id, status=Message.STATUS_READ)


class DepartmentDisbandedMessageCreator(UserMessageCreator):
    NEED_UPDATE_CONVERSATION = False
    REGIST_KEY = (
        Message.TYPE_DEPARTMENT_DISBANDED,
    )

    def build_user_messages(self):
        message_content = self._message_content()
        group_id = message_content['group']['id']
        for user_id in Department.user_ids(self.message.org_id, group_id,
                                           direct_in=1, filter_disbanded=False):
            self.add(user_id, status=Message.STATUS_READ,
                     peer_type=PeerType.DEPARTMENT, peer_id=group_id)


class GroupMemberLeftMessageCreator(GroupDisbandedMessageCreator):
    NEED_UPDATE_CONVERSATION = False
    REGIST_KEY = (
        Message.TYPE_DISCUSSION_GROUP_MEMBER_LEFT,
    )

    def build_user_messages(self):
        # super(GroupMemberLeftMessageCreator, self).build_user_messages()
        body = self._message_content()
        user_id = body['user']['id']
        if user_id:
            self.add(user_id, status=Message.STATUS_READ)

        operator_id = body['operator'].get('id')
        if operator_id and user_id != operator_id:
            if operator_id in UserDiscussionGroup.user_ids(self.org_id, self.message.dest_id):
                self.add(operator_id, status=Message.STATUS_READ)


class DepartmentMemberLeftMessageCreator(DepartmentDisbandedMessageCreator):
    NEED_UPDATE_CONVERSATION = False
    REGIST_KEY = (
        Message.TYPE_DEPARTMENT_MEMBER_LEFT,
    )

    def build_user_messages(self):
        # super(DepartmentMemberLeftMessageCreator, self).build_user_messages()
        data = self._message_content()
        user_id = data['user']['id']
        group_id = data['group']['id']
        operator_id = data['operator'].get('id')
        if user_id:
            self.add(user_id, status=Message.STATUS_READ,
                     peer_type=PeerType.DEPARTMENT, peer_id=group_id)
        if operator_id and user_id != operator_id:
            self.add(operator_id, status=Message.STATUS_READ,
                     peer_type=PeerType.DEPARTMENT, peer_id=group_id)


class InvitationUserMessageCreator(UserMessageCreator):
    REGIST_KEY = (
        Message.TYPE_INVITATION_CREATED,
        Message.TYPE_INVITATION_UPDATED
    )

    def build_user_messages(self):
        self.add(self.message.dest_id, self.message.src_id,
                 PeerType.ORG_MEMBER, Message.STATUS_NULL)


class UserMessageUtils(object):
    @classmethod
    def get_user_message_meta(cls, message):
        creator_class = UserMessageCreator.registed(message.type)
        if not creator_class:
            return []

        return creator_class(message).result

    @classmethod
    def need_update_conversation(cls, message):
        creator_class = UserMessageCreator.registed(message.type)
        if not creator_class:
            return False

        return creator_class.NEED_UPDATE_CONVERSATION
