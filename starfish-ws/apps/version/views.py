from apps.version.models import Version
from common.const import ErrorCode
from common.viewset import ViewSet
from django.conf import settings
from django.shortcuts import render
from rest_framework.response import Response


class VersionViewSet(ViewSet):
    DOWNLOADS_DIR = '/opt/mos/webapps/www/downloads'

    def search(self, request):
        # TODO remove
        if settings.IS_YXT_ENV:
            code = request.GET.get('code', Version.CODE_YXT)
        else:
            code = request.GET.get('code', Version.CODE_STARFISH)

        v = Version.objects \
            .filter(platform=request.GET['platform']) \
            .filter(code=code) \
            .filter(debug=request.GET.get('debug', 0)) \
            .order_by('-id')[:1]
        if not v:
            return Response({'errcode': ErrorCode.NO_VERSION})

        return Response({'errcode': ErrorCode.OK, 'data': v[0].to_dict()})

    def create(self, request):
        if not self.is_admin(request):
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        if request.method == 'POST':
            return self._create0(request)

        return render(request, 'version/new.html', {'platforms': Version.PLATFORMS})

    def _create0(self, request):
        if len(request.FILES) != 1:
            raise ValueError('invalid upload')

        for f in list(request.FILES.values()):
            path = '%s/%s' % (self.DOWNLOADS_DIR, f.name)
            with open(path, 'wb') as fw:
                if f.multiple_chunks:
                    for c in f.chunks():
                        fw.write(c)
                else:
                    fw.write(file.read())

        Version(
            platform=int(request.DATA['platform']),
            version=request.DATA['version'],
            code=request.DATA['code'],
            release_notes=request.DATA['release_notes'],
            debug=request.DATA['debug'],
            package_url='%s/%s' %
            (settings.DOWNLOADS_URL_PREFIX, list(request.FILES.values())[0].name)
        ).save()

        return Response({'errcode': ErrorCode.OK})

    def is_admin(self, request):
        if hasattr(settings, 'VERSION_ADMIN_PHONES') and \
                request.current_user.phone in settings.VERSION_ADMIN_PHONES:
            return True

        if hasattr(settings, 'VERSION_ADMIN_IDS') and \
                request.current_uid in settings.VERSION_ADMIN_IDS:
            return True

        return False

    def manage(self, request):
        if not self.is_admin(request):
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        versions = Version.objects.all().order_by('-id')
        for v in versions:
            v.platform_name = Version.PLATFORMS[v.platform]

        return render(
            request,
            'version/manage.html',
            {
                'versions': versions,
            }
        )

    def destroy(self, request, id_):
        if not self.is_admin(request):
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        Version.objects.filter(id=id_).delete()

        return Response({'errcode': ErrorCode.OK})

