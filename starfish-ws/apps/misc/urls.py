from django.conf.urls import patterns, url
from apps.acl.models import SystemRole

from apps.misc import views

download = views.MiscViewSet.as_view({
    'get': ('download', SystemRole.GUEST)
})

wechat_notify = views.MiscViewSet.as_view({
    'post': ('wechat_notify', SystemRole.GUEST),
    'get': ('wechat_notify', SystemRole.GUEST)
})

redirect_app = views.MiscViewSet.as_view({
    'get': ('redirect_app', SystemRole.GUEST)
})

app_icon = views.AppIconView.as_view(SystemRole.GUEST)

urlpatterns = patterns(
    '',
    url(r'^v1/downloads/(?P<code>\w+)/(?P<platform>\w+)$', download, name='download'),

    url(r'^v1/wechat_notify$', wechat_notify, name='wechat-notify'),

    url(r'^v1/app_icons/(?P<app_icon>.*)$', app_icon, name='app-icon'),

    url(r'^v1/app_url/$', redirect_app, name='redirect-app'),
)
