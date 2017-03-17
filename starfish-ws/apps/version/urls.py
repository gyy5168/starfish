from django.conf.urls import patterns, url
from apps.acl.models import SystemRole

from apps.version import views

latest_versions_list = views.VersionViewSet.as_view({
    'get': ('search', SystemRole.GUEST)
})

versions_list = views.VersionViewSet.as_view({
    'post': 'create',
    'get': 'create',
})

versions_manage = views.VersionViewSet.as_view({
    'get': 'manage',
})

version_detail = views.VersionViewSet.as_view({
    'delete': 'destroy',
})

urlpatterns = patterns(
    '',
    url(r'^v1/versions/latest$', latest_versions_list, name='latest-versions-list'),
    url(r'^v1/versions/manage$', versions_manage, name='versions-manage'),
    url(r'^v1/versions/(?P<id_>\d+)$', version_detail, name='version-detail'),
    url(r'^v1/versions$', versions_list, name='versions-list'),
)
