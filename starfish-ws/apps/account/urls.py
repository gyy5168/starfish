from django.conf.urls import patterns, url

from apps.account import views
from apps.acl.models import SystemRole

users_list = views.UserViewSet.as_view({
    'post': ('create', SystemRole.GUEST),
    'get': ('search', SystemRole.GUEST)
})

user_detail = views.UserViewSet.as_view({
    'get': 'retrieve',
    'patch': ('partial_update', SystemRole.GUEST),
})

invite = views.UserViewSet.as_view({
    'get': ('invite', SystemRole.GUEST),
    'post': ('invite', SystemRole.GUEST)
})

user_orgs = views.UserViewSet.as_view({
    'get': ('user_orgs', SystemRole.USER_SELF)
})

user_services = views.UserViewSet.as_view({
    'get': ('user_services', SystemRole.USER_SELF)
})

user_device_badge = views.UserViewSet.as_view({
    'get': ('get_badge', SystemRole.USER_SELF),
    'patch': ('update_badge', SystemRole.USER_SELF),
})

user_agents = views.AgentViewSet.as_view({
    'get': 'list_by_user',
})

agent_detail = views.AgentViewSet.as_view({
    'delete': 'destroy',
})

sessions_list = views.SessionViewSet.as_view({
    'post': ('create', SystemRole.GUEST)
})

session_detail = views.SessionViewSet.as_view({
    'delete': ('destroy', SystemRole.GUEST)
})

tokens_list = views.TokenViewSet.as_view({
    'post': ('create', SystemRole.GUEST),
    'get': ('search', SystemRole.GUEST),
})

user_reset_phone = views.UserResetPhoneViewSet.as_view({
    'get': ('get_page', SystemRole.GUEST),
    'post': ('reset_phone', SystemRole.GUEST),
})

validate_code_validate = views.ValidCodeView.as_view({
    'get': ('validate', SystemRole.GUEST),
})

user_avatar = views.UserAvatarView.as_view(SystemRole.GUEST)
validate_code_avatar = views.ValidCodeAvatarView.as_view(SystemRole.GUEST)

urlpatterns = patterns(
    '',
    url(r'^v1/invite$', invite, name='invite-page'),

    url(r'^v1/users$', users_list, name='users-list'),
    url(r'^v1/users/(?P<user_id>\d+)/orgs$', user_orgs, name='user-orgs'),
    url(r'^v1/users/(?P<user_id>\d+)/services$', user_services, name='user-services'),

    url(r'^v1/users/(?P<user_id>[\d,]+)$', user_detail, name='user-detail'),

    url(r'^v1/sessions$', sessions_list, name='sessions-list'),
    url(r'^v1/sessions/(?P<session_id>.*)$', session_detail, name='session-self'),

    url(r'^v1/users/(?P<user_id>[\d,]+)/agents$', user_agents, name='user-agents'),
    url(r'^v1/users/(?P<user_id>\d+)/agents/(?P<agent_key>[0-9a-f]+)$', agent_detail,
        name='agent-detail'),

    url(r'^v1/tokens$', tokens_list, name='tokens-list'),

    url(r'^v1/user-avatars/(?P<user_id>\d+)', user_avatar, name='user-avatar'),

    url(r'^v1/users/reset_phone$', user_reset_phone, name='user-reset-phone'),

    url(r'^v1/captcha_codes$', validate_code_validate, name='validate-code-validate'),
    url(r'^v1/captcha$', validate_code_avatar, name='validate-code-avatar'),

    url(r'^v1/users/(?P<user_id>\d+)/devices/(?P<device_token>.*)/badge$',
        user_device_badge, name='user-device-badge'),
)
