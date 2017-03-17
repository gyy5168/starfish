from django.db.models import Count
from django.conf import settings
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch.dispatcher import receiver

from apps.project.models import (
    Project, Tag, Task, Comment, TaskStat, TaskOperation, TaskAttachment, task_tag_added,
    task_tag_deleted, TaskStatus, TaskPriority)
from apps.message.models import Message, MessageContent
from apps.org.models import DiscussionGroup, OrgApp

from common.const import SrcType, DestType, PeerType

import logging
from common.globals import get_current_user_id, get_current_user
from common.utils import to_org_id

log = logging.getLogger(__name__)


def build_task_app_msg_content(subject, task):
    return {
        "app": {
            "id": OrgApp.PROJECT,
            "name": OrgApp.PROJECT_NAME,
        },
        "content": {
            "icon": settings.PROJECT_APP_ICON,
            "subject": subject,
            "url": settings.PROJECT_DETAIL_URL_PATTERN.format(
                project_id=task.project_id,
                task_id=task.id,
                PROJECT_APP_ID=OrgApp.PROJECT
            )
        }
    }


@receiver(post_save, sender=Task)
def save_message_on_task_created(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    # empty subject
    if not instance.subject:
        return

    # send message to discussion_group
    content = MessageContent(
        content=build_task_app_msg_content(
            '[创建]%s' % instance.subject, instance
        ),
    )
    content.save(using=instance._state.db)

    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.DISCUSSION_GROUP,
        dest_id=instance.discussion_group_id,
        type=Message.TYPE_APP_CONTENT_UPDATED,
        content=content.id,
        resource_id=instance.id,
    )

    message._snapshot = content.content

    message.save(using=instance._state.db)

    # send message to assignee
    if not instance.assignee or \
            not hasattr(instance, '_peer_type') or \
            instance._peer_type != PeerType.ORG_MEMBER:
        return

    content = MessageContent(
        content=build_task_app_msg_content(
            '[创建]%s' % instance.subject, instance
        ),
    )
    content.save(using=instance._state.db)

    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.ORG_MEMBER,
        dest_id=instance.assignee,
        type=Message.TYPE_APP_CONTENT_UPDATED,
        content=content.id,
        resource_id=instance.id,
    )

    message._snapshot = content.content

    message.save(using=instance._state.db)


@receiver(post_save, sender=Task)
def save_message_on_task_completed(sender, instance, **kwargs):
    if kwargs['created']:
        return

    # empty subject
    if not instance.subject:
        return

    if instance.get_field_diff('is_completed') != (0, 1):
        return

    operator = get_current_user_id() or instance.creator

    content = MessageContent(
        content=build_task_app_msg_content(
            '[完成]%s' % instance.subject, instance
        ),
    )
    content.save(using=instance._state.db)

    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=operator,
        dest_type=DestType.DISCUSSION_GROUP,
        dest_id=instance.discussion_group_id,
        type=Message.TYPE_APP_CONTENT_UPDATED,
        content=content.id,
        resource_id=instance.id,
    )

    message._snapshot = content.content

    message.save(using=instance._state.db)


@receiver(post_save, sender=Task)
def save_message_on_task_updated(sender, instance, **kwargs):
    if kwargs['created']:
        return

    subject_diff = instance.get_field_diff('subject')
    if subject_diff is None or subject_diff[0]:
        return

    operator = get_current_user_id() or instance.creator

    content = MessageContent(
        content=build_task_app_msg_content(
            '[创建]%s' % instance.subject, instance
        ),
    )
    content.save(using=instance._state.db)

    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=operator,
        dest_type=DestType.DISCUSSION_GROUP,
        dest_id=instance.discussion_group_id,
        type=Message.TYPE_APP_CONTENT_UPDATED,
        content=content.id,
        resource_id=instance.id,
    )

    message._snapshot = content.content

    message.save(using=instance._state.db)


@receiver(post_save, sender=Project)
def create_default_project_status_priority(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    TaskStatus.new_default(instance.org_id, instance.id)
    TaskPriority.new_default(instance.org_id, instance.id)


@receiver(post_save, sender=Project)
def create_group_on_project_created(sender, instance, **kwargs):
    if instance.discussion_group_id:
        return

    g = DiscussionGroup(
        creator=instance.creator,
        name=instance.default_discussion_group_name(),
        intro='',
        avatar='',
        related_project_id=instance.id
    )
    g.save(using=kwargs['using'])

    # do not trigger post_save signal again
    sender.objects.using(kwargs['using'])\
        .filter(id=instance.id)\
        .update(discussion_group_id=g.id)

    instance.discussion_group_id = g.id


@receiver(post_save, sender=Project)
def update_group_on_project_updated(sender, instance, **kwargs):
    if kwargs['created']:
        return

    if not instance.discussion_group_id:
        return

    g = DiscussionGroup.objects \
        .using(instance._state.db) \
        .get_or_none(id=instance.discussion_group_id)
    g.name = instance.default_discussion_group_name()
    g.save(using=instance._state.db)


@receiver(post_save, sender=Project)
def save_members_on_project_created_or_updated(sender, instance, **kwargs):
    # add person_in_charge into DiscussionGroup
    person_in_charge = None
    if not kwargs['created']:
        person_in_charge_diff = instance.get_field_diff('person_in_charge')
        if person_in_charge_diff:
            person_in_charge = person_in_charge_diff[1]
    else:
        person_in_charge = instance.person_in_charge

    if hasattr(instance, '_members'):
        members = instance._members
        if person_in_charge:
            members.append(person_in_charge)
        if members:
            instance.replace_members(members, get_current_user())
    elif person_in_charge and person_in_charge not in instance.members():
        instance.add_members([person_in_charge], get_current_user())


@receiver(post_save, sender=Project)
def save_tags_on_project_created(sender, instance, **kwargs):
    if not hasattr(instance, '_tags'):
        return

    for i in instance._tags:
        Tag(
            project_id=instance.id,
            name=i['name']
        ).save(using=instance._state.db)


@receiver(pre_save, sender=Task)
def update_order_on_task_saved(sender, instance, **kwargs):
    # make a completed task to uncomplete
    condition1 = instance.get_field_diff('is_completed') == (1, 0)

    # task without order set
    condition2 = instance.is_completed == 0 and instance.order == 0

    if condition1 or condition2:
        #  adjust order to first
        instance.order = Task.new_order(to_org_id(kwargs['using']),
                                        is_completed=0, project_id=instance.project_id)
    # instance.save(using=kwargs['using'])


@receiver(post_save, sender=Comment)
def save_message_on_task_comment_created(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    if not instance.task():
        return

    content = MessageContent(
        content=build_task_app_msg_content(
            '[评论]%s' % instance.content, instance.task()
        ),
    )
    content.save(using=instance._state.db)

    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.DISCUSSION_GROUP,
        dest_id=instance.task().discussion_group_id,
        type=Message.TYPE_APP_CONTENT_UPDATED,
        content=content.id,
        resource_id=instance.id,
    )

    message._snapshot = content.content

    message.save(using=instance._state.db)


@receiver([post_save, post_delete], sender=Task)
def update_task_statistic_on_task_save_or_delete(sender, instance, **kwargs):
    count_field = 'is_completed'
    user_list = []

    if kwargs['signal'] == post_delete:
        user_list += [TaskStat.ALL_USERS, instance.assignee]
    elif kwargs['created']:
        user_list += [TaskStat.ALL_USERS, instance.assignee]
    else:
        is_completed_diff = instance.get_field_diff('is_completed')
        assignee_diff = instance.get_field_diff('assignee')
        if is_completed_diff:  # is_completed changed
            user_list += [TaskStat.ALL_USERS, instance.assignee]
        if assignee_diff:  # assignee changed
            user_list += list(assignee_diff)

    all_tasks = Task.objects \
        .using(kwargs['using']) \
        .filter(project_id=instance.project_id)

    user_set = set(user_list)
    results = {uid: {0: 0, 1: 0} for uid in user_set}

    if TaskStat.ALL_USERS in user_set:
        user_set.remove(TaskStat.ALL_USERS)
        statistic = all_tasks.values_list(count_field).annotate(Count(count_field))
        results[TaskStat.ALL_USERS] = dict(statistic)

    if user_set:
        statistic = all_tasks\
            .filter(assignee__in=user_set)\
            .values_list('assignee', count_field)\
            .annotate(Count(count_field))

        for uid, is_completed, count in statistic:
            results[uid][is_completed] = count

    for uid, r in results.items():
        TaskStat.create_or_update(
            kwargs['using'], uid, instance.project_id, r.get(1, 0), r.get(0, 0))


@receiver(post_save, sender=Task)
def save_operation_on_task_save(sender, instance, **kwargs):
    '''操作记录信息包括：
    创建任务,
    修改任务,
    添加附件,
    删除附件,
    '''
    operations = []  # a list of tuple (operation_code, content)
    if kwargs['created']:   # and instance.subject:
        operations.append((TaskOperation.CREATE_TASK, None))
    else:
        operation_code_fields = {
            TaskOperation.UPDATE_TASK_ATTRIBUTE:
                ('subject', 'content', 'date_due', 'spent_hours', 'expected_hours',
                 'assignee', 'is_completed'),
            # TaskOperation.CHANGE_ASSIGNEE:
            #     ('assignee',),
            # TaskOperation.COMPLETE_TASK:
            #     ('is_completed',),
        }
        for code, fields in operation_code_fields.items():
            for f in fields:
                diff = instance.get_field_diff(f)
                if diff:
                    content = {'before': diff[0], 'after': diff[1], 'field': f}
                    operations.append((code, content))

    operator = get_current_user_id() or instance.creator
    for code, content in operations:
        TaskOperation(
            task=instance,
            operator=operator,
            content=content,
            operation_code=code
        ).save(using=instance._state.db)


@receiver(post_save, sender=TaskAttachment)
def save_operation_on_task_attachment_save(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    TaskOperation(
        task_id=instance.task_id,
        operator=instance.creator,
        content={'attachment': instance.id, 'filename': instance.meta['filename']},
        operation_code=TaskOperation.ADD_ATTACHMENT
    ).save(using=instance._state.db)


@receiver(post_delete, sender=TaskAttachment)
def save_operation_on_task_attachment_delete(sender, instance, **kwargs):
    TaskOperation(
        task_id=instance.task_id,
        operator=instance.creator,
        content={'filename': instance.meta['filename']},
        operation_code=TaskOperation.DEL_ATTACHMENT
    ).save(using=instance._state.db)


@receiver((task_tag_added, task_tag_deleted), sender=Task)
def save_operation_on_task_tag_changed(sender, instance, tags, **kwargs):
    if kwargs['signal'] == task_tag_added:
        code = TaskOperation.ADD_TAG
    else:
        code = TaskOperation.DEL_TAG

    for tag in tags:
        TaskOperation(
            task_id=instance.id,
            operator=get_current_user_id(),
            content={'tag': tag.id, 'name': tag.name},
            operation_code=code
        ).save(using=kwargs['using'])


@receiver(post_delete, sender=Tag)
def remove_task_tag_on_tag_deleted(sender, instance, **kwargs):
    for t in Task.objects.using(kwargs['using']).filter(tags=instance):
        t.delete_tags(instance)


@receiver(post_save)
def save_task_status_priority_order(sender, instance, **kwargs):
    if sender in (TaskStatus, TaskPriority) and instance.order == 0:
        instance.order = instance.id
        instance.save()


@receiver(post_delete, sender=TaskStatus)
def remove_task_status_on_task_status_deleted(sender, instance, **kwargs):
    Task.objects.using(kwargs['using']).filter(status=instance).update(status=None)


@receiver(post_delete, sender=TaskPriority)
def remove_task_priority_on_task_priority_deleted(sender, instance, **kwargs):
    Task.objects.using(kwargs['using']).filter(priority=instance).update(priority=None)
