from django.db import models
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.dispatch import Signal

from jsonfield import JSONCharField
from apps.account.models import User

from apps.org.models import UserDiscussionGroup, DiscussionGroup
from apps.search import send_index_cmd

from common import models as _models
from common.const import DefaultStrings, ErrorCode
from common.exceptions import APIError
from common.models import OrderMixin
from common.utils import shard_id, current_timestamp, setattr_if_changed


task_tag_added = Signal(providing_args=["instance", "using", "tags"])
task_tag_deleted = Signal(providing_args=["instance", "using", "tags"])


class Project(_models.BaseOrgModel):
    serialize_object_fields = (('person_in_charge', 'User'), )

    creator = _models.PositiveBigIntegerField()
    person_in_charge = _models.PositiveBigIntegerField(db_index=True)
    name = models.CharField(max_length=128)
    intro = models.TextField(max_length=4096)
    discussion_group_id = _models.PositiveBigIntegerField(default=0)
    is_closed = models.SmallIntegerField(default=0)

    def default_discussion_group_name(self):
        return '%s:%s' % (DefaultStrings.DISCUSSION_GROUP_NAME_PREFIX, self.name)

    @property
    def discussion_group(self):
        group = DiscussionGroup.objects.using(self.org_id).getx(id=self.discussion_group_id)
        if not group:
            raise APIError(ErrorCode.NO_SUCH_DISCUSSION_GROUP,
                           project_id=self.id, group_id=self.discussion_group_id)
        return group

    def members(self, order_by='-id'):
        r = UserDiscussionGroup.objects \
            .using(self._state.db) \
            .filter(group_id=self.discussion_group_id, is_left=0) \
            .values_list('user_id', flat=True)\
            .order_by(order_by)
        return r

    @classmethod
    def joined_projects(cls, org_id, user_id):
        all_projects = Project.objects \
            .using(shard_id(org_id)) \
            .all()
        all_groups = [i.discussion_group_id for i in all_projects]
        joined_groups = set(
            UserDiscussionGroup.objects
            .using(shard_id(org_id))
            .filter(group_id__in=all_groups, user_id=user_id)
            .filter(is_left=0)
            .values_list('group_id', flat=True))

        return [p.id for p in all_projects if p.discussion_group_id in joined_groups]

    def add_members(self, user_ids, operator):
        self.discussion_group.add_users(operator, user_ids)
        for uid in user_ids:
            send_index_cmd(User, uid, self.org_id, True)

    def remove_members(self, user_ids, operator):
        self.discussion_group.remove_users(operator, user_ids)
        for uid in user_ids:
            send_index_cmd(User, uid, self.org_id, True)

    def replace_members(self, user_ids, operator):
        origin_user_ids = set(
            UserDiscussionGroup.objects
            .using(self.org_id)
            .filter(group_id=self.discussion_group_id, is_left=0)
            .values_list('user_id', flat=True))
        user_ids = set(user_ids)

        self.add_members(list(user_ids - origin_user_ids), operator)
        self.remove_members(list(origin_user_ids - user_ids), operator)

    class Meta:
        db_table = 'project'


class ProjectMixin(object):
    @property
    def project(self):
        return Project.objects \
            .using(self._state.db) \
            .getx(id=self.project_id)


class Tag(_models.BaseOrgModel, ProjectMixin):
    FAKE_DELETE_FIELDS = ('name',)

    project_id = _models.PositiveBigIntegerField()
    name = models.CharField(max_length=128)

    @classmethod
    def create_by_names(cls, org_id, project_id, *names):
        ret = []
        qs = Tag.objects.using(org_id)
        for name in names:
            t = qs.getx(project_id=project_id, name=name)
            if not t:
                t = qs.create(project_id=project_id, name=name)
            ret.append(t)
        return ret

    class Meta:
        db_table = 'project_tag'
        unique_together = ('project_id', 'name')


class TaskTag(_models.SimpleBaseOrgModel):
    task = models.ForeignKey('Task', db_constraint=False)
    tag = models.ForeignKey('Tag', db_constraint=False, related_name='tag_related_tasks')

    class Meta:
        db_table = 'project_task_tag'


class TaskStatus(_models.BaseOrgModel, ProjectMixin):
    project_id = _models.PositiveBigIntegerField()
    name = models.CharField(max_length=128)
    is_system = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(db_index=True, default=0)

    @classmethod
    def new_default(cls, org_id, project_id):
        for i, name in enumerate(['待处理', '进行中', '完成', '逾期']):
            cls.objects.using(org_id).get_or_create(project_id=project_id,
                                                    name=name,
                                                    is_system=1,
                                                    defaults=dict(order=0x7ffffff0 + i)
                                                    )

    @classmethod
    def get_default(cls, org_id, project_id):
        qs = cls.objects.using(org_id).filter(project_id=project_id)
        if not qs.exists():
            cls.new_default(org_id, project_id)
            qs = cls.objects.using(org_id).filter(project_id=project_id)
        return qs[0]

    @classmethod
    def expired(cls, org_id, project_id):
        qs = cls.objects.using(org_id).filter(project_id=project_id, is_system=1)
        if not qs.exists():
            cls.new_default(org_id, project_id)
            qs = cls.objects.using(org_id).filter(project_id=project_id, is_system=1)
        return qs.order_by('-order')[0]

    def to_dict(self):
        ret = super(TaskStatus, self).to_dict(exclude=['project_id', 'order'])
        return ret

    class Meta:
        db_table = 'project_task_status'
        ordering = ('order',)


class TaskPriority(_models.BaseOrgModel, ProjectMixin):
    project_id = _models.PositiveBigIntegerField()
    name = models.CharField(max_length=128)
    is_system = models.PositiveIntegerField(default=0)
    color = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(db_index=True, default=0)

    @classmethod
    def new_default(cls, org_id, project_id):
        for i, (name, color) in enumerate([('高', 0xff0000), ('中', 0xff8c00), ('低', 0x008000)]):
            cls.objects.using(org_id).get_or_create(project_id=project_id,
                                                    name=name,
                                                    is_system=1,
                                                    defaults=dict(color=color,
                                                                  order=i + 0x7ffffff0)
                                                    )

    @classmethod
    def get_default(cls, org_id, project_id):
        qs = cls.objects.using(org_id).filter(project_id=project_id)
        if not qs.exists():
            cls.new_default(org_id, project_id)
            qs = cls.objects.using(org_id).filter(project_id=project_id)
        return qs[0]

    def to_dict(self):
        ret = super(TaskPriority, self).to_dict(exclude=['project_id', 'order'])
        return ret

    class Meta:
        db_table = 'project_task_priority'
        ordering = ('order',)


class Task(_models.BaseOrgModel, OrderMixin, ProjectMixin):
    serialize_object_fields = (('assignee', 'User'), )
    order_filter_fields = ("is_completed", "project_id")
    # ORDER_STEP = 10**5

    status = models.ForeignKey('TaskStatus', null=True, db_constraint=False)
    priority = models.ForeignKey('TaskPriority', null=True, db_constraint=False,
                                 related_name='priority_related_tasks')

    tags = models.ManyToManyField(Tag, through=TaskTag)
    creator = _models.PositiveBigIntegerField(db_index=True)
    assignee = _models.PositiveBigIntegerField(db_index=True)

    project_id = _models.PositiveBigIntegerField(db_index=True)

    subject = models.CharField(max_length=128)
    content = models.TextField(max_length=20480)

    date_added = models.PositiveIntegerField(db_index=True)
    date_updated = models.PositiveIntegerField()
    date_due = models.IntegerField(db_index=True)
    date_completed = models.PositiveIntegerField(default=0, db_index=True)

    expected_hours = models.IntegerField(default=0)
    spent_hours = models.IntegerField(default=0)
    is_completed = models.SmallIntegerField(default=0)
    order = models.BigIntegerField(default=0, db_index=True)

    def save(self, *args, **kwargs):
        self.date_updated = current_timestamp()
        return super(Task, self).save(*args, **kwargs)

    @property
    def discussion_group_id(self):
        if self.project:
            return self.project.discussion_group_id
        else:
            return 0

    def to_dict(self, project_info=None):
        ret = super(Task, self).to_dict(
            exclude=['status', 'priority']
        )

        if project_info:
            ret['project'] = project_info
        elif self.project:
            ret['project'] = self.project.to_dict()
        else:
            ret['project'] = {}

        ret['tags'] = [t.to_dict() for t in self.tags_in_order]
        ret['status'] = self.status.to_dict() if self.status else {}
        ret['priority'] = self.priority.to_dict() if self.priority else {}

        return ret

    def comments(self):
        return Comment.objects \
            .using(self._state.db) \
            .filter(target=self.id)

    @property
    def tags_in_order(self):
        '''order_by the sequence in TaskTag table'''
        return self.tags.all().order_by('tag_related_tasks')

    def reset_tags(self, *tags):
        old_tags_set = set(self.tags_in_order)
        new_tags_set = set(tags)

        added = new_tags_set - old_tags_set
        deleted = old_tags_set - new_tags_set
        task_tag_deleted.send(sender=Task, instance=self, using=self._state.db, tags=deleted)
        task_tag_added.send(sender=Task, instance=self, using=self._state.db, tags=added)

        self.tags.clear()
        for tag in tags:
            TaskTag(
                task_id=self.id,
                tag_id=tag.id
            ).save(using=self._state.db)

    def add_tags(self, *tags):
        for tag in tags:
            TaskTag(
                task_id=self.id,
                tag_id=tag.id
            ).save(using=self._state.db)

        task_tag_added.send(sender=Task, instance=self, using=self._state.db, tags=tags)

    def delete_tags(self, *tags):
        TaskTag.objects \
            .using(self.org_id) \
            .filter(tag__in=tags, task=self)\
            .delete()

        task_tag_deleted.send(sender=Task, instance=self, using=self._state.db, tags=tags)

    class Meta:
        db_table = 'project_task'


class TaskOperation(_models.BaseOrgModel):
    UNKNOWN = 0
    CREATE_TASK = 100
    # COMPLETE_TASK = 101

    UPDATE_TASK_ATTRIBUTE = 200
    # CHANGE_ASSIGNEE = 201

    ADD_ATTACHMENT = 300
    DEL_ATTACHMENT = 301

    ADD_TAG = 400
    DEL_TAG = 401

    task = models.ForeignKey(Task, db_constraint=False, related_name="operations")
    operator = _models.PositiveBigIntegerField()
    operation_code = models.PositiveIntegerField(default=UNKNOWN)
    content = JSONCharField(max_length=4096 * 16, null=True)

    class Meta:
        db_table = 'project_task_operation'


class TaskMixin(object):
    def task(self):
        return Task.objects \
            .using(self._state.db) \
            .get_or_none(id=self.task_id)


class TaskAttachment(_models.BaseOrgModel, _models.FileModelsMixin, TaskMixin):
    creator = _models.PositiveBigIntegerField()
    task_id = _models.PositiveBigIntegerField(db_index=True)
    meta = JSONCharField(max_length=4096 * 16)
    filepath = models.CharField(max_length=128)

    fs = FileSystemStorage(location=settings.FS_ROOT)

    def to_dict(self):
        ret = super(TaskAttachment, self).to_dict(exclude=['meta'])

        ret.update(self.meta)
        # del ret['meta']

        return ret

    class Meta:
        db_table = 'project_task_attachment'


class Comment(_models.BaseOrgModel):
    target = _models.PositiveBigIntegerField(db_index=True)
    creator = _models.PositiveBigIntegerField()
    content = models.TextField(max_length=1024)
    date_added = models.PositiveIntegerField()

    def task(self):
        return Task.objects \
            .using(self._state.db) \
            .get_or_none(id=self.target)

    class Meta:
        db_table = 'core_comment'


class TaskStat(_models.BaseOrgModel):
    ALL_USERS = 0

    user_id = _models.PositiveBigIntegerField()  # 0 statistic for whole project (all users)
    project = models.ForeignKey(Project, db_constraint=False)
    uncompleted = models.PositiveIntegerField(default=0)
    completed = models.PositiveIntegerField(default=0)
    timestamp = models.DateField(null=True, blank=True)  # None for real-time data or history data

    @classmethod
    def create_or_update(cls, using, user_id, project_id, completed, uncompleted):
        r, created = cls.objects \
            .using(using) \
            .get_or_create(
                user_id=user_id,
                project_id=project_id,
                timestamp=None,
                defaults={
                    'completed': completed,
                    'uncompleted': uncompleted,
                }
            )
        if not created:
            if setattr_if_changed(r, completed=completed, uncompleted=uncompleted):
                r.save()

    class Meta:
        db_table = 'project_task_stat'
