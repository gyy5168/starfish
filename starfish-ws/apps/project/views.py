import os
from django.conf import settings
from django.utils.http import cookie_date
import magic
from datetime import datetime, timedelta
from rest_framework.response import Response

from django.db.models import Q

from apps.bfs.models import BfsFile
from apps.account.models import User
from apps.project.models import (
    Project, Tag, Task, Comment, TaskAttachment, TaskStat, TaskOperation, TaskStatus, TaskPriority)

from apps.acl.models import ResourceFilterManager
from apps.project.serializers import TaskOperationSerializer

from common.const import ErrorCode
from common.exceptions import APIError
from common.utils import shard_id, current_timestamp, AttachmentView, check_bfs_file_permission, \
    str_to_date, date_to_str, dt_to_timestamp, TargetObject
from common.viewset import ViewSet

import logging
log = logging.getLogger(__name__)


class ProjectViewSet(ViewSet):
    def list_by_member(self, request, org_id, user_id):
        projects = self._projects_by_user(org_id, user_id) \
            .filter(
                id__in=ResourceFilterManager.filter(
                    org_id,
                    ResourceFilterManager.RESOURCE_TYPE_PROJECT,
                    request.current_uid))

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_details_list(request, org_id, projects)
        })

    def list(self, request, org_id):
        projects = self._build_qs(request, org_id) \
            .filter(
                id__in=ResourceFilterManager.filter(
                    org_id,
                    ResourceFilterManager.RESOURCE_TYPE_PROJECT,
                    request.current_uid))

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_details_list(request, org_id, projects)
        })

    def create(self, request, org_id):
        p = Project(
            creator=request.current_uid,
            person_in_charge=request.DATA['person_in_charge'],
            name=request.DATA['name'],
            intro=request.DATA.get('intro', ''),
        )

        p._members = request.DATA.get('members', [])
        p._tags = request.DATA.get('tags', [])

        p.save(using=shard_id(org_id))

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_detail(request, org_id, p)})

    def retrieve(self, request, org_id, project_id):
        p = Project.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=project_id)

        if not p:
            return Response({'errcode': ErrorCode.NO_SUCH_PROJECT})

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_detail(request, org_id, p)})

    def partial_update(self, request, org_id, project_id):
        p = Project.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=project_id)

        if 'members' in request.DATA:
            p._members = request.DATA.get('members', [])

        for key in ('person_in_charge', 'name', 'intro', 'is_closed'):
            if key in request.DATA:
                setattr(p, key, request.DATA[key])

        p.save(using=shard_id(org_id))

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_detail(request, org_id, p)})

    def _build_qs(self, request, org_id):
        if 'participant' in request.GET:
            projects = self._projects_by_user(org_id, request.GET['participant'])
        elif 'person_in_charge' in request.GET:
            projects = Project.objects \
                .using(shard_id(org_id)) \
                .filter(person_in_charge=request.GET['person_in_charge']) \
                .order_by('-id')
        else:
            projects = Project.objects \
                .using(shard_id(org_id)) \
                .order_by('-id')

        projects = projects.filter(
            is_closed=request.GET.get('is_closed', 0))

        projects = projects.filter(
            id__in=ResourceFilterManager.filter(
                org_id,
                ResourceFilterManager.RESOURCE_TYPE_PROJECT,
                request.current_uid))

        return projects

    def _projects_by_user(self, org_id, user_id):
        q1 = Q(id__in=Project.joined_projects(org_id, user_id))
        q2 = Q(person_in_charge=user_id)

        return Project.objects \
            .using(shard_id(org_id)) \
            .filter(q1 | q2) \
            .order_by('-id')

    def _build_detail(self, request, org_id, project):
        data = self._build_details_list(request, org_id, [project])[0]
        data['status'] = [o.to_dict() for o in
                          TaskStatus.objects.using(org_id).filter(project_id=project.id)]
        data['priority'] = [o.to_dict() for o in
                            TaskPriority.objects.using(org_id).filter(project_id=project.id)]
        return data

    def _build_details_list(self, request, org_id, projects):
        members_count = int(request.GET.get('members_count', 30))

        project_ids = [i.id for i in projects]

        # tags
        _tags = Tag.objects \
            .using(shard_id(org_id)) \
            .filter(project_id__in=project_ids) \
            .order_by('-id')
        tags = {}
        for v in _tags:
            if v.project_id not in tags:
                tags[v.project_id] = []
            tags[v.project_id].append(v.to_dict())

        # members
        members = dict([(p.id, p.members()[:members_count]) for p in projects])

        # task stat
        _member_task_stats = TaskStat.objects \
            .using(shard_id(org_id)) \
            .filter(project_id__in=project_ids, timestamp=None)
        member_task_stats = dict([
            (project_id, dict([
                (i, {'completed': 0, 'uncompleted': 0}) for i in members.get(project_id, [])
            ]))
            for project_id in project_ids
        ])
        for v in _member_task_stats:
            if v.user_id not in member_task_stats[v.project_id]:
                continue

            member_task_stats[v.project_id][v.user_id].update({
                'completed': v.completed,
                'uncompleted': v.uncompleted,
            })

        # project task stat
        _project_task_stats = TaskStat.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=TaskStat.ALL_USERS) \
            .filter(project_id__in=project_ids, timestamp=None)
        project_task_stats = dict([
            (i, {'completed': 0, 'uncompleted': 0}) for i in project_ids
        ])
        for v in _project_task_stats:
            project_task_stats[v.project_id].update({
                'completed': v.completed,
                'uncompleted': v.uncompleted,
            })

        _t = TargetObject()
        data = []
        for p in projects:
            v = p.to_dict()

            v['tags'] = tags.get(p.id, [])
            v['members'] = [_t.obj_info(User, uid) for uid in members.get(p.id, [])]
            v['member_task_stats'] = member_task_stats.get(p.id)
            v['task_stats'] = project_task_stats.get(p.id)

            data.append(v)

        return data


class ProjectMemberViewSet(ViewSet):
    def create(self, request, org_id, project_id):
        project = Project.objects.using(org_id).getx(id=project_id)
        if not project:
            raise APIError(ErrorCode.NO_SUCH_PROJECT, org_id=org_id, project_id=project_id)

        project.add_members(request.DATA, request.current_user)
        return Response({'errcode': ErrorCode.OK})

    def list(self, request, org_id, project_id):
        r = Project.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=project_id) \
            .members()

        if not int(request.GET.get('detail', 0)):
            data = list(r)
        else:
            user_ids = list(self.paging(request, r, 30))
            s = {}
            s_qs = TaskStat.objects.using(org_id).filter(project_id=project_id,
                                                         user_id__in=user_ids,
                                                         timestamp=None)
            for uid, c, uc in s_qs.values_list('user_id', 'completed', 'uncompleted'):
                s[uid] = {'completed': c, 'uncompleted': uc}

            data = []
            _t = TargetObject()
            for uid in user_ids:
                info = _t.obj_info(User, uid)
                if uid in s:
                    info.update(**s[uid])
                data.append(info)

        return Response({'errcode': ErrorCode.OK, 'data': data})

    def destroy(self, request, org_id, project_id, user_id):
        project = Project.objects.using(org_id).getx(id=project_id)
        if not project:
            raise APIError(ErrorCode.NO_SUCH_PROJECT, org_id=org_id, project_id=project_id)

        if project.person_in_charge == user_id:
            raise APIError(ErrorCode.CAN_NOT_REMOVE_PERSON_IN_CHARGE,
                           project_id=project_id, user_id=user_id)

        project.remove_members([user_id], request.current_user)
        return Response({'errcode': ErrorCode.OK})


class TagViewSet(ViewSet):
    def list(self, request, org_id, project_id):
        data = Tag.objects \
            .using(shard_id(org_id)) \
            .filter(project_id=project_id) \
            .order_by('name')

        return Response({
            'errcode': ErrorCode.OK,
            'data': [i.to_dict() for i in data]
        })

    def create(self, request, org_id, project_id):
        m = Tag(
            project_id=project_id,
            name=request.DATA['name']
        )
        m.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': m.to_dict()})

    def partial_update(self, request, org_id, project_id, tag_id):
        m = Tag.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=tag_id)

        for key in ('name', ):
            if key in request.DATA:
                setattr(m, key, request.DATA[key])

        m.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': m.to_dict()})

    def destroy(self, request, org_id, project_id, tag_id):
        t = Tag.objects.using(shard_id(org_id)) \
            .get_or_none(id=tag_id)
        if t:
            t.delete()

        return Response({'errcode': ErrorCode.OK})


class TaskViewSet(ViewSet):
    def create(self, request, org_id):
        r = self._check_assignee(request, org_id)
        if r:
            return r

        project_id = int(request.DATA.get('project_id', 0))
        kwargs = {
            'creator': request.current_uid,
            'assignee': int(request.DATA.get('assignee', 0)),

            'project_id': project_id,

            'subject': request.DATA['subject'],
            'content': request.DATA.get('content', ''),

            'spent_hours': int(request.DATA.get('spent_hours', 0)),
            'expected_hours': int(request.DATA.get('expected_hours', 0)),

            'date_added': current_timestamp(),
            'date_due': int(request.DATA.get('date_due', 0)),

            'status':
                int(request.DATA.get('status', 0)) or TaskStatus.get_default(org_id, project_id),
            'priority':
                int(request.DATA.get('priority', 0)) or TaskPriority.get_default(org_id,
                                                                                 project_id),
        }

        after_task_id = int(request.DATA.get('after_task', 0))
        if after_task_id:
            kwargs['order'] = Task.new_order(org_id, after_task_id,
                                             Task.ORDER_AFTER,
                                             is_completed=0,
                                             project_id=kwargs['project_id'])

        t = Task(**kwargs)

        if 'peer_type' in request.DATA and 'peer_id' in request.DATA:
            t._peer_type = int(request.DATA['peer_type'])
            t._peer_id = int(request.DATA['peer_id'])

        t.save(using=shard_id(org_id))
        t.add_tags(*self._save_tags(request, org_id, t))

        self._save_attachments(request, org_id, t)

        response = Response({
            'errcode': ErrorCode.OK,
            'data': self._build_tasks_detail_list(org_id, [t])[0]})

        response.set_cookie(
            'task_cookie', str(t.id),
            max_age=settings.SESSION_COOKIE_AGE,
            expires=cookie_date(settings.SESSION_COOKIE_AGE + current_timestamp()),
            domain=settings.SESSION_COOKIE_DOMAIN,
            httponly=True)

        return response

    def retrieve(self, request, org_id, task_id):
        t = Task.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=task_id)
        if not t:
            return Response({'errcode': ErrorCode.NO_SUCH_TASK})

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_tasks_detail_list(org_id, [t])[0]})

    def partial_update(self, request, org_id, task_id):
        r = self._check_assignee(request, org_id)
        if r:
            return r

        t = Task.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=task_id)

        if int(request.DATA.get('is_completed', 0)):
            t.date_completed = current_timestamp()

        keys = (
            'subject', 'content', 'assignee',  # 'project_id', 'date_completed',
            'date_due',
            'is_completed', 'spent_hours', 'expected_hours')
        for key in keys:
            if key in request.DATA:
                setattr(t, key, request.DATA[key])

        if 'status' in request.DATA:
            t.status = TaskStatus.objects.using(org_id)\
                .get_or_none(id=request.DATA['status'])

        if 'priority' in request.DATA:
            t.priority = TaskPriority.objects.using(org_id)\
                .get_or_none(id=request.DATA['priority'])

        t.save(using=shard_id(org_id))

        if 'tags' in request.DATA:
            t.reset_tags(*self._save_tags(request, org_id, t))

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_tasks_detail_list(org_id, [t])[0]})

    def update_order(self, request, org_id, task_id):
        task_ids = [task_id] if isinstance(task_id, int) else [int(i) for i in task_id.split(',')]
        target_task_id = request.DATA.get('task_id', -1)

        target_task = Task.objects.using(org_id).getx(id=target_task_id)
        if not target_task:
            raise APIError(ErrorCode.NO_SUCH_TASK, target_task_id=target_task_id)
        project_id = target_task.project_id

        _tasks = Task.objects \
            .using(shard_id(org_id)) \
            .filter(id__in=task_ids, is_completed=0, project_id=project_id)

        # keep the tasks order same with request input task_ids
        _tasks = dict([(t.id, t) for t in _tasks])
        tasks = [_tasks[tid] for tid in task_ids if tid in _tasks]
        if not tasks:
            raise APIError(ErrorCode.NO_SUCH_TASK, task_ids=task_ids)

        order = request.DATA.get('order', 'before')
        if order == 'before':
            first, rest = tasks[-1], tasks[0:-1][::-1]
        else:
            first, rest = tasks[0], tasks[1:]

        if first.id == target_task_id:
            return Response({'errcode': ErrorCode.OK})

        first.order = Task.new_order(org_id, target_task_id, order,
                                     is_completed=0, project_id=project_id)
        log.info('update task order, %s %s %s', first.id, order, target_task_id)
        first.date_due = request.DATA.get('date_due', first.date_due)
        first.save(using=shard_id(org_id))

        target_task_id = first.id
        for t in rest:
            t.order = Task.new_order(org_id, target_task_id, order,
                                     is_completed=0, project_id=project_id)
            log.info('update task order, %s %s %s', t.id, order, target_task_id)
            t.date_due = request.DATA.get('date_due', t.date_due)
            t.save(using=shard_id(org_id))

            target_task_id = t.id

        return Response({'errcode': ErrorCode.OK})

    def destroy(self, request, org_id, task_id):
        t = Task.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=task_id)

        if not t:
            return Response({'errcode': ErrorCode.NO_SUCH_TASK})

        t.delete()

        return Response({'errcode': ErrorCode.OK})

    def _save_tags(self, request, org_id, task):
        names = request.DATA.getlist('tags') \
            if hasattr(request.DATA, 'getlist')\
            else request.DATA.get('tags', [])

        return Tag.create_by_names(org_id, task.project_id, *names)

    def _check_assignee(self, request, org_id):
        assignee = int(request.DATA.get('assignee', 0))
        if assignee:
            assignee = User.objects \
                .get_or_none(id=assignee)
            if not assignee:
                return Response({'errcode': ErrorCode.NO_SUCH_USER})

            if not assignee.in_org(org_id):
                return Response({'errcode': ErrorCode.ASSIGNEE_NOT_IN_ORG})

        return None

    @classmethod
    def save_attachments(cls, attachments, user_id, org_id, task_id):
        ret = []
        for a in attachments:
            bfs_file = BfsFile.get(a['bfs_file_id'], org_id)
            if not bfs_file:
                raise ValueError('invalid args, no bfs file')

            r = check_bfs_file_permission(user_id, org_id, bfs_file)
            if r:
                raise ValueError('permission denied')

            ta = TaskAttachment(
                creator=user_id,
                task_id=task_id,
                filepath=bfs_file.filepath
            )

            mimetype = str(
                magic.from_file(
                    TaskAttachment.full_path(ta.filepath), mime=True
                ), 'utf8'
            )
            ta.meta = {
                'filename': a['name'],
                'filesize': os.path.getsize(TaskAttachment.full_path(ta.filepath)),
                'mimetype': mimetype}

            ta.save(using=shard_id(org_id))

            ret.append(ta)

        return ret

    def _save_attachments(self, request, org_id, task):
        log.info('no. attachments: %s', len(request.FILES))

        TaskViewSet.save_attachments(
            request.DATA.get('attachments', []), request.current_uid, org_id, task.id)

    def list(self, request, org_id):
        page_no = int(request.GET.get('pn', 1))
        page_size = int(request.GET.get('ps', 10))

        tasks = self._build_tasks_detail_list(
            org_id,
            self._build_qs(request, org_id)[(page_no - 1) * page_size: page_no * page_size]
        )

        return Response({'errcode': ErrorCode.OK, 'data': tasks})

    @classmethod
    def _build_qs(cls, request, org_id):
        qs = Task.objects \
            .using(shard_id(org_id)) \
            .order_by(*request.GET.getlist('order_by'))

        if 'is_completed' in request.GET:
            if len(request.GET.getlist('is_completed')) == 2:
                pass
            elif int(request.GET.get('is_completed', 0)):
                qs = qs.filter(is_completed=1)
            else:
                qs = qs.filter(is_completed=0)

        for key in ('assignee', 'creator', 'project_id'):
            values = request.GET.getlist(key)
            if len(values) == 1:
                qs = qs.filter(**{key: values[0]})
            elif len(values) > 1:
                qs = qs.filter(**{'%s__in' % key: values})

        for key in ('date_added', 'date_due', 'date_completed'):
            start = int(request.GET.get('%s[start]' % key, 0))
            if start:
                qs = qs.filter(**{'%s__gte' % key: start})

            end = int(request.GET.get('%s[end]' % key, 0))
            if end:
                qs = qs.filter(**{'%s__lt' % key: end})

        tags = request.GET.getlist('tag_id')
        if tags:
            qs = qs.filter(tags__in=tags).distinct()

        key_tags = request.GET.getlist('key_tag_id')
        if key_tags:
            for t in key_tags:
                qs = qs.filter(tags=t).distinct()

        status = request.GET.get('status')
        if status:
            qs = qs.filter(status=status)

        priority = request.GET.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        return qs

    def _build_tasks_detail_list(self, org_id, tasks_list):
        ret = []
        task_id_list = []
        projects_cache = {}  # should be the same project for any tasks list, i think

        for t in tasks_list:
            if t.project_id not in projects_cache and t.project:
                projects_cache[t.project_id] = t.project.to_dict()

            task_info = t.to_dict(projects_cache.get(t.project_id))
            task_id_list.append(t.id)

            ret.append(task_info)

        qs_atts = TaskAttachment.objects \
            .using(org_id) \
            .filter(task_id__in=task_id_list) \
            .order_by('id')

        task_attachments = {}
        for a in qs_atts:
            if a.task_id not in task_attachments:
                task_attachments[a.task_id] = []
            task_attachments[a.task_id].append(a.to_dict())

        for data in ret:
            data['attachments'] = task_attachments.get(data['id'], [])

        return ret

    @staticmethod
    def calc_statistic(tasks):
        completed, spent_hours, uncompleted, expected_hours = 0, 0, 0, 0
        for t in tasks:
            if t.is_completed:
                completed += 1
                spent_hours += t.spent_hours
            else:
                uncompleted += 1
                expected_hours += t.expected_hours

        return (completed, spent_hours, uncompleted, expected_hours)


class TaskAttachmentViewSet(ViewSet):
    def create(self, request, org_id, task_id):
        ret = TaskViewSet.save_attachments(request.DATA, request.current_uid, org_id, task_id)
        return Response({'errcode': ErrorCode.OK, 'data': [r.to_dict() for r in ret]})

    def destroy(self, request, org_id, task_id, attachment_id):
        ta = TaskAttachment.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=attachment_id)
        if ta:
            ta.delete()
            return Response({'errcode': ErrorCode.OK})
        else:
            return Response({'errcode': ErrorCode.NO_SUCH_TASK_ATTACHMENT})


class TaskAttachmentDownloadView(AttachmentView):
    def get(self, request, org_id, task_id, attachment_id):
        try:
            return self._retrieve(request, org_id, task_id, attachment_id)
        except Exception as exc:
            log.exception(exc)
            return self._build_json_response(errcode=ErrorCode.UNKNOWN_ERROR)

    def _retrieve(self, request, org_id, task_id, attachment_id):
        if not request.session.is_authorized:
            return self._build_json_response(errcode=ErrorCode.YOU_NEED_SIGN_IN)

        task = Task.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=task_id)

        if not task:
            return self._build_json_response(errcode=ErrorCode.NO_SUCH_TASK)

        attachment = TaskAttachment.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=attachment_id)

        if not attachment:
            return self._build_json_response(errcode=ErrorCode.NO_SUCH_TASK_ATTACHMENT)

        if attachment.task_id != task_id:
            raise ValueError('invalid attachment')

        return self._build_attachment_response(
            request,
            attachment.meta['filename'],
            TaskAttachment.full_path(attachment.filepath))


class TaskCommentViewSet(ViewSet):
    def create(self, request, org_id, task_id):
        comment = Comment(
            target=task_id,
            creator=request.current_uid,
            content=request.DATA['content'],
            date_added=current_timestamp())
        comment.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': comment.to_dict()})

    def list(self, request, org_id, task_id):
        start = int(request.GET.get('start', 0))
        page_size = int(request.GET.get('ps', 10))

        qs = Comment.objects \
            .using(shard_id(org_id)) \
            .filter(target=task_id) \
            .order_by(request.GET.get('order_by', '-id'))

        if start:
            qs = qs.filter(id__lt=start)

        return Response({
            'errcode': ErrorCode.OK,
            'data': [i.to_dict() for i in qs[:page_size]]})

    def destroy(self, request, org_id, task_id, comment_id):
        Comment.objects \
            .using(shard_id(org_id)) \
            .filter(id=comment_id) \
            .delete()

        return Response({'errcode': ErrorCode.OK})


class TaskTagViewSet(ViewSet):
    def create(self, request, org_id, task_id):
        task = Task.objects.using(org_id).getx(id=task_id)
        tag = Tag.create_by_names(org_id, task.project_id, request.DATA['name'])[0]
        task.add_tags(tag)

        return Response({
            'errcode': ErrorCode.OK,
            'data': {'id': tag.id, 'name': tag.name}})

    def destroy(self, request, org_id, task_id, tag_id):
        task = Task.objects.using(org_id).getx(id=task_id)
        tag = Tag.objects.using(org_id).getx(id=tag_id)
        if tag:
            task.delete_tags(tag)
            return Response({'errcode': ErrorCode.OK})
        else:
            return Response({'errcode': ErrorCode.NO_SUCH_TAG})


class TaskOperationsViewSet(ViewSet):
    def list(self, request, org_id, task_id):
        qs = TaskOperation.objects \
            .using(shard_id(org_id)) \
            .filter(task_id=task_id) \
            .order_by('id')
        qs = self.paging(request, qs)
        data = TaskOperationSerializer(qs, many=True).data
        return Response({'errcode': ErrorCode.OK, 'data': data})


class ProjectStatisticRecord(ViewSet):
    def list(self, request, org_id, project_id, user_id):
        today = datetime.now().date()
        start = str_to_date(request.GET.get('start'))
        end = min(str_to_date(request.GET.get('end')) or today, today)

        if start is None or start > end:
            raise APIError(ErrorCode.DATETIME_FORMAT_ERROR, start=start, end=end)

        qs = TaskStat.objects \
            .using(shard_id(org_id)) \
            .filter(project_id=project_id, user_id=user_id)

        q1 = Q(timestamp__gte=start)
        if end < today:
            q2 = Q(timestamp__lte=end)
            qs = qs.filter(q1 & q2)
        else:
            q2 = Q(timestamp=None)
            qs = qs.filter(q1 | q2)

        results = qs.order_by('timestamp') \
            .values('timestamp', 'completed', 'uncompleted')

        data = list(results)
        # handle data at start day
        if len(data) == 0 or data[0]["timestamp"] != start:
            data.insert(0, dict(timestamp=start, completed=0, uncompleted=0))

        # fill everyday in list, return no compressed data
        stamp_map = dict((d['timestamp'] or today, d) for d in data)
        final_data = []
        for i in range((end-start).days+1):
            day = start + timedelta(days=i)
            val = stamp_map.get(day) or dict(final_data[i-1])
            val['timestamp'] = dt_to_timestamp(day)
            val['date'] = date_to_str(day)

            final_data.append(val)

        return Response({'errcode': ErrorCode.OK, 'data': final_data})


class TaskStatusViewSet(ViewSet):
    def list(self, request, org_id, project_id):
        qs = TaskStatus.objects.using(org_id).filter(project_id=project_id)

        return Response({
            'errcode': ErrorCode.OK,
            'data': [i.to_dict() for i in qs]
        })

    def create(self, request, org_id, project_id):
        m = TaskStatus(
            project_id=project_id,
            name=request.DATA['name']
        )
        m.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': m.to_dict()})

    def partial_update(self, request, org_id, project_id, obj_id):
        m = TaskStatus.objects.using(org_id).get_or_none(id=obj_id)
        if not m or m.project_id != project_id:
            return Response({'errcode': ErrorCode.NO_SUCH_TASK_STATUS})

        for key in ('name', ):
            if key in request.DATA:
                setattr(m, key, request.DATA[key])

        m.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': m.to_dict()})

    def destroy(self, request, org_id, project_id, obj_id):
        t = TaskStatus.objects.using(shard_id(org_id)) \
            .get_or_none(id=obj_id)
        if t and t.project_id == project_id:
            t.delete()

        return Response({'errcode': ErrorCode.OK})


class TaskPriorityViewSet(ViewSet):
    def list(self, request, org_id, project_id):
        qs = TaskPriority.objects.using(org_id).filter(project_id=project_id)

        return Response({
            'errcode': ErrorCode.OK,
            'data': [i.to_dict() for i in qs]
        })

    def create(self, request, org_id, project_id):
        m = TaskPriority(
            project_id=project_id,
            name=request.DATA['name'],
            color=request.DATA['color']
        )
        m.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': m.to_dict()})

    def partial_update(self, request, org_id, project_id, obj_id):
        m = TaskPriority.objects.using(org_id).get_or_none(id=obj_id)
        if not m or m.project_id != project_id:
            return Response({'errcode': ErrorCode.NO_SUCH_TASK_PRIORITY})

        for key in ('name', 'color'):
            if key in request.DATA:
                setattr(m, key, request.DATA[key])

        m.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': m.to_dict()})

    def destroy(self, request, org_id, project_id, obj_id):
        t = TaskPriority.objects.using(shard_id(org_id)) \
            .get_or_none(id=obj_id)
        if t and t.project_id == project_id:
            t.delete()

        return Response({'errcode': ErrorCode.OK})
