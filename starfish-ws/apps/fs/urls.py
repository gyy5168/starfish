from django.conf.urls import patterns, url

from apps.fs import views

files_list = views.FileViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

file_detail = views.FileViewSet.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'delete': 'destroy',
})

multi_files_detail = views.FileViewSet.as_view({
    'delete': 'destroy',
})

dir_children = views.FileViewSet.as_view({
    'get': 'list_dir0',
})

download_file = views.DownloadView.as_view()

files_bundle = views.BundleDownloadView.as_view()

urlpatterns = patterns(
    '',
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files$', files_list, name='files-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)/attachment',
        download_file, name='file-download-file'),
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)$',
        file_detail, name='file-detail'),
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/(?P<parent>\d+)/children$',
        dir_children, name='dir-children'),
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)$',
        multi_files_detail, name='file-detail'),
    url(r'^v1/orgs/(?P<org_id>\d+)/file/files/(?P<file_id>[\d,]+)/bundle$',
        files_bundle, name='files-bundle'),
)
