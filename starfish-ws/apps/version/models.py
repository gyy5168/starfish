import httpagentparser
from common import models as _models
from django.db import models


class Version(_models.BaseModel):
    IOS_APPSTORE_URL = 'https://itunes.apple.com/us/app/starfish/id936299423?l=zh&ls=1&mt=8'

    (CODE_STARFISH,
     CODE_YXT) = ('starfish', 'yxt')

    (PLATFORM_WINDOWS,
     PLATFORM_LINUX,
     PLATFORM_MAC,
     PLATFORM_ANDROID,
     PLATFORM_IOS,
     PLATFORM_UNKNOW) = list(range(6))

    PLATFORMS = {
        PLATFORM_WINDOWS: 'windows',
        PLATFORM_LINUX: 'linux',
        PLATFORM_MAC: 'mac',
        PLATFORM_ANDROID: 'android',
        PLATFORM_IOS: 'ios',
        PLATFORM_UNKNOW: 'unknow',
    }

    platform = models.PositiveSmallIntegerField()
    debug = models.PositiveSmallIntegerField()
    version = models.CharField(max_length=32)
    release_notes = models.CharField(max_length=4096, default='')
    package_url = models.CharField(max_length=512, default='')
    code = models.CharField(max_length=32, default='')  # reserved column, for future use. 15-9-18

    @classmethod
    def download_url(cls, platform, code):
        if platform == cls.PLATFORM_IOS:
            return cls._download_url0(platform)

        return cls._download_url1(platform, code)

    @classmethod
    def _download_url0(cls, platform):
        return cls.IOS_APPSTORE_URL

    @classmethod
    def _download_url1(cls, platform, code):
        r = Version.objects \
            .filter(platform=platform, code=code, debug=0) \
            .order_by('-id')
        if not r:
            from django.conf import settings
            return settings.NOT_FOUND_PAGE

        return r[0].package_url

    @classmethod
    def http_agent_to_platform(cls, agent):
        r = httpagentparser.detect(agent)
        if not r['platform']['name']:
            r['platform']['name'] = ''

        if r['platform']['name'].lower() == 'mac os':
            return cls.PLATFORM_MAC

        if r['platform']['name'].lower() == 'linux':
            return cls.PLATFORM_LINUX

        if r['platform']['name'].lower() == 'windows':
            return cls.PLATFORM_WINDOWS

        if r['platform']['name'].lower() == 'ios':
            return cls.PLATFORM_IOS

        if r['platform']['name'].lower() == 'android':
            return cls.PLATFORM_ANDROID

        return cls.PLATFORM_UNKNOW

    class Meta:
        db_table = 'core_version'
        index_together = [['platform', 'version']]

