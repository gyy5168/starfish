import os
import json

from django.conf import settings
from django.http import HttpResponse

from apps.account.models import (User, ValidateToken, TokenType, ValidateCode)

from common.const import ErrorCode, Gender
from common.tests import TestCase


class UserTest(TestCase):
    test_files_dir = '%s/test-files' % os.path.dirname(os.path.abspath(__file__))

    def test_update_user_password_bad_pwd(self):
        self.login('alice')

        data = {'password': '111222', 'original_password': self.DEFAULT_PASSWORD + '...'}
        response = self.client.patch('/v1/users/%s' % self.users['alice'].id, data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.BAD_PASSWORD)

    def test_update_user_password_not_signin(self):
        data = {'password': '111222', 'original_password': self.DEFAULT_PASSWORD}
        response = self.client.patch('/v1/users/%s' % self.users['alice'].id, data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.YOU_NEED_SIGN_IN)

    def test_update_user_password_ok(self):
        self.login('alice')

        data = {'password': '111222', 'original_password': self.DEFAULT_PASSWORD}
        response = self.client.patch('/v1/users/%s' % self.users['alice'].id, data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_update_user_ok(self):
        self.login('alice')

        data = {'name': 'alice2014', 'intro': 'hello', 'gender': 2}
        response = self.client.patch('/v1/users/%s' % self.users['alice'].id, data=data)

        self.assertEqual(User.objects.get_or_none(id=self.users['alice'].id).name, data['name'])

        response = self.client.get('/v1/users/%s' % self.users['alice'].id)

        for k, v in list(data.items()):
            self.assertEqual(response.data['data'][0][k], v)

    def test_user_detail_self(self):
        self.login('bob')

        response = self.client.get(
            '/v1/users/%s' % self.users['bob'].id)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_user_detail_ok(self):
        self.login('bob')

        response = self.client.get(
            '/v1/users/%s' % self.users['alice'].id)
        expected = {
            "id": self.users['alice'].id,
            "name": 'alice',
            "gender": Gender.GENDER_FEMALE,
            "intro": "",
            "phone": self.user_phones['alice'],
            'avatar_url': '%s/%s/%s' % (
                settings.USER_AVATAR_URL_PREFIX_STARFISH, self.users['alice'].id,
                self.users['alice'].avatar),
            'location': '',
        }
        self.assertEqual(response.data['data'][0], expected)

    def test_user_detail_ok_by_invite(self):
        from apps.org.models import Invitation

        Invitation(
            who=self.users['alice'].id,
            whom=self.users['kate'].id,
            org_id=self.orgs['ibm'].id).save()

        self.login('kate')

        response = self.client.get(
            '/v1/users/%s' % self.users['alice'].id)
        expected = {
            "id": self.users['alice'].id,
            "name": 'alice',
            "gender": Gender.GENDER_FEMALE,
            "intro": "",
            "phone": self.user_phones['alice'],
            'avatar_url': '%s/%s/%s' % (
                settings.USER_AVATAR_URL_PREFIX_STARFISH, self.users['alice'].id,
                self.users['alice'].avatar),
            'location': '',
        }
        self.assertEqual(response.data['data'][0], expected)

    def test_user_search_no_such_user(self):
        self.login('alice')

        response = self.client.get(
            '/v1/users?phone=%s111111111111111111' % self.user_phones['alice'])
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_USER)

    def test_user_search_ok(self):
        self.login('alice')

        response = self.client.get(
            '/v1/users?phone=%s' % self.user_phones['alice'])
        self.assertEqual(response.data['data']['id'], self.users['alice'].id)

    def test_user_search_by_pwd_not_sigin(self):
        response = self.client.get(
            '/v1/users?password=%s' % self.DEFAULT_PASSWORD)
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_USER)

    def test_update_avatar(self):
        self.login('alice')

        avatar_before = User.objects.get_or_none(id=self.users['alice'].id).avatar

        data = {
            'abc.gif': open('%s/bdlogo.gif' % self.test_files_dir, 'rb'),
            'name': 'alice1',
        }
        response = self.client.patch('/v1/users/%s' % self.users['alice'].id, data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        avatar_after = User.objects.get_or_none(id=self.users['alice'].id).avatar
        self.assertNotEqual(avatar_before, avatar_after)

        response = self.client.get('/v1/user-avatars/%s' % self.users['alice'].id)
        self.assertTrue(response['X-Accel-Redirect'].startswith('/protected'))

    def test_update_badge(self):
        self.login('alice')

        device_token = 'some device token'
        response = self.client.patch(
            '/v1/users/%s/devices/%s/badge' % (self.users['alice'].id, device_token),
            data=5
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/users/%s/devices/%s/badge' % (self.users['alice'].id, device_token)
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        print(response.data)


class SessionTest(TestCase):

    test_files_dir = '%s/test-files' % os.path.dirname(os.path.abspath(__file__))

    def test_signup_by_phone(self):
        self.client.post(
            '/v1/tokens',
            data={'type': TokenType.VALIDATE_PHONE, 'phone': '2821'})

        data = {
            'phone': '2821',
            'token': {"value": ValidateToken.objects.filter(target='2821')[0].token},
            'gender': 1,
            'password': 'foobar12345'}
        response = self.client.post(
            '/v1/users',
            data=data,
            format='json',
            HTTP_USER_AGENT='Mozilla/5.0'
        )

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_signup_with_dup_phone(self):
        self.client.post(
            '/v1/tokens',
            data={'type': TokenType.VALIDATE_PHONE, 'phone': '2821'})

        data = {
            'phone': '2821',
            'gender': 1,
            'token': {"value": ValidateToken.objects.filter(target='2821')[0].token},
            'password': 'foobar12345'
        }
        response = self.client.post(
            '/v1/users', data=data, format='json',
            HTTP_USER_AGENT='Mozilla/5.0'
        )

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        self.client.post(
            '/v1/tokens',
            data={'type': TokenType.VALIDATE_PHONE, 'phone': '2821'})

        data = {
            'phone': '2821',
            'token': {
                "value": ValidateToken.objects.filter(target='2821').order_by('-id')[0].token
            },
            'password': 'foobar12345'
        }
        response = self.client.post(
            '/v1/users', data=data, format='json',
            HTTP_USER_AGENT='Mozilla/5.0'
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.DUPLICATE_PHONE_NUMBER)

    def test_signin(self):
        response = self.login('alice')

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['user_id'], self.users['alice'].id)
        self.assertIsNotNone(response.data['data']['session_key'])
        self.assertIsNotNone(response.cookies.get('session_id'))
        self.assertEqual(
            '%s:%s' % (response.data['data']['user_id'], response.data['data']['session_key']),
            response.cookies.get('session_id').value)

        response = self.client.get('/v1/users/%s/services' % self.users['alice'].id)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_signin_by_rem_token_ok(self):
        data = {'phone': self.user_phones['alice'], 'password': 'foobar1234567', 'remember': 1}
        response = self.client.post(
            '/v1/sessions', data=data,
            HTTP_USER_AGENT='Mozilla/5.0', format='json')

        response = self.client.post(
            '/v1/sessions',
            data={'remember_token': response.data['data']['remember_token']},
            HTTP_USER_AGENT='Mozilla/5.0',
            format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['user_id'], self.users['alice'].id)
        self.assertIsNotNone(response.cookies.get('session_id'))

        # login again
        response = self.client.post('/v1/sessions', format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['user_id'], self.users['alice'].id)
        self.assertIsNotNone(response.cookies.get('session_id'))

    def test_signin_with_auto_signin_flag(self):
        data = {
            'phone': self.user_phones['alice'],
            'password': self.DEFAULT_PASSWORD,
            'auto_signin': False
        }
        r = self.client.post(
            '/v1/sessions', data=data, format='json',
            HTTP_USER_AGENT='Mozilla/5.0')
        self.assertEqual(r.data['error']['code'], ErrorCode.OK)

    def test_signout(self):
        self.login('alice')

        response = self.client.delete(
            '/v1/sessions/self', format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_signin_by_bad_pwd(self):
        data = {'phone': '123', 'password': 'badpassword'}
        response = self.client.post(
            '/v1/sessions', data=data, format='json')

        self.assertEqual(response.data['error']['code'], ErrorCode.BAD_USERNAME_OR_PASSWORD)
        self.assertIsNone(response.cookies.get('session_id'))

    def test_signin_by_token_ok(self):
        self.client.post(
            '/v1/tokens',
            data={'type': TokenType.VALIDATE_PHONE, 'phone': self.user_phones['alice']})

        data = {
            'phone': self.user_phones['alice'],
            'token': ValidateToken.objects.filter(target=self.user_phones['alice'])[0].token,
        }
        response = self.client.post(
            '/v1/sessions',
            data=data,
            HTTP_USER_AGENT='Mozilla/5.0',
            format='json'
        )

        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_list_agents(self):
        self.login('alice')

        response = self.client.get(
            '/v1/users/%s,%s/agents' %
            (self.users['alice'].id, self.users['bob'].id),
            format='json'
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(len(response.data['data']), 2)

    def test_exception(self):
        data = {'phone': self.user_phones['frank']}
        response = self.client.post(
            '/v1/sessions', data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.UNKNOWN_ERROR)

    def test_build_summary(self):
        u = {
            'id': self.users['alice'].id,
            'position': '',
        }

        self.assertEqual(User.build_summary_list([u['id']], self.orgs['ibm'].id)[0], u)

        u = {
            'id': self.users['alice'].id,
            'position': '',
        }

        self.assertEqual(User.build_summary_list([u['id']], self.orgs['ibm'].id)[0], u)


class TokenTest(TestCase):

    def test_reset_password_invalid_token(self):
        data = {'token': {'value': 'invalid token'}, 'password': 'hello moto'}
        response = self.client.patch(
            '/v1/users/1', data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.INVALID_TOKEN)

    def test_create_reset_pwd_token(self):
        data = {
            'type': TokenType.RESET_PASSWORD_BY_PHONE,
            'phone': self.user_phones['alice']
        }
        response = self.client.post(
            '/v1/tokens', data=data
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # create again
        response = self.client.post(
            '/v1/tokens', data=data
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_create_validate_phone_token(self):
        data = {
            'type': TokenType.VALIDATE_PHONE,
            'phone': self.user_phones['alice']
        }
        response = self.client.post(
            '/v1/tokens', data=data
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # create again
        response = self.client.post(
            '/v1/tokens', data=data
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)


class CaptchaTest(TestCase):
    def test(self):
        response = self.client.get('/v1/captcha', HTTP_USER_AGENT='Mozilla/5.0')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/png')

        code = ValidateCode.objects.first().code
        response = self.client.get(
            '/v1/captcha_codes?code=%s' % code,
            HTTP_USER_AGENT='Mozilla/5.0'
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['code'], code)

        response = self.client.get('/v1/captcha_codes?code=bad', HTTP_USER_AGENT='Mozilla/5.0')
        self.assertEqual(response.data['data'], None)


class PermissionTest(TestCase):
    NEED_AUTH_REQUESTS = (
        ('get', '/v1/users/1'),
        ('get', '/v1/users/1/orgs'),
        ('post', '/v1/orgs'),
        ('post', '/v1/invitations'),
        ('patch', '/v1/invitations/1'),
    )

    NEED_IN_ORG_REQUESTS = (
        ('post', '/v1/orgs/%s/discussion_groups'),
        ('get', '/v1/orgs/%s/discussion_groups/1'),
        ('patch', '/v1/orgs/%s/discussion_groups/1'),
        ('get', '/v1/orgs/%s/members/1/discussion_groups'),

        ('get', '/v1/orgs/%s/members'),
        ('delete', '/v1/orgs/%s/members/1'),
        ('patch', '/v1/orgs/%s/members/1'),

        ('post', '/v1/orgs/%s/discussion_groups/1/members'),
        ('get', '/v1/orgs/%s/discussion_groups/1/members'),

        ('post', '/v1/orgs/%s/messages'),

        ('post', '/v1/orgs/%s/mail/mails'),
        ('get', '/v1/orgs/%s/mail/mails/1/attachments/1'),
        ('get', '/v1/orgs/%s/members/1/mail/subjects'),
        ('get', '/v1/orgs/%s/mail/subjects/1/mails'),

        ('get', '/v1/orgs/%s/members/1/conversations'),

        ('post', '/v1/orgs/%s/project/tasks'),
        ('patch', '/v1/orgs/%s/project/tasks/1'),

        ('post', '/v1/orgs/%s/project/tasks/1/comments'),
        ('get', '/v1/orgs/%s/project/tasks/1/comments'),

        ('post', '/v1/orgs/%s/project/projects'),
        ('get', '/v1/orgs/%s/project/projects'),
        ('patch', '/v1/orgs/%s/project/projects/1'),

        ('post', '/v1/orgs/%s/departments'),
        ('get', '/v1/orgs/%s/departments'),
        ('patch', '/v1/orgs/%s/departments/1'),

        ('post', '/v1/orgs/%s/departments/1/members'),
        ('get', '/v1/orgs/%s/departments/1/members'),
        ('delete', '/v1/orgs/%s/departments/1/members/1'),
    )

    def test_need_auth(self):
        for i in PermissionTest.NEED_AUTH_REQUESTS:
            method = getattr(self.client, i[0])
            response = method(i[1])

            if isinstance(response, HttpResponse):
                try:
                    data = json.loads(str(response.content, 'utf8'))
                except:
                    self.assertTrue(False, '%s %s' % i)
                    raise
            else:
                data = response.data

            self.assertEqual(
                data['error']['code'],
                ErrorCode.YOU_NEED_SIGN_IN,
                '%s %s, errcode: %s' % (i[0], i[1], data['error']['code']))

        for i in PermissionTest.NEED_IN_ORG_REQUESTS:
            method = getattr(self.client, i[0])
            response = method(i[1] % self.orgs['ms'].id)

            if isinstance(response, HttpResponse):
                try:
                    data = json.loads(str(response.content, 'utf8'))
                except:
                    self.assertTrue(False, '%s %s' % i)
                    raise
            else:
                data = response.data

            self.assertEqual(
                data['error']['code'],
                ErrorCode.YOU_NEED_SIGN_IN,
                '%s %s, errcode: %s' % (i[0], i[1], data['error']['code']))

    def test_need_in_org(self):
        self.login('bob')

        for i in PermissionTest.NEED_IN_ORG_REQUESTS:
            method = getattr(self.client, i[0])
            response = method(i[1] % self.orgs['ms'].id)

            if isinstance(response, HttpResponse):
                data = json.loads(str(response.content, 'utf8'))
            else:
                data = response.data

            self.assertEqual(
                data['error']['code'],
                ErrorCode.PERMISSION_DENIED,
                '%s %s, errcode: %s' % (i[0], i[1], data['error']['code']))
