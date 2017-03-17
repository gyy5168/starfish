from django.conf.urls import patterns, url

from apps.fs.views_v2 import FileViewSet, DownloadView, BundleDownloadView, FileRoleViewSet, \
    FileCheckViewSet

files_list = FileViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

file_detail = FileViewSet.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'delete': 'destroy',
})

file_role_list = FileRoleViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

check_file = FileCheckViewSet.as_view({
    'get': 'check_file_exists',
})

download_file = DownloadView.as_view()

files_bundle = BundleDownloadView.as_view()

urlpatterns = patterns(
    '',
    url(r'^v2/orgs/(?P<org_id>\d+)/file/files$', files_list, name='files-list'),
    url(r'^v2/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)$',
        file_detail, name='file-detail'),

    url(r'^v2/orgs/(?P<org_id>\d+)/file/files/check$', check_file, name='check-file'),

    url(r'^v2/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)/attachment$',
        download_file, name='file-download-file'),
    url(r'^v2/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)/bundle$',
        files_bundle, name='files-bundle'),

    url(r'^v2/orgs/(?P<org_id>\d+)/file/roles$', file_role_list, name='files-role-list'),


    # forward compatbility
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files$', files_list, name='files-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)$',
        file_detail, name='file-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/check$', check_file, name='check-file'),

    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)/attachment$',
        download_file, name='file-download-file'),
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)/bundle$',
        files_bundle, name='files-bundle'),

    url(r'^v1/orgs/(?P<org_id>\d+)/file/roles$', file_role_list, name='files-role-list'),

)
