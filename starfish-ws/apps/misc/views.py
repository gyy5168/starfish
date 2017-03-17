import urllib
from django.conf import settings
from django.shortcuts import render, redirect
from django.http import HttpResponse, HttpResponseNotFound

from apps.org.models import OrgApp
from apps.version.models import Version

from common.WXBizMsgCrypt import WXBizMsgCrypt
from common.viewset import ViewSet
from common.utils import AttachmentView, is_mobile_brower

import logging
log = logging.getLogger(__name__)


class MiscViewSet(ViewSet):
    PLATFORMS = {
        'android': Version.PLATFORM_ANDROID,
        'ios': Version.PLATFORM_IOS,
        'mac': Version.PLATFORM_MAC,
        'windows': Version.PLATFORM_WINDOWS,
        'linux': Version.PLATFORM_LINUX,
    }

    def download(self, request, code, platform):
        if platform not in self.PLATFORMS:
            raise ValueError('invalid platform')

        _platform = self.PLATFORMS[platform]
        if _platform == Version.PLATFORM_ANDROID:
            return self._download_android(request, code)

        return redirect(Version.download_url(_platform, code))

    def _download_android(self, request, code):
        if self._is_wechat(request):
            return render(request, 'misc/is_wechat.html')

        return redirect(Version.download_url(Version.PLATFORM_ANDROID, code))

    def redirect_app(self, request):
        app = request.GET.get('app', None)
        if not app:
            raise ValueError('invalid app')

        url = 'https://{domain}{path}'.format(
            domain=OrgApp.app_domain(self._platform(request), int(app)),
            path=urllib.parse.unquote(request.GET.get('app_params'))
        )
        return redirect(url)

    def _platform(self, request):
        if is_mobile_brower(request.META['HTTP_USER_AGENT']):
            return 'mobile'

        return 'desktop'

    def wechat_notify(self, request):
        if request.method == 'GET':
            return self._wechat_notify0(request)

        return self._wechat_notify1(request)

    def _wechat_notify0(self, request):
        wxcpt = WXBizMsgCrypt(
            settings.WECHAT_CROP_TOKEN,
            settings.WECHAT_CROP_ENCODING_AES_KEY,
            settings.WECHAT_CROP_CORP_ID)

        ret, echostr = wxcpt.VerifyURL(
            request.GET['msg_signature'],
            request.GET['timestamp'],
            request.GET['nonce'],
            request.GET['echostr']
        )
        if ret:
            return HttpResponse('error!', content_type='text/plain')

        return HttpResponse(echostr, content_type='text/plain')

    def _wechat_notify1(self, request):
        wxcpt = WXBizMsgCrypt(
            settings.WECHAT_CROP_TOKEN,
            settings.WECHAT_CROP_ENCODING_AES_KEY,
            settings.WECHAT_CROP_CORP_ID)

        ret, msg = wxcpt.DecryptMsg(
            request.stream.body,
            request.GET['msg_signature'],
            request.GET['timestamp'],
            request.GET['nonce'])

        log.info('wechat_notify: %s, %s', ret, msg)

        return HttpResponse('error!', content_type='text/plain')

    def _is_wechat(self, request):
        return request.META['HTTP_USER_AGENT'].lower().find('micromessenger') != -1


class AppIconView(AttachmentView):
    APP_ICONS = (
        'task_app_icon.png',
        'file_app_icon.png',
    )

    def get(self, request, app_icon):
        if app_icon not in self.APP_ICONS:
            return HttpResponseNotFound('not found.')

        return self._build_attachment_response(
            request, '', '%s/%s' % (settings.FS_ROOT, app_icon))
