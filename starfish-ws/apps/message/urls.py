from django.conf.urls import patterns, url
from apps.acl.models import SystemRole

from apps.message import views

conversation_list = views.ConversationViewSet.as_view({
    'get': ('list', SystemRole.ORG_MEMBER_SELF)
})

conversation_detail = views.ConversationViewSet.as_view({
    'delete': 'destroy',
    'patch': 'partial_update',
})

messages_list = views.OrgMessageViewSet.as_view({
    'post': 'create',
    'patch': 'partial_update',
})

conversation_messages_list = views.OrgMessageViewSet.as_view({
    'get': 'list',
    'delete': 'delete_conversation_messages',
})

global_message_list = views.GlobalMessageViewSet.as_view({
    'get': ('list', SystemRole.USER_SELF),
})

global_message_last_old = views.GlobalMessageViewSet.as_view({
    'get': ('last_old', SystemRole.USER_SELF),
    'patch': ('update_last_old', SystemRole.USER_SELF)
})

message_detail = views.MessageUpdateViewSet.as_view({
    'patch': ('update', SystemRole.USER_SELF)
})

urlpatterns = patterns(
    '',
    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/conversations/(?P<conversation_id>\d+)/messages$',
        conversation_messages_list, name='conversation-messages-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/conversations$',
        conversation_list, name='conversations-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/conversations/(?P<conversation_id>\d+)$',
        conversation_detail, name='conversation-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/messages$', messages_list, name='messages-list'),

    url(r'^v1/users/(?P<user_id>\d+)/messages$', global_message_list, name='global-messages-list'),
    url(r'^v1/users/(?P<user_id>\d+)/messages/last_old$',
        global_message_last_old, name='global-message-last-old'),

    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/messages/(?P<message_id>\d+)$',
        message_detail, name='message-detail'),
)
