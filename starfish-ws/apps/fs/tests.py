import os

from apps.fs.models import File, FileRole

from common.utils import shard_id
from common.tests import TestCase
from common.const import ErrorCode, PresetFileRole, FilePermission


class FileTest(TestCase):
    test_files_dir = '%s/test-files' % os.path.dirname(os.path.abspath(__file__))

    def setUp(self):
        super(FileTest, self).setUp()

        test_file = '%s/exim-filter.pdf' % self.test_files_dir
        self.test_bfs_file = \
            self._prepare_bfs_file(self.users['alice'].id, self.orgs['ibm'].id, test_file)

        test_file2 = '%s/房间v1.png' % self.test_files_dir
        self.test_bfs_file2 = \
            self._prepare_bfs_file(self.users['alice'].id, self.orgs['ibm'].id, test_file2)


class FileTestV2(FileTest):
    ORG_NAME = 'ibm'

    def _list_create_url(self):
        return '/v2/orgs/%s/file/files' % (self.orgs[self.ORG_NAME].id)

    def _detail_url(self, file_id):
        return '/v2/orgs/%s/file/files/%s' % (self.orgs[self.ORG_NAME].id, file_id)

    def setUp(self):
        super(FileTestV2, self).setUp()

        self.dirs, self.files = {}, {}
        for u in ['alice', 'eve', 'bob', 'frank']:
            user = self.users[u]
            d = File(
                creator=user.id,
                name='dir_%s' % user.name,
                is_file=0,
                )
            d.save(using=shard_id(self.orgs['ibm'].id))
            self.dirs[u] = d
            FileRole.set_by_preset(d,
                                   user.id, FileRole.TYPE_ORG_MEMBER,
                                   user.name, PresetFileRole.CONTROLLER)
            f = File(
                creator=user.id,
                parent=d.id,
                name='file_%s.pdf' % user.name,
                is_file=1,
                filepath=self.test_bfs_file.filepath,
                size=self.test_bfs_file.size,
                )
            f.save(using=shard_id(self.orgs['ibm'].id))
            self.files[u] = f
            FileRole.set_by_preset(f,
                                   user.id, FileRole.TYPE_ORG_MEMBER,
                                   user.name, PresetFileRole.CONTROLLER)

    def test_list_root_dir_of_self(self):
        for u in ['alice', 'eve', 'bob', 'frank']:
            self.login(u)
            response = self.client.get(
                self._list_create_url(), dict(parent=0, dir_only=1)
            )
            self.assertEqual(response.data['error']['code'], ErrorCode.OK)
            self.assertEqual(len(response.data['data']['children']), 1)

    def test_list_root_dir_as_viewer(self):
        f = self.dirs['alice']
        FileRole.set_by_preset(f,
                               self.users['bob'].id, FileRole.TYPE_ORG_MEMBER,
                               self.users['bob'].name, PresetFileRole.VIEWER)

        f = self.dirs['eve']
        FileRole.set_by_preset(f,
                               self.discussion_groups['ibm']['rd'].id,
                               FileRole.TYPE_DISCUSSION_GROUP,
                               self.discussion_groups['ibm']['rd'].name,
                               PresetFileRole.VIEWER)

        f = self.dirs['frank']
        FileRole.set_by_preset(f,
                               self.users['bob'].id, FileRole.TYPE_ORG_MEMBER,
                               self.users['bob'].name, PresetFileRole.EDITOR)

        self.login('bob')
        response = self.client.get(
            self._list_create_url(), dict(parent=0, dir_only=1)
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']['children']), 4)

    def test_create_dir0(self):
        self.login('alice')

        data = {'name': 'hello', 'parent': 0}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['name'], data['name'])
        self.assertEqual(response.data['data']['is_file'], 0)

    def test_create_dir1(self):
        self.login('alice')

        data = {'name': 'hello', 'parent': self.dirs['alice'].id}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['name'], data['name'])
        self.assertEqual(response.data['data']['is_file'], 0)
        self.assertEqual(
            FilePermission.list(
                PresetFileRole.perm_by_role(PresetFileRole.CONTROLLER)
            ),
            response.data['data']['permissions']
        )

    def test_create_dir2(self):
        self.login('alice')

        data = {'name': 'hello', 'parent': self.dirs['bob'].id}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_create_dir3(self):
        f = self.dirs['alice']
        FileRole.set_by_preset(f,
                               self.users['bob'].id, FileRole.TYPE_ORG_MEMBER,
                               self.users['bob'].name, PresetFileRole.VIEWER)

        f = self.dirs['eve']
        FileRole.set_by_preset(f,
                               self.discussion_groups['ibm']['rd'].id,
                               FileRole.TYPE_DISCUSSION_GROUP,
                               self.discussion_groups['ibm']['rd'].name,
                               PresetFileRole.EDITOR)

        f = self.dirs['frank']
        FileRole.set_by_preset(f,
                               self.users['bob'].id, FileRole.TYPE_ORG_MEMBER,
                               self.users['bob'].name, PresetFileRole.EDITOR)

        self.login('bob')

        data = {'name': 'hello', 'parent': self.dirs['alice'].id}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

        data = {'name': 'hello', 'parent': self.dirs['eve'].id}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        data = {'name': 'hello', 'parent': self.dirs['frank'].id}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_create_dir4(self):
        self.login('alice')

        data = {'name': '/hello/', 'parent': self.dirs['alice'].id}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.INVALID_FILENAME)

    def test_create_dir5(self):
        self.login('alice')

        data = {'name': 'hello', 'parent': self.files['alice'].id}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_DIR)

    def test_create_dir50(self):
        self.login('alice')

        data = {'name': self.dirs['alice'].name, 'parent': 0}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.FILE_EXISTS)

    def test_create_dir6(self):
        self.login('alice')

        data = {'name': 'hello', 'parent': 0,
                'roles': [
                    dict(owner=self.discussion_groups['ibm']['rd'].id,
                         owner_type=FileRole.TYPE_DISCUSSION_GROUP,
                         role=PresetFileRole.VIEWER,
                         name=self.discussion_groups['ibm']['rd'].name),

                    dict(owner=self.users['eve'].id,
                         owner_type=FileRole.TYPE_ORG_MEMBER,
                         role=PresetFileRole.EDITOR,
                         name=self.users['eve'].name)
                ]}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        d = File.objects\
            .using(self.orgs[self.ORG_NAME].id)\
            .get(id=response.data['data']['id'])

        self.assertEqual(d.is_permitted(self.users['eve'].id, FilePermission.CONTROL), False)
        self.assertEqual(d.is_permitted(self.users['eve'].id, FilePermission.VIEW), True)
        self.assertEqual(d.is_permitted(self.users['eve'].id, FilePermission.UPLOAD), True)

        self.assertEqual(d.is_permitted(self.users['bob'].id, FilePermission.CONTROL), False)
        self.assertEqual(d.is_permitted(self.users['bob'].id, FilePermission.VIEW), True)
        self.assertEqual(d.is_permitted(self.users['bob'].id, FilePermission.UPLOAD), False)

    def test_create_file0(self):
        self.login('alice')

        for parent in [0, self.dirs['alice'].id]:
            data = {'name': 'hello', 'parent': parent,
                    'bfs_file_id': self.test_bfs_file.id}
            response = self.client.post(
                self._list_create_url(),
                data=data, format='json')

            self.assertEqual(response.data['error']['code'], ErrorCode.OK)
            self.assertEqual(response.data['data']['name'], data['name'])
            self.assertEqual(response.data['data']['is_file'], 1)
            self.assertEqual(response.data['data']['parent'], data['parent'])

    def test_create_file1(self):
        self.login('alice')

        data = {'name': self.files['alice'].name,
                'parent': self.dirs['alice'].id,
                'bfs_file_id': self.test_bfs_file.id,
                'replace': 0}
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.FILE_EXISTS)

        data['replace'] = 1
        response = self.client.post(
            self._list_create_url(),
            data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_retrieve_file(self):
        self.login('alice')

        response = self.client.get(
            self._detail_url(self.files['alice'].id))

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data'][0]['id'], self.files['alice'].id)

        response = self.client.get(
            self._detail_url(self.files['bob'].id))

        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

        response = self.client.get(
            self._detail_url('%s,%s' % (self.files['bob'].id, self.files['alice'].id)))

        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_delete_file(self):
        self.login('alice')

        # delete by controller
        response = self.client.delete(
            self._detail_url(self.files['alice'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # delete others'
        response = self.client.delete(
            self._detail_url(self.files['bob'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

        # delete by editor
        f = self.dirs['frank']
        FileRole.set_by_preset(f,
                               self.users['alice'].id, FileRole.TYPE_ORG_MEMBER,
                               self.users['alice'].name, PresetFileRole.EDITOR)

        response = self.client.delete(
            self._detail_url(self.files['frank'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_rename_file0(self):
        self.login('alice')

        # rename ok
        data = {'name': 'hello'}
        response = self.client.patch(
            self._detail_url(self.files['alice'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['name'], data['name'])
        self.assertEqual(response.data['data']['id'], self.files['alice'].id)

    def test_rename_file1(self):
        self.login('alice')

        # invalid name
        data = {'name': 'hello/'}
        response = self.client.patch(
            self._detail_url(self.files['alice'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.INVALID_FILENAME)

    def test_rename_file2(self):
        self.login('alice')

        # file exists
        data = {'name': self.dirs['bob'].name}
        response = self.client.patch(
            self._detail_url(self.dirs['alice'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.FILE_EXISTS)

    def test_rename_file3(self):
        self.login('alice')

        # permission denied
        data = {'name': 'hello'}
        response = self.client.patch(
            self._detail_url(self.files['bob'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_move_file(self):
        self.login('alice')
        f = self.dirs['frank']

        data = {'parent': f.id}

        # no upload perm of target
        response = self.client.patch(
            self._detail_url(self.files['alice'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

        FileRole.set_by_preset(f,
                               self.users['alice'].id, FileRole.TYPE_ORG_MEMBER,
                               self.users['alice'].name, PresetFileRole.EDITOR)
        # move ok
        response = self.client.patch(
            self._detail_url(self.files['alice'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data'][0]['id'], self.files['alice'].id)

        # no move perm of file
        response = self.client.patch(
            self._detail_url(self.files['bob'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_download_file(self):
        self.login('alice')

        response = self.client.get(
            '/v2/orgs/%s/file/files/%s/attachment?attachment=1'
            % (self.orgs['ibm'].id, self.files['alice'].id))

        self.assertEqual(response.get('Content-Type'), 'application/pdf')
        self.assertEqual(
            response.get('Content-Disposition'),
            'attachment; filename="%s"' % self.files['alice'].name)
        self.assertEqual(
            int(response.get('Content-Length')), self.files['alice'].size)
        self.assertTrue(response['X-Accel-Redirect'].startswith('/protected'))

        # forbidden
        response = self.client.get(
            '/v2/orgs/%s/file/files/%s/attachment?attachment=1'
            % (self.orgs['ibm'].id, self.files['bob'].id))

        self.assertEqual(response.status_code, 403)
