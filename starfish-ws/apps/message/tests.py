import os

from apps.message.models import Message

from common.tests import TestCase
from common.const import ErrorCode, DestType


class MessageTest(TestCase):

    test_files_dir = '%s/test-files' % os.path.dirname(os.path.abspath(__file__))

    def test_create_chat_message(self):
        self.login('alice')

        data = {
            'type': Message.TYPE_TEXT_CHAT_CREATED,
            'dest_id': self.users['bob'].id,
            'dest_type': DestType.ORG_MEMBER,
            'body': {
                'chat': {'content': 'hello moto'}
            }
        }
        chat_resp = self.client.post(
            '/v1/orgs/%s/messages' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(chat_resp.data['error']['code'], ErrorCode.OK)

    def test_create_multimedia_chat_message(self):
        self.login('alice')

        test_file = '%s/exim-filter.pdf' % self.test_files_dir
        test_bfs_file = \
            self._prepare_bfs_file(self.users['alice'].id, self.orgs['ibm'].id, test_file)

        data = {
            'type': Message.TYPE_MULTIMEDIA_CHAT_CREATED,
            'dest_id': self.users['bob'].id,
            'dest_type': DestType.ORG_MEMBER,
            'body': {
                'chat': {
                    'bfs_file_id': test_bfs_file.id,
                    'name': 'hello.pdf'
                }
            },
        }
        chat_resp = self.client.post(
            '/v1/orgs/%s/messages' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(chat_resp.data['error']['code'], ErrorCode.OK)

    def test_create_multimedia_chat_message2(self):
        self.login('alice')

        test_file = '%s/exim-filter.pdf' % self.test_files_dir
        test_bfs_file = \
            self._prepare_bfs_file(self.users['alice'].id, self.orgs['ibm'].id, test_file)

        data = {
            'type': Message.TYPE_MULTIMEDIA_CHAT_CREATED,
            'dests': [{'type': DestType.ORG_MEMBER, 'id': self.users['bob'].id}],
            'body': {
                'chat': {
                    'bfs_file_id': test_bfs_file.id,
                    'name': 'hello.pdf'
                }
            }
        }
        chat_resp = self.client.post(
            '/v1/orgs/%s/messages' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(chat_resp.data['error']['code'], ErrorCode.OK)

    def test_create_multimedia_chat_message3(self):
        self.login('alice')

        test_file = '%s/hello.m4a' % self.test_files_dir
        test_bfs_file = \
            self._prepare_bfs_file(self.users['alice'].id, self.orgs['ibm'].id, test_file)

        data = {
            'type': Message.TYPE_MULTIMEDIA_CHAT_CREATED,
            'dests': [{'type': DestType.ORG_MEMBER, 'id': self.users['bob'].id}],
            'body': {
                'chat': {
                    'bfs_file_id': test_bfs_file.id,
                    'name': 'hello.m4a'
                }
            }
        }
        chat_resp = self.client.post(
            '/v1/orgs/%s/messages' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(chat_resp.data['error']['code'], ErrorCode.OK)

    def test_create_multimedia_chat_message4(self):
        self.login('alice')

        test_file = '%s/test.psd' % self.test_files_dir
        test_bfs_file = \
            self._prepare_bfs_file(self.users['alice'].id, self.orgs['ibm'].id, test_file)

        data = {
            'type': Message.TYPE_MULTIMEDIA_CHAT_CREATED,
            'dests': [{'type': DestType.ORG_MEMBER, 'id': self.users['bob'].id}],
            'body': {
                'chat': {
                    'bfs_file_id': test_bfs_file.id,
                    'name': 'hello.psd'
                }
            }
        }
        chat_resp = self.client.post(
            '/v1/orgs/%s/messages' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(chat_resp.data['error']['code'], ErrorCode.OK)

    def test_last_old_message(self):
        self.login('alice')

        response = self.client.get(
            '/v1/users/%s/messages/last_old' % (
                self.users['alice'].id
            )
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data'], 0)

        last_old_message_id = 12312312382131

        response = self.client.patch(
            '/v1/users/%s/messages/last_old' % (
                self.users['alice'].id
            ),
            data=last_old_message_id,
            format='json'
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/users/%s/messages/last_old' % (
                self.users['alice'].id
            )
        )
        self.assertEqual(response.data['data'], last_old_message_id)

    def test_patch_message_list(self):
        self.login('alice')

        data = {
            "is_read": 1,
            "messages": [
                {
                    "id": 12,
                    "src_id": 3,
                    "src_type": 1
                }
            ]
        }
        response = self.client.patch(
            '/v1/orgs/%s/messages' % (
                self.orgs['ibm'].id
            ),
            data=data,
            format='json'
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
