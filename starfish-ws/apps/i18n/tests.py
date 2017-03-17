from common.const import ErrorCode
from common.tests import TestCase


class PropertiesTest(TestCase):
    def test_list(self):
        self.login('alice')

        response = self.client.get('/v1/i18n/properties')

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data'], ErrorCode.error_message)
