from django.conf import settings
from django.conf.urls import patterns, url
from apps.acl.models import SystemRole
from yxt import views

yxt_sessions_list = views.YxtSessionViewSet.as_view({
    'post': ('create', SystemRole.GUEST)
})

yxt_pub_key = views.YxtSessionViewSet.as_view({
    'get': ('pub_key', SystemRole.GUEST)
})

yxt_orgs = views.YxtImportViewSet.as_view({
    'post': ('create_update_org', SystemRole.GUEST),
    'patch': ('create_update_org', SystemRole.GUEST),
    'delete': ('delete_org', SystemRole.GUEST)
})

yxt_departments = views.YxtImportViewSet.as_view({
    'post': ('create_update_department', SystemRole.GUEST),
    'patch': ('create_update_department', SystemRole.GUEST),
    'delete': ('delete_department', SystemRole.GUEST)
})

yxt_users = views.YxtImportViewSet.as_view({
    'post': ('create_update_user', SystemRole.GUEST),
    'patch': ('create_update_user', SystemRole.GUEST)
})

yxt_user_department = views.YxtImportViewSet.as_view({
    'delete': ('delete_user_department', SystemRole.GUEST)
})

if settings.IS_YXT_ENV:
    urlpatterns = patterns(
        '',
        url(r'^yxt/sessions$', yxt_sessions_list, name='sessions-list'),
        url(r'^yxt/pub$', yxt_pub_key, name='yxt-pub-key'),

        url(r'^yxt/orgs$', yxt_orgs, name='yxt-orgs'),
        url(r'^yxt/departments$', yxt_departments, name='yxt-departments'),
        url(r'^yxt/users$', yxt_users, name='yxt-users'),
        url(r'^yxt/user-department$', yxt_user_department, name='yxt-user-department'),
    )
else:
    urlpatterns = patterns('',)
