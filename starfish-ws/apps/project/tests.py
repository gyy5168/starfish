import os

from random import choice

from apps.project.models import (
    Project, Task, Comment, TaskAttachment)

from common.const import ErrorCode
from common.tests import TestCase
from common.utils import shard_id, current_timestamp


class ProjectTest(TestCase):

    def test_create_project(self):
        self.login('alice')

        data, response = self._create_project()

        expected = {
            'id': 1,
            'creator': self.users_info['alice'],
            'tags': [],
            'is_closed': 0,
            'task_stats': {'completed': 0, 'uncompleted': 0},
            'member_task_stats': {self.users['alice'].id: {'completed': 0, 'uncompleted': 0}},
            'priority': [{'color': 16711680, 'id': 1, 'is_system': 1, 'name': '高'},
                         {'color': 16747520, 'id': 2, 'is_system': 1, 'name': '中'},
                         {'color': 32768, 'id': 3, 'is_system': 1, 'name': '低'}],
            'status': [{'id': 1, 'is_system': 1, 'name': '待处理'},
                       {'id': 2, 'is_system': 1, 'name': '进行中'},
                       {'id': 3, 'is_system': 1, 'name': '完成'},
                       {'id': 4, 'is_system': 1, 'name': '逾期'}],

        }
        expected.update(data)
        expected.update({
            'person_in_charge': self.users_info['alice'],
            'members': [self.users_info['alice']],
        })

        self.assertIsNotNone(response.data['data']['discussion_group_id'])
        del response.data['data']['discussion_group_id']

        self.assertEqual(expected, response.data['data'])

    def test_create_project_with_members(self):
        self.login('alice')

        data = {
            'name': 'test project',
            'intro': 'test intro',
            'person_in_charge': self.users['alice'].id,
            'members': [self.users['bob'].id]}
        response = self.client.post(
            '/v1/orgs/%s/project/projects' % (self.orgs['ibm'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data']['members'],
                         [self.users_info['bob'], self.users_info['alice']])

        response = self.client.get(
            '/v1/orgs/%s/project/projects/%s/members' %
            (self.orgs['ibm'].id, response.data['data']['id']),
            data=data, format='json'
        )
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(response.data['data'], [self.users['bob'].id, self.users['alice'].id])

    def test_update_project_permission_denied(self):
        self.login('alice')

        data, response = self._create_project()

        self.login('bob')
        response = self.client.patch(
            '/v1/orgs/%s/project/projects/%s' % (self.orgs['ibm'].id, response.data['data']['id']),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_update_project_ok(self):
        self.login('alice')

        data1, response = self._create_project()
        data2 = {'name': 'hello', 'person_in_charge': self.users['bob'].id}
        response = self.client.patch(
            '/v1/orgs/%s/project/projects/%s' % (self.orgs['ibm'].id, response.data['data']['id']),
            data=data2, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        expected = {
            'id': 1,
            'creator': self.users_info['alice'],
            'tags': [],
            'is_closed': 0,
            'task_stats': {'completed': 0, 'uncompleted': 0},
            'member_task_stats': {self.users['bob'].id: {'completed': 0, 'uncompleted': 0},
                                  self.users['alice'].id: {'completed': 0, 'uncompleted': 0}},
            'priority': [{'color': 16711680, 'id': 1, 'is_system': 1, 'name': '高'},
                         {'color': 16747520, 'id': 2, 'is_system': 1, 'name': '中'},
                         {'color': 32768, 'id': 3, 'is_system': 1, 'name': '低'}],
            'status': [{'id': 1, 'is_system': 1, 'name': '待处理'},
                       {'id': 2, 'is_system': 1, 'name': '进行中'},
                       {'id': 3, 'is_system': 1, 'name': '完成'},
                       {'id': 4, 'is_system': 1, 'name': '逾期'}],
        }
        expected.update(data1)
        expected.update(data2)
        expected.update({
            'members': [self.users_info['bob'], self.users_info['alice']],
            'person_in_charge': self.users_info['bob'],
        })

        self.assertIsNotNone(response.data['data']['discussion_group_id'])
        del response.data['data']['discussion_group_id']

        self.assertEqual(response.data['data'], expected)

    def test_projects_list(self):
        self.login('alice')

        data1, _ = self._create_project()
        data2 = {'name': 'test project2', 'intro': 'test intro2', 'person_in_charge': 0}
        response = self.client.post(
            '/v1/orgs/%s/project/projects' % (self.orgs['ibm'].id),
            data=data2, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/project/projects' % (self.orgs['ibm'].id), format='json')

        expected = [
            {'id': 2,
             'creator': self.users_info['alice'],
             'tags': [],
             'is_closed': 0,
             'task_stats': {'completed': 0, 'uncompleted': 0},
             'member_task_stats': {self.users['alice'].id: {'completed': 0, 'uncompleted': 0}},
             },
            {'id': 1,
             'creator': self.users_info['alice'],
             'tags': [],
             'is_closed': 0,
             'task_stats': {'completed': 0, 'uncompleted': 0},
             'member_task_stats': {self.users['alice'].id: {'completed': 0, 'uncompleted': 0}},
             },
        ]
        expected[0].update(data2)
        expected[0].update({
             'members': [self.users_info['alice']],
             'person_in_charge': {"id": 0}
        })
        expected[1].update(data1)
        expected[1].update({
             'members': [self.users_info['alice']],
             'person_in_charge': self.users_info['alice']
        })

        self.assertIsNotNone(response.data['data'][0]['discussion_group_id'])
        del response.data['data'][0]['discussion_group_id']

        self.assertIsNotNone(response.data['data'][1]['discussion_group_id'])
        del response.data['data'][1]['discussion_group_id']

        self.assertEqual(expected, response.data['data'])

    def _create_project(self):
        self.login('alice')

        data = {
            'name': 'test project',
            'intro': 'test intro',
            'person_in_charge': self.users['alice'].id}
        response = self.client.post(
            '/v1/orgs/%s/project/projects' % (self.orgs['ibm'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        return (data, response)


class TagTest(TestCase):

    def test_create_tag(self):
        project_id = self._prepare_project()

        self.login('alice')

        data = {'name': 'test tag'}
        response = self.client.post(
            '/v1/orgs/%s/project/projects/%s/tags' % (self.orgs['ibm'].id, project_id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        expected = {'id': 1, 'project_id': project_id}
        expected.update(data)

        self.assertEqual(expected, response.data['data'])

    def test_update_tag_permission_denied(self):
        project_id = self._prepare_project()

        self.login('alice')

        data = {'name': 'test tag'}
        response = self.client.post(
            '/v1/orgs/%s/project/projects/%s/tags' % (self.orgs['ibm'].id, project_id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        self.login('bob')

        response = self.client.patch(
            '/v1/orgs/%s/project/projects/%s/tags/%s' %
            (self.orgs['ibm'].id, project_id, response.data['data']['id']),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.PERMISSION_DENIED)

    def test_update_tag_ok(self):
        project_id = self._prepare_project()

        self.login('alice')

        data = {'name': 'test tag'}
        response = self.client.post(
            '/v1/orgs/%s/project/projects/%s/tags' % (self.orgs['ibm'].id, project_id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        data = {'name': 'hello'}
        response = self.client.patch(
            '/v1/orgs/%s/project/projects/%s/tags/%s' %
            (self.orgs['ibm'].id, project_id, response.data['data']['id']),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        expected = {'id': 1, 'project_id': project_id}
        expected.update(data)

        self.assertEqual(response.data['data'], expected)

    def test_tags_list(self):
        project_id = self._prepare_project()

        self.login('alice')

        data1 = {'name': 'test tag1'}
        response = self.client.post(
            '/v1/orgs/%s/project/projects/%s/tags' % (self.orgs['ibm'].id, project_id),
            data=data1, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        data2 = {'name': 'test tag2'}
        response = self.client.post(
            '/v1/orgs/%s/project/projects/%s/tags' % (self.orgs['ibm'].id, project_id),
            data=data2, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.get(
            '/v1/orgs/%s/project/projects/%s/tags' % (self.orgs['ibm'].id, project_id),
            format='json')

        expected = [
            {'id': 1, 'project_id': project_id}, {'id': 2, 'project_id': project_id},
        ]
        expected[0].update(data1)
        expected[1].update(data2)

        self.assertEqual(expected, response.data['data'])

    def _prepare_project(self):
        self.login('alice')

        data = {'name': 'test project', 'intro': 'test intro', 'person_in_charge': 0}
        response = self.client.post(
            '/v1/orgs/%s/project/projects' % (self.orgs['ibm'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        return response.data['data']['id']


class TaskTest(TestCase):

    test_files_dir = '%s/test-files' % os.path.dirname(os.path.abspath(__file__))

    def test_create_task_no_assignee_ok(self):
        self.login('alice')

        self._prepare_project_data()

        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': 0,
            'project_id': self.project.id,
            'attachments': [{'name': 'exim-filter.pdf', 'bfs_file_id': self.test_bfs_file.id}]
        }
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        expected = {
            'id': 1,
            'creator': self.users_info['alice'],
            'created_at': current_timestamp(),
            'updated_at': current_timestamp(),
            'date_completed': 0,
            'spent_hours': 0,
            'expected_hours': 0,
            'project': self.project.to_dict(),
            'project_id': self.project.id,
            'tags': [],
            'is_completed': 0,
            'order': round((Task.OrderHandler.HIGH_LIMIT-Task.OrderHandler.LOW_LIMIT)/2),
            'priority': {'color': 16711680, 'id': 1, 'is_system': 1, 'name': '高'},
            'status': {'id': 1, 'is_system': 1, 'name': '待处理'}
        }
        expected.update(data)
        expected.update({
            'assignee': {'id': 0},
            'attachments': [
                {'mimetype': 'application/pdf',
                 'task_id': 1,
                 'creator': self.users_info[1],
                 'filename': 'exim-filter.pdf',
                 'id': 1,
                 'filesize': os.path.getsize('%s/exim-filter.pdf' % self.test_files_dir)}],
        })

        del response.data['data']['attachments'][0]['filepath']

        self.assertEqual(expected, response.data['data'])

    def test_create_task_with_assignee_no_such_user(self):
        self.login('alice')

        self._prepare_project_data()

        no_such_user = 1023213
        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': no_such_user}
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_USER)

    def test_create_task_with_assignee_not_in_org(self):
        self.login('alice')

        self._prepare_project_data()

        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': self.users['kate'].id}
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.ASSIGNEE_NOT_IN_ORG)

    def test_create_task_with_assignee_ok(self):
        self.login('alice')

        self._prepare_project_data()

        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': self.users['bob'].id,
            'spent_hours': 4,
            'expected_hours': 2}
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        expected = {
            'id': 1,
            'creator': self.users_info['alice'],
            'project_id': 0,
            'created_at': current_timestamp(),
            'updated_at': current_timestamp(),
            'date_completed': 0,
            'spent_hours': 4,
            'expected_hours': 2,
            'attachments': [],
            'project': {},
            'project_id': 0,
            'tags': [],
            'is_completed': 0,
            'order': round((Task.OrderHandler.HIGH_LIMIT-Task.OrderHandler.LOW_LIMIT)/2),
            'priority': {'color': 16711680, 'id': 7, 'is_system': 1, 'name': '高'},
            'status': {'id': 9, 'is_system': 1, 'name': '待处理'}
        }
        expected.update(data)
        expected.update({
            'assignee': self.users_info['bob'],
        })

        self.assertEqual(expected, response.data['data'])

    def test_update_task_no_such_user(self):
        self.login('alice')

        self._prepare_project_data()

        no_such_user = 121231
        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': self.users['bob'].id}
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.patch(
            '/v1/orgs/%s/project/tasks/%s' %
            (self.orgs['ibm'].id, response.data['data']['id']),
            data={'assignee': no_such_user},
            format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.NO_SUCH_USER)

    def test_update_task_assignee_not_in_org(self):
        self.login('alice')

        self._prepare_project_data()

        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': self.users['bob'].id}
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.patch(
            '/v1/orgs/%s/project/tasks/%s' %
            (self.orgs['ibm'].id, response.data['data']['id']),
            data={'assignee': self.users['kate'].id},
            format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.ASSIGNEE_NOT_IN_ORG)

    def test_add_task_attachment(self):
        self.login('alice')

        self._prepare_project_data()

        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': self.users['bob'].id,
        }
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id), data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        data = [{'name': 'exim-filter.pdf', 'bfs_file_id': self.test_bfs_file.id}]
        response1 = self.client.post(
            '/v1/orgs/%s/project/tasks/%s/attachments'
            % (self.orgs['ibm'].id, response.data['data']['id']), data=data, format='json')
        self.assertEqual(response1.data['error']['code'], ErrorCode.OK)
        self.assertIsNotNone(response1.data['data'][0]['id'])

        attachment = TaskAttachment.objects \
            .using(shard_id(self.orgs['ibm'].id)) \
            .filter(task_id=response.data['data']['id'])[0]

        self.assertEqual(attachment.meta['filename'], 'exim-filter.pdf')
        self.assertEqual(attachment.meta['filesize'], 101338)
        self.assertEqual(attachment.task_id, response.data['data']['id'])
        self.assertEqual(attachment.creator, self.users['alice'].id)

    def test_delete_task_attachment(self):
        self.login('alice')

        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': 0,
            'attachments': [{'name': 'exim-filter.pdf', 'bfs_file_id': self.test_bfs_file.id}]
            }

        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.delete(
            '/v1/orgs/%s/project/tasks/%s/attachments/%s'
            % (self.orgs['ibm'].id, response.data['data']['id'],
               response.data['data']['attachments'][0]['id']), data=data)
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

    def test_fetch_task_attachment(self):
        self.login('alice')

        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': 0,
            'attachments': [{'name': 'exim-filter.pdf', 'bfs_file_id': self.test_bfs_file.id}]
        }
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        attachment = TaskAttachment.objects \
            .using(shard_id(self.orgs['ibm'].id)) \
            .filter(task_id=response.data['data']['id'])[0]

        response = self.client.get(
            '/v1/orgs/%s/project/tasks/%s/attachments/%s/attachment?attachment=1'
            % (self.orgs['ibm'].id, response.data['data']['id'], 1))

        self.assertEqual(response.get('Content-Type'), 'application/pdf')
        self.assertEqual(
            response.get('Content-Disposition'),
            'attachment; filename="exim-filter.pdf"')
        self.assertEqual(
            int(response.get('Content-Length')), attachment.meta['filesize'])
        self.assertTrue(response['X-Accel-Redirect'].startswith('/protected'))

    def _prepare_tasks_list_data(self):

        self._prepare_project_data()

        ret = []
        for i in range(5):
            ret.append(self._gen_task(
                creator=self.users['alice'].id,
                assignee=self.users['bob'].id,
                date_completed=current_timestamp()))

            ret.append(self._gen_task(
                creator=self.users['bob'].id,
                assignee=self.users['alice'].id,
                date_completed=current_timestamp(),
                project_id=1))

        return ret

    def _prepare_project_data(self):
        if hasattr(self, 'project'):
            return

        kwargs = {
            'creator': self.users['alice'].id,
            'name': 'test project',
            'intro': 'test intro',
            'person_in_charge': self.users['alice'].id}
        self.project = Project(**kwargs)
        self.project.save(using=shard_id(self.orgs['ibm'].id))

    def _gen_task(self, creator, assignee, date_completed, project_id=0):

        self._prepare_project_data()

        task = Task(
            creator=creator,
            assignee=assignee,

            project_id=project_id,

            subject='hello',
            content='moto',

            date_added=current_timestamp(),
            date_due=current_timestamp() + 86400,
            date_completed=date_completed,

            spent_hours=0,
        )
        task.save(using=shard_id(self.orgs['ibm'].id))

        return task

    def setUp(self):
        super(TaskTest, self).setUp()
        test_file = '%s/exim-filter.pdf' % self.test_files_dir
        self.test_bfs_file = \
            self._prepare_bfs_file(self.users['alice'].id, self.orgs['ibm'].id, test_file)


class TaskCommentTest(TestCase):
    def test_create_comment_ok(self):
        self.login('alice')

        some_task_id = 1
        data = {'content': 'moto'}
        response = self.client.post(
            '/v1/orgs/%s/project/tasks/%s/comments' % (self.orgs['ibm'].id, some_task_id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        expected = {
            'content': 'moto',
            'created_at': current_timestamp(),
            'target': 1, 'creator': self.users_info[1],
            'id': response.data['data']['id']}
        self.assertEqual(response.data['data'], expected)

    def test_delete_comment_ok(self):
        self.login('alice')

        data = {
            'subject': 'hello',
            'content': 'moto',
            'date_due': current_timestamp() + 5000,
            'assignee': self.users['bob'].id}
        response = self.client.post(
            '/v1/orgs/%s/project/tasks' % (self.orgs['ibm'].id), data=data, format='json')

        task_id = response.data['data']['id']
        data = {'content': 'moto'}
        response = self.client.post(
            '/v1/orgs/%s/project/tasks/%s/comments' % (self.orgs['ibm'].id, task_id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        response = self.client.delete(
            '/v1/orgs/%s/project/tasks/%s/comments/%s' %
            (self.orgs['ibm'].id, task_id, response.data['data']['id']),
            format='json')
        response = self.client.get(
            '/v1/orgs/%s/project/tasks/%s/comments' %
            (self.orgs['ibm'].id, task_id), format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertTrue(len(response.data['data']) == 0)

    def test_comment_list_with_start_ok(self):
        task_id = 10
        comments = self._prepare_comment_list_data(task_id, cnt=10)

        self.login('alice')

        offset = 3
        start = comments[-offset].id

        response = self.client.get(
            '/v1/orgs/%s/project/tasks/%s/comments?start=%s&ps=3' %
            (self.orgs['ibm'].id, task_id, start), format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertTrue(len(response.data['data']) > 0)

    def _prepare_comment_list_data(self, task_id=10, cnt=5):
        comments = []
        for i in range(cnt):
            comment = Comment(
                target=task_id + 1000,
                creator=choice([self.users['alice'].id, self.users['bob'].id]),
                content='hello moto',
                date_added=self.now)
            comment.save(using=shard_id(self.orgs['ibm'].id))
            comments.append(comment)

            comment = Comment(
                target=task_id,
                creator=choice([self.users['alice'].id, self.users['bob'].id]),
                content='hello moto',
                date_added=self.now)
            comment.save(using=shard_id(self.orgs['ibm'].id))
            comments.append(comment)
        return comments


class ProjectMemberTest(TestCase):
    def test_member_list(self):
        self.login('alice')

        p = Project(
            creator=self.users['alice'].id,
            person_in_charge=self.users['alice'].id,
            name='test project',
            intro='',
        )
        p.save(using=shard_id(self.orgs['ibm'].id))

        # create
        data = [self.users['bob'].id]
        response = self.client.post(
            '/v1/orgs/%s/project/projects/%s/members' % (self.orgs['ibm'].id, p.id),
            data=data, format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # get
        response = self.client.get(
            '/v1/orgs/%s/project/projects/%s/members' % (self.orgs['ibm'].id, p.id), format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(
            set(response.data['data']),
            set([self.users['bob'].id, self.users['alice'].id]))

        # delete
        response = self.client.delete(
            '/v1/orgs/%s/project/projects/%s/members/%s' %
            (self.orgs['ibm'].id, p.id, self.users['bob'].id), format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)

        # get
        response = self.client.get(
            '/v1/orgs/%s/project/projects/%s/members' % (self.orgs['ibm'].id, p.id), format='json')
        self.assertEqual(response.data['error']['code'], ErrorCode.OK)
        self.assertEqual(set(response.data['data']), set([self.users['alice'].id]))
