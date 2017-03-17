from django.conf.urls import patterns, url
from apps.acl.models import SystemRole

from apps.application import views

applications_list = views.ApplicationViewSet.as_view({
    'get': ('create', SystemRole.GUEST)
})

applications_list_export = views.ExportView.as_view()

urlpatterns = patterns(
    '',
    url(r'^v1/applications$', applications_list, name='applications-list'),
    url(r'^v1/applications/export$', applications_list_export, name='applications-list-export'),
)
