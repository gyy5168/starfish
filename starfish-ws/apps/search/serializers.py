from rest_framework import serializers
from apps.account.models import User
from apps.message.models import Message, UserConversation
from apps.org.models import DiscussionGroup, UserDiscussionGroup, Department
from apps.search import index_key
from common.serializers import BaseModelSerializer
from common.const import DestType, PeerType

import logging
log = logging.getLogger(__name__)


class BaseIndexSerializer(BaseModelSerializer):
    def __init__(self, *args, **kwargs):
        self.index_org_id = kwargs.pop('index_org_id', None)
        super(BaseIndexSerializer, self).__init__(*args, **kwargs)


class MessageIndexSerializer(BaseIndexSerializer):
    content = serializers.SerializerMethodField('get_content')
    users = serializers.SerializerMethodField('get_users')

    PEER_TYPE = {
        DestType.ORG_MEMBER: PeerType.ORG_MEMBER,
        DestType.DEPARTMENT: PeerType.DEPARTMENT,
        DestType.DISCUSSION_GROUP: PeerType.DISCUSSION_GROUP,
    }

    class Meta:
        model = Message
        fields = ('id', 'content', 'type', 'users', 'create_time', 'create_timestamp',
                  'src_type', 'src_id')

    def get_content(self, obj):
        if obj.type == Message.TYPE_TEXT_CHAT_CREATED:
            return obj._extra['body']['chat']['content']  # TextChat.content

        if obj.type == Message.TYPE_MULTIMEDIA_CHAT_CREATED:
            return obj._extra['body']['chat']['name']  # MultimediaChat.meta.name

        if obj.type == Message.TYPE_APP_CONTENT_UPDATED:
            return obj._extra['body']['content']['subject']

    def get_users(self, obj):
        org_id, peer_type, peer_id = obj.org_id, self.PEER_TYPE[obj.dest_type], obj.dest_id
        conversations = UserConversation.find(org_id, peer_type, peer_id)

        results = {}
        for k, v in conversations.items():
            user_id, conversation_id = k
            results[index_key(user_id)] = {
                "conversation_id": conversation_id,
                "peer_type": peer_type,
                "peer_id": peer_id
            }

        if not results:
            log.warning('No users for Message: %s', obj.id)

        return results


class OrgMemberIndexSerializer(BaseIndexSerializer):

    class Meta:
        model = User
        fields = ('id', 'name')


class DiscussionGroupIndexSerializer(BaseIndexSerializer):
    users = serializers.SerializerMethodField('get_users')

    class Meta:
        model = DiscussionGroup
        fields = ('id', 'name', 'users')

    def get_users(self, obj):
        user_ids = [index_key(i) for i in UserDiscussionGroup.user_ids(obj.org_id, obj.id)]
        if not user_ids:
            log.warning(
                'No users for DiscussionGroup: %s, db: %s', obj.id, obj._state.db)
        return user_ids


class DepartmentIndexSerializer(BaseIndexSerializer):
    class Meta:
        model = Department
        fields = ('id', 'name')
