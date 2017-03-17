from django.conf.urls import patterns, url

from apps.acl import views
from apps.acl.models import SystemRole

admins_list = views.ACLUserRoleViewSet.as_view({
    'post': ('create', SystemRole.ORG_ADMIN),
    'get': 'list',
})

admin_detail = views.ACLUserRoleViewSet.as_view({
    'get': 'retrieve',
    'delete': ('destroy', SystemRole.ORG_ADMIN)
})

urlpatterns = patterns(
    '',
    url(r'^v1/orgs/(?P<org_id>\d+)/administrators$', admins_list, name='admins-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/administrators/(?P<user_id>\d+)$',
        admin_detail, name='admin-detail'),
)
