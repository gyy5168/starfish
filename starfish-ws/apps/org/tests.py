import os

from django.conf import settings

from apps.org.models import (
    DiscussionGroup, Invitation, Org, OrgAvatar, Department, UserDepartment)
from common.const import ErrorCode
from common.tests import TestCase
from common.utils import current_timestamp, shard_id


class OrgTest(TestCase):
    test_files_dir = '%s/test-files' % os.path.dirname(os.path.abspath(__file__))

    def test_update_org(self):
        self.login('alice')

        data = {
            'name': 'ibm-hello',
            'intro': 'hello moto',
            'abc.gif': open('%s/bdlogo.gif' % self.test_files_dir, 'rb')
        }
        response = self.client.patch(
            '/v1/orgs/%s' % self.orgs['ibm'].id,
            data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        expected = {
            'avatar_url': '%s/%s/%s' % (
                settings.ORG_AVATAR_URL_PREFIX_STARFISH, self.orgs['ibm'].id,
                Org.objects.get_or_none(id=self.orgs['ibm'].id).avatar),
            'domain': self.orgs['ibm'].default_domain_name,
            'intro': 'hello moto',
            'id': self.orgs['ibm'].id,
            'name': 'ibm-hello',
            'creator': self.users_info['alice'],
            'api_url': settings.API_URL,
            'province': '', 'city': '', 'category': ''
        }

        self.assertTrue(response.data['data']['bfs_host'] in settings.BFS_HOSTS)
        del response.data['data']['bfs_host']

        self.assertEqual(response.data['data'], expected)

        o = Org.objects.get_or_none(id=response.data['data']['id'])
        self.assertEqual(
            OrgAvatar.load_file(o.avatar),
            open('%s/bdlogo.gif' % self.test_files_dir, 'rb').read())

        response = self.client.get('/v1/orgs/%s' % self.orgs['ibm'].id)

        self.assertTrue(response.data['data']['bfs_host'] in settings.BFS_HOSTS)
        del response.data['data']['bfs_host']

        self.assertEqual(response.data['data'], expected)

        response = self.client.get('/v1/org-avatars/%s' % self.orgs['ibm'].id)
        self.assertEqual(response.get('Content-Type'), 'image/gif')
        self.assertTrue(response['X-Accel-Redirect'].startswith('/protected'))

    def test_org_detail_ok_with_invitation(self):
        Invitation(
            who=self.users['alice'].id,
            whom=self.users['kate'].id,
            org_id=self.orgs['ibm'].id).save()

        self.login('kate')

        response = self.client.get(
            '/v1/orgs/%s' % self.orgs['ibm'].id)
        expected = {
            'avatar_url': '%s/%s/%s' % (
                settings.ORG_AVATAR_URL_PREFIX_STARFISH,
                self.orgs['ibm'].id, self.orgs['ibm'].avatar),
            'domain': 'ibm.starfish.im',
            'name': 'ibm',
            'creator': self.users_info[1],
            'intro': '',
            'id': 1,
            'api_url': settings.API_URL,
            'province': '', 'city': '', 'category': ''
        }

        self.assertTrue(response.data['data']['bfs_host'] in settings.BFS_HOSTS)
        del response.data['data']['bfs_host']

        self.assertEqual(response.data['data'], expected)

    def test_org_detail_ok(self):
        self.login('bob')

        response = self.client.get(
            '/v1/orgs/%s' % self.orgs['ibm'].id)
        expected = {
            'domain': 'ibm.starfish.im',
            'name': 'ibm',
            'creator': self.users_info[1],
            'intro': '',
            'id': 1,
            'avatar_url': '%s/%s/%s' % (
                settings.ORG_AVATAR_URL_PREFIX_STARFISH,
                self.orgs['ibm'].id, self.orgs['ibm'].avatar),
            'api_url': settings.API_URL,
            'province': '', 'city': '', 'category': ''
        }

        self.assertTrue(response.data['data']['bfs_host'] in settings.BFS_HOSTS)
        del response.data['data']['bfs_host']

        self.assertEqual(response.data['data'], expected)

    def test_user_orgs_ok(self):
        self.login('frank')

        response = self.client.get(
            '/v1/users/%s/orgs' % self.users['frank'].id)
        response.data['data'] = sorted(response.data['data'], key=lambda o: o['id'])
        expected = [
            {'domain': 'ibm.starfish.im',
             'intro': '',
             'creator': self.users_info['alice'],
             'id': 1,
             'name': 'ibm',
             'avatar_url': '%s/%s/%s' % (
                 settings.ORG_AVATAR_URL_PREFIX_STARFISH,
                 self.orgs['ibm'].id, self.orgs['ibm'].avatar),
             'api_url': settings.API_URL,
             'province': '', 'city': '', 'category': ''
             },
            {'domain': 'ms.starfish.im',
             'intro': '',
             'creator': self.users_info['jack'],
             'id': 2,
             'name': 'ms',
             'avatar_url': '%s/%s/%s' % (
                 settings.ORG_AVATAR_URL_PREFIX_STARFISH,
                 self.orgs['ms'].id, self.orgs['ibm'].avatar),
             'api_url': settings.API_URL,
             'province': '', 'city': '', 'category': ''
             }]

        self.assertTrue(response.data['data'][0]['bfs_host'] in settings.BFS_HOSTS)
        del response.data['data'][0]['bfs_host']
        del response.data['data'][1]['bfs_host']

        self.assertEqual(response.data['data'], expected)

    def test_create_org_ok(self):
        self.login('alice')

        data = {
            'name': 'ibm0', 'domain': 'bitbro.xyz', 'intro': '',
            'abc.gif': open('%s/bdlogo.gif' % self.test_files_dir, 'rb'),
        }
        response = self.client.post('/v1/orgs', data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertIsNotNone(response.data['data']['id'])

        o = Org.objects.get_or_none(id=response.data['data']['id'])
        self.assertEqual(
            OrgAvatar.load_file(o.avatar),
            open('%s/bdlogo.gif' % self.test_files_dir, 'rb').read())

        response = self.client.get(
            '/v1/orgs/%s/members' % response.data['data']['id'], format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['id'], self.users['alice'].id)

        expected = {
            'id': self.users['alice'].id,
            'position': '',
        }

        self.assertEqual(response.data['data'][0], expected)

    def test_create_org_domain_mx_error(self):
        self.login('alice')

        data = {
            'name': 'ibm0', 'domain': 'bad-domain.xyz', 'intro': '',
            'abc.gif': open('%s/bdlogo.gif' % self.test_files_dir, 'rb'),
        }
        response = self.client.post('/v1/orgs', data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.DOMAIN_MX_RECORDS_ERROR)

    def test_create_org_without_domain(self):
        self.login('alice')

        data = {'name': 'ibm0'}
        response = self.client.post('/v1/orgs', data=data)

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['domain'], '')

    def test_org_long_name_limit(self):
        self.login('alice')

        data = {
            'name': '-'.join([str(i) for i in range(64)]),
            'intro': 'hello moto',
            'abc.gif': open('%s/bdlogo.gif' % self.test_files_dir, 'rb')
        }
        response = self.client.patch(
            '/v1/orgs/%s' % self.orgs['ibm'].id,
            data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.STRING_LENGTH_EXCEED_LIMIT)


class InvitationTest(TestCase):

    test_files_dir = '%s/test-files' % os.path.dirname(os.path.abspath(__file__))

    def test_invitaion_permission_denied(self):
        self.login('bob')

        data = {'org_id': self.orgs['ibm'].id, 'user_id': self.users['kate'].id}
        response = self.client.post(
            '/v1/invitations', data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_invitaion_no_such_org(self):
        self.login('alice')

        data = {'org_id': self.orgs['ibm'].id + 1000, 'user_id': self.users['kate'].id}
        response = self.client.post(
            '/v1/invitations', data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_ORG)

    def test_invitaion_ok(self):
        self.login('alice')

        data = {'org_id': self.orgs['ibm'].id, 'user_id': self.users['kate'].id}
        response = self.client.post(
            '/v1/invitations', data=data, format='json')

        self.assertEqual(response.data['data']['who']['id'], self.users['alice'].id)
        self.assertEqual(response.data['data']['whom']['id'], self.users['kate'].id)
        self.assertEqual(response.data['data']['org']['id'], self.orgs['ibm'].id)

    def test_update_invitation_confirmed_ok(self):
        response = self._prepare_invitation_data()

        self.login('kate')

        org_list_before = self.client.get(
            '/v1/users/%s/orgs' % self.users['kate'].id)
        self.assertEqual(len(org_list_before.data['data']), 1)
        self.assertEqual(org_list_before.data['data'][0]['id'], self.orgs['ms'].id)

        data = {'status': Invitation.STATUS_CONFIRM}
        response = self.client.patch(
            '/v1/invitations/%s' % response.data['data']['id'], data=data, format='json')

        self.assertEqual(response.data['data']['status'], Invitation.STATUS_CONFIRM)

        org_list_after = self.client.get(
            '/v1/users/%s/orgs' % self.users['kate'].id)
        self.assertEqual(len(org_list_after.data['data']), 2)
        self.assertEqual(
            set([org_list_after.data['data'][0]['id'], org_list_after.data['data'][1]['id']]),
            set([self.orgs['ibm'].id, self.orgs['ms'].id]))

    def test_update_invitation_ignore_ok(self):
        response = self._prepare_invitation_data()

        self.login('kate')

        data = {'status': Invitation.STATUS_IGNORE}
        response = self.client.patch(
            '/v1/invitations/%s' % response.data['data']['id'], data=data, format='json')
        self.assertEqual(response.data['data']['status'], Invitation.STATUS_IGNORE)

    def test_update_invitation_no_such_invitation(self):
        self.login('kate')

        data = {'status': Invitation.STATUS_IGNORE}
        response = self.client.patch(
            '/v1/invitations/100', data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_INVITATION)

    def test_update_invitation_permission_denied(self):
        response = self._prepare_invitation_data()

        self.login('bob')

        data = {'status': Invitation.STATUS_IGNORE}
        response = self.client.patch(
            '/v1/invitations/%s' % response.data['data']['id'], data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_update_invitation_user_already_in_org(self):
        response1 = self._prepare_invitation_data()
        response2 = self._prepare_invitation_data()

        self.login('kate')

        data = {'status': Invitation.STATUS_CONFIRM}
        response = self.client.patch(
            '/v1/invitations/%s' % response1.data['data']['id'], data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.patch(
            '/v1/invitations/%s' % response2.data['data']['id'], data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.USER_ALREADY_IN_ORG)

    def _prepare_invitation_data(self):
        self.login('alice')

        data = {'org_id': self.orgs['ibm'].id, 'user_id': self.users['kate'].id}
        return self.client.post(
            '/v1/invitations', data=data, format='json')


class DiscussionGroupTest(TestCase):
    def test_delete_group_member_by_self(self):
        self.login('bob')

        response = self.client.delete(
            '/v1/orgs/%s/discussion_groups/%s/members/%s' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id, self.users['bob'].id))

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_delete_group_member_by_creator(self):
        self.login('alice')

        response = self.client.delete(
            '/v1/orgs/%s/discussion_groups/%s/members/%s' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id, self.users['bob'].id))

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id))

        self.assertEqual(
            len(response.data['data'][self.discussion_groups['ibm']['rd'].id]), 1)

        self.assertEqual(
            response.data['data'][self.discussion_groups['ibm']['rd'].id][0],
            self.users['alice'].id)

    def test_delete_group(self):
        self.login('alice')

        response = self.client.delete(
            '/v1/orgs/%s/discussion_groups/%s' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        g = DiscussionGroup.objects \
            .using(shard_id(self.orgs['ibm'].id)) \
            .get_or_none(id=self.discussion_groups['ibm']['rd'].id)
        self.assertEqual(g.is_disbanded, 1)

    def test_user_discussion_groups_ok(self):
        self.login('alice')

        response = self.client.get(
            '/v1/orgs/%s/members/%s/discussion_groups' %
            (self.orgs['ibm'].id, self.users['alice'].id)
        )

        expected = {
            'intro': '',
            'id': 1,
            'name': 'rd',
            'creator': self.users_info[1],
            'avatar_url': '%s/%s/%s/%s%s' %
            (settings.DISCUSSION_GROUP_AVATAR_URL_PREFIX, self.orgs['ibm'].id,
                1, self.discussion_groups['ibm']['rd'].avatar, current_timestamp()),
        }

        self.assertEqual(len(response.data['data']), 1)

        response.data['data'][0].pop('created_at', None)
        self.assertEqual(response.data['data'][0], expected)

    def test_group_detail_ok(self):
        self.login('bob')

        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id))
        expected = {
            'id': 1, 'name': 'rd',
            'intro': '',
            'creator': self.users_info[1],
            'avatar_url': '%s/%s/%s/%s%s' %
            (settings.DISCUSSION_GROUP_AVATAR_URL_PREFIX, self.orgs['ibm'].id,
                self.discussion_groups['ibm']['rd'].id,
                self.discussion_groups['ibm']['rd'].avatar,
                current_timestamp()),
        }
        response.data['data'].pop('created_at', None)
        self.assertEqual(response.data['data'], expected)

    def test_group_detail_not_in_group(self):
        self.login('bob')

        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['finance'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_create_group_ok(self):
        self.login('alice')

        data = {'name': 'rd0', 'intro': '',
                'members': [self.users['bob'].id, self.users['frank'].id]}
        response = self.client.post(
            '/v1/orgs/%s/discussion_groups' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        group_id = response.data['data']['id']
        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, group_id))

        self.assertEqual(len(response.data['data'][group_id]), 3)
        self.assertEqual(response.data['data'][group_id][0], self.users['alice'].id)

    def test_update_group_ok(self):
        self.login('alice')

        data = {'intro': 'foobar', 'name': 'hello.moto'}
        response = self.client.patch(
            '/v1/orgs/%s/discussion_groups/%s' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id), data=data)

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id))

        expected = {
            'id': 1,
            'name': 'hello.moto',
            'intro': 'foobar',
            'creator': self.users_info[1],
            'avatar_url': '%s/%s/%s/%s%s' %
            (settings.DISCUSSION_GROUP_AVATAR_URL_PREFIX, self.orgs['ibm'].id,
                self.discussion_groups['ibm']['rd'].id,
                self.discussion_groups['ibm']['rd'].avatar, current_timestamp()),
        }
        response.data['data'].pop('created_at', None)
        self.assertEqual(response.data['data'], expected)

    def test_update_group_permission_denied(self):
        self.login('bob')

        response = self.client.patch(
            '/v1/orgs/%s/discussion_groups/%s' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['finance'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)


class OrgMemberDiscussionGroupMemberTest(TestCase):
    def test_set_org_mail_permission_denied(self):
        self.login('bob')

        data = {'name': 'alice.hello'}
        response = self.client.patch(
            '/v1/orgs/%s/members/%s' % (self.orgs['ibm'].id, self.users['alice'].id), data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_org_members_delete_ok(self):
        self.login('alice')

        response = self.client.get(
            '/v1/orgs/%s/members' % self.orgs['ibm'].id)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        org_members_before = set([i['id'] for i in response.data['data']])

        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        group_members_before = set([
            i for i in response.data['data'][self.discussion_groups['ibm']['rd'].id]])

        response = self.client.delete(
            '/v1/orgs/%s/members/%s' %
            (self.orgs['ibm'].id, self.users['bob'].id),
            format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/members' % self.orgs['ibm'].id)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        org_members_after = set([i['id'] for i in response.data['data']])

        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        group_members_after = set([
            i for i in response.data['data'][self.discussion_groups['ibm']['rd'].id]])

        self.assertEqual(len(org_members_before), 4)
        self.assertEqual(len(org_members_after), 3)
        self.assertEqual(
            org_members_before - org_members_after,
            set([self.users['bob'].id]))

        self.assertEqual(len(group_members_before), 2)
        self.assertEqual(len(group_members_after), 1)
        self.assertEqual(group_members_before - group_members_after, set([self.users['bob'].id]))

    def test_group_members_add_no_such_user(self):
        self.login('alice')

        no_such_user = 30
        data = [no_such_user]
        response = self.client.post(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_USER)

    def test_group_members_add_no_such_user_in_org(self):
        self.login('alice')

        data = [6]
        response = self.client.post(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_USER_IN_ORG)

    def test_group_members_add_ok(self):
        self.login('alice')
        group_id = self.discussion_groups['ibm']['rd'].id

        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, group_id))

        group_members = set([i for i in response.data['data'][group_id]])
        self.assertEqual(set([1, 2]), group_members)

        data = [3, 4]
        self.client.post(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, self.discussion_groups['ibm']['rd'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/discussion_groups/%s/members' %
            (self.orgs['ibm'].id, group_id))
        group_members = set([
            i for i in response.data['data'][group_id]])
        self.assertEqual(set(list(range(1, 5))), group_members)


class DepartmentTest(TestCase):
    def test_create_department(self):
        self.login('alice')

        data = {'name': 'rd', 'members': [self.users['bob'].id]}
        response = self.client.post(
            '/v1/orgs/%s/departments' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        group_id = response.data['data']['id']
        response = self.client.get(
            '/v1/orgs/%s/departments/%s/members' %
            (self.orgs['ibm'].id, group_id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(
            response.data['data'][group_id][0], self.users['bob'].id)

        response = self.client.get(
            '/v1/orgs/%s/departments' % (self.orgs['ibm'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 2)  # 2 is "默认all部门" + 新建部门

    def test_update_department(self):
        self.login('alice')

        data = {'name': 'rd', 'members': [self.users['bob'].id]}
        response = self.client.post(
            '/v1/orgs/%s/departments' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        data = {'name': 'rd0'}
        response = self.client.patch(
            '/v1/orgs/%s/departments/%s' %
            (self.orgs['ibm'].id, response.data['data']['id']),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['name'], data['name'])

    def test_department_member(self):
        self.login('alice')

        data = {'name': 'rd', 'members': []}
        response = self.client.post(
            '/v1/orgs/%s/departments' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        group_id = response.data['data']['id']

        data = [self.users['bob'].id]
        response = self.client.post(
            '/v1/orgs/%s/departments/%s/members' %
            (self.orgs['ibm'].id, group_id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/departments/%s/members' %
            (self.orgs['ibm'].id, group_id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][group_id][0], self.users['bob'].id)

        response = self.client.delete(
            '/v1/orgs/%s/departments/%s/members/%s' %
            (self.orgs['ibm'].id, group_id, self.users['bob'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/departments/%s/members' %
            (self.orgs['ibm'].id, group_id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data'][group_id]), 0)

    def test_update_member_departments(self):
        self._prepare_department_data()

        self.login('alice')

        data = [2, 4]
        response = self.client.patch(
            '/v1/orgs/%s/members/%s/departments?v2' % (
                self.orgs['ibm'].id, self.users['alice'].id
            ),
            data=data, format='json'
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        q = UserDepartment.objects \
            .using(self.orgs['ibm'].id) \
            .filter(user_id=self.users['alice'].id)
        self._assert_department_equal(
            [
                (2, 1),
                (4, 1),
                (1, 0),
            ],
            q
        )

        data = [3, 6, 7]
        response = self.client.patch(
            '/v1/orgs/%s/members/%s/departments?v2' % (
                self.orgs['ibm'].id, self.users['alice'].id
            ),
            data=data, format='json'
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        q = UserDepartment.objects \
            .using(self.orgs['ibm'].id) \
            .filter(user_id=self.users['alice'].id)
        self._assert_department_equal(
            [
                (3, 1),
                (6, 1),
                (7, 1),
                (1, 0),
                (4, 0),
            ],
            q
        )

    def _assert_department_equal(self, data, qs):
        s1 = set(['%s-%s' % (group_id, direct_in) for group_id, direct_in in data])
        s2 = set(['%s-%s' % (v.group_id, v.direct_in) for v in qs])
        self.assertEqual(s1, s2)

    def _prepare_department_data(self):
        data = [
            # id, parent, name
            (1, 0, 'a'),
            (2, 1, 'a1'),
            (3, 1, 'a2'),
            (4, 0, 'b'),
            (5, 4, 'b1'),
            (6, 4, 'b2'),
            (7, 0, 'c'),
            (8, 7, 'c1'),
            (9, 7, 'c2'),
        ]
        for id, parent, name in data:
            Department(
                id=id,
                parent_id=parent,
                name=name,
                creator=self.users['alice'].id,
                avatar=''
            ).save(using=shard_id(self.orgs['ibm'].id))


class OrgAppTest(TestCase):
    def test_install_and_uninstall(self):
        self.login('alice')

        # install
        data = {'app': 1}
        response = self.client.post(
            '/v1/orgs/%s/dashboard/apps' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/dashboard/apps' % self.orgs['ibm'].id)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['app'], 1)

        # uninstall
        response = self.client.delete(
            '/v1/orgs/%s/dashboard/apps/1' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/dashboard/apps' % self.orgs['ibm'].id)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 0)

    def test_navi(self):
        self.login('alice')

        # add navi not installed
        data = {'app': 1}
        response = self.client.post(
            '/v1/orgs/%s/members/%s/navigation/apps'
            % (self.orgs['ibm'].id, self.users['alice'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.ORG_APP_NOT_INSTALL)

        # list navi
        response = self.client.get(
            '/v1/orgs/%s/members/%s/navigation/apps' %
            (self.orgs['ibm'].id, self.users['alice'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 0)

        # install
        data = {'app': 1}
        response = self.client.post(
            '/v1/orgs/%s/dashboard/apps' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # add nvai
        data = {'app': 1}
        response = self.client.post(
            '/v1/orgs/%s/members/%s/navigation/apps'
            % (self.orgs['ibm'].id, self.users['alice'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # list navi
        response = self.client.get(
            '/v1/orgs/%s/members/%s/navigation/apps' %
            (self.orgs['ibm'].id, self.users['alice'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0], 1)

    def test_uninstall_delete_navi(self):
        self.login('alice')

        # install
        data = {'app': 1}
        response = self.client.post(
            '/v1/orgs/%s/dashboard/apps' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # add navi
        data = {'app': 1}
        response = self.client.post(
            '/v1/orgs/%s/members/%s/navigation/apps'
            % (self.orgs['ibm'].id, self.users['alice'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # uninstall
        response = self.client.delete(
            '/v1/orgs/%s/dashboard/apps/1' % self.orgs['ibm'].id, data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # list navi
        response = self.client.get(
            '/v1/orgs/%s/members/%s/navigation/apps' %
            (self.orgs['ibm'].id, self.users['alice'].id))
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 0)
