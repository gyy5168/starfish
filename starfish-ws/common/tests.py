import os
import random
import uuid
from django.db import connections
from django.test import client

from rest_framework.test import APITestCase

from apps.message.models import Message

from apps.account.models import (
    User, UserToken, UserDevice, ValidateToken)

from apps.org.models import (
    Org, UserOrg, DiscussionGroup, UserDiscussionGroup, WorkMail,
    Invitation, Department, UserDepartment)

from apps.project.models import (
    Task, Comment, TaskAttachment, Project, Tag)

from apps.fs.models import File, FileRole, FileUserPermission

from apps.bfs.models import BfsFile

from apps.version.models import Version

from apps.acl.models import Role, UserRole
from apps.acl.default_rules import (
    default_global_roles, default_org_roles)
from common.cache import GlobalCacheSettings

from common.const import ErrorCode, Gender
from common.utils import shard_id, current_timestamp


class TestCase(APITestCase):
    DEFAULT_PASSWORD = 'foobar1234567'
    TEST_INVITATION_CODE = '1'

    tmp_files_dir = '%s/tmp-files' % os.path.dirname(os.path.abspath(__file__))

    def get_tmp_file(self):
        if not os.path.exists(self.tmp_files_dir):
            os.mkdir(self.tmp_files_dir)

        f = '%s/tmp_%s.tmp' % (self.tmp_files_dir, random.randrange(10**6))
        self.tmp_files.append(f)
        return f

    def rand_string(self):
        return str(uuid.uuid4())

    def login(self, name):
        data = {'phone': self.user_phones[name], 'password': self.DEFAULT_PASSWORD}
        r = self.client.post(
            '/v1/sessions', data=data, format='json',
            HTTP_USER_AGENT='Mozilla/5.0')
        self.assertEqual(r.data['error']['code'], ErrorCode.OK)
        return r

    def upload(self, user, filename, file):
        c = client.Client()

        data = {'phone': self.user_phones[user], 'password': self.DEFAULT_PASSWORD}
        c.post('/v1/sessions', data=data, format='json')

        r = c.post(
            '/v1/orgs/%s/file/files' % self.orgs['ibm'].id,
            data={filename: file}).data['data'][0]
        self.assertEqual(r.data['error']['code'], ErrorCode.OK)
        return r

    def setUp(self):
        GlobalCacheSettings.prefix = random.randrange(10**9)

        self.maxDiff = None

        self.now = current_timestamp()
        self.tmp_files = []

        self._prepare_user_data()
        self._prepare_fs_data()
        self._prepare_acl_data()

    def _prepare_user_data(self):
        phones = (
            ('alice', '123', Gender.GENDER_FEMALE),
            ('bob', '124', Gender.GENDER_MALE),
            ('eve', '125', Gender.GENDER_FEMALE),
            ('frank', '128', Gender.GENDER_MALE),
            ('kate', '126', Gender.GENDER_FEMALE),
            ('jack', '127', Gender.GENDER_MALE))
        self.user_phones = {}
        self.users = {}
        self.users_info = {}
        for name, phone, gender in phones:
            self.user_phones[name] = phone
            u = User(
                phone=phone,
                password=User.encrypt_password(self.DEFAULT_PASSWORD),
                name=name,
                gender=gender,
                intro='')
            u.save()
            self.users[name] = u
            self.users_info[name] = {
                'avatar_url': u.avatar_url,
                'name': u.name,
                'id': u.id,
            }
            self.users_info[u.id] = self.users_info[name]

        self.orgs = {}
        for org_id, org_name, creator in \
                [(1, 'ibm', 'alice'), (2, 'ms', 'jack')]:
            self.orgs[org_name] = Org(
                id=org_id,
                name=org_name,
                creator=self.users[creator].id
            )
            self.orgs[org_name].save()
            org_domain = self.orgs[org_name].default_domain
            org_domain.name = '%s.starfish.im' % org_name
            org_domain.save()

        discussion_groups_data = {
            'ibm': [(1, 'rd', 'alice'), (2, 'finance', 'eve')],
            'ms': [(1, 'rd', 'jack'), (2, 'finance', 'eve')]}

        self.discussion_groups = {}
        for org_name, discussion_groups in list(discussion_groups_data.items()):
            self.discussion_groups[org_name] = {}
            for group_id, group_name, creator in discussion_groups:
                self.discussion_groups[org_name][group_name] = DiscussionGroup(
                    id=group_id,
                    creator=self.users[creator].id,
                    name=group_name)
                self.discussion_groups[org_name][group_name] \
                    .save(using=shard_id(self.orgs[org_name].id))

        for name in ('bob', 'eve', 'frank'):
            UserOrg(user_id=self.users[name].id, org_id=self.orgs['ibm'].id).save()
            WorkMail.set_address(self.orgs['ibm'].id,
                                 self.users[name].id, WorkMail.TYPE_ORG_MEMBER, name)

        for name in ('eve', 'frank', 'kate'):
            UserOrg(user_id=self.users[name].id, org_id=self.orgs['ms'].id).save()
            WorkMail.set_address(self.orgs['ms'].id,
                                 self.users[name].id, WorkMail.TYPE_ORG_MEMBER, name)

        v = UserDiscussionGroup(
            user_id=self.users['bob'].id,
            group_id=self.discussion_groups['ibm']['rd'].id)
        v.save(using=shard_id(self.orgs['ibm'].id))

        v = UserDiscussionGroup(
            user_id=self.users['frank'].id,
            group_id=self.discussion_groups['ibm']['finance'].id)
        v.save(using=shard_id(self.orgs['ibm'].id))

        v = UserDiscussionGroup(
            user_id=self.users['kate'].id,
            group_id=self.discussion_groups['ms']['rd'].id)
        v.save(using=shard_id(self.orgs['ms'].id))

    def _prepare_fs_data(self):
        File(
            creator=0,
            name=File.EMAIL_ATTACHMENT_DIRNAME,
            parent=0,
            is_file=0,
            size=0,
            filepath='',
            is_system=1,
        ).save(using=shard_id(self.orgs['ibm'].id))

        File(
            creator=0,
            name=File.TASK_ATTACHMENT_DIRNAME,
            parent=0,
            is_file=0,
            size=0,
            filepath='',
            is_system=1,
        ).save(using=shard_id(self.orgs['ibm'].id))

    def _prepare_acl_data(self):
        for r in default_global_roles:
            Role(**r).save()

        for r in default_org_roles:
            Role(**r).save(using=shard_id(self.orgs['ibm'].id))
            Role(**r).save(using=shard_id(self.orgs['ms'].id))
            Role(**r).save(using=shard_id(3))

        UserRole.add(self.users['alice'].id, self.orgs['ibm'].id,
                     Role.ADMIN_ROLE_NAME, current_timestamp() + 10000)

    def _prepare_bfs_file(self, creator, org_id, test_file):
        content = None
        with open(test_file, 'rb') as f:
            content = f.read()

        r = BfsFile(
            check_sum_type=0,
            check_sum_value='',
            size=os.path.getsize(test_file),
            filepath=File.save_file2(content, org_id),
            is_missing_chunks=0
        )
        r.save(using=shard_id(org_id))

        BfsFile.add_created_log(r.id, creator, org_id)

        return r

    def tearDown(self):
        self._truncate_all_tables()
        for f in self.tmp_files:
            os.remove(f)

    def _truncate_all_tables(self):
        org_models = (
            DiscussionGroup, UserDiscussionGroup, WorkMail,
            Task, TaskAttachment, Comment, Project, Tag,
            Message,
            File, FileRole, FileUserPermission, FileUserPermission.roles.through,
            Department, UserDepartment)
        for alias in connections:
            if alias == 'default':
                continue

            for m in org_models:
                self._truncate_table(connections[alias], m)

        global_models = (
            User, UserToken, Org, UserOrg, Invitation, UserDevice,
            ValidateToken, Message, Version)
        for m in global_models:
            self._truncate_table(connections['default'], m)

    def _truncate_table(self, connection, model):
        if connection.vendor == 'sqlite':
            cursor = connection.cursor()
            cursor.execute('DELETE FROM `%s`' % model._meta.db_table)
