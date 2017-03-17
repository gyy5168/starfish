from apps.version.models import Version
from common.const import ErrorCode
from common.tests import TestCase


class SimpleTest(TestCase):

    def test_version_list(self):
        v2 = Version(
            platform=Version.PLATFORM_IOS,
            version='1.1.2',
            debug=0,
        )
        v2.save()

        v1 = Version(
            platform=Version.PLATFORM_IOS,
            version='1.1.11',
            debug=0,
        )
        v1.save()

        response = self.client.get(
            '/v1/versions/latest?platform=%s' % Version.PLATFORM_ANDROID, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_VERSION)
