# -*- coding:utf-8 -*-
'''
！！！ 应付后台繁琐的运维操作，写一个临时的，shell不方便操作的事情，用这个文件来处理吧
！！！ 不要写重要任务
！！！ 随时可以删除的临时操作才写到这里
@author: yilin
'''
from django.conf import settings

from django.db.models import signals, Count
from django.db import IntegrityError
from django.core.management import BaseCommand

from apps.account.models import User, UserMaxwellEndpoint
from apps.mail.models import MailMetadata, MailMessageId
from apps.org.models import (
    Org, UserOrg, WorkMail, Department, DiscussionGroup)
from apps.project.models import Task, Project, TaskStat
from apps.acl.models import Role, UserRole
from apps.fs.models import File, FileRole

from common.const import PresetFileRole
from common.utils import shard_id, setattr_if_changed, calc_pinyin

import logging
from yxt.models import UserYxt

log = logging.getLogger(__name__)


def rebuild_task_statistic_for_all_projects(org_id):
    cache = set([])
    db = shard_id(org_id)
    tasks = Task.objects.using(db).all()

    total = tasks.count()
    for i, task in enumerate(tasks):
        key = '%s-%s' % (task.project_id, task.assignee)
        if key in cache:
            print('--Skip--%s/%s: task_id=%s, key=%s' % (i, total, task.id, key))
        else:
            print('--Doit--%s/%s: task_id=%s, key=%s' % (i, total, task.id, key))
            signals.post_save.send(sender=Task, instance=task, created=False, using=db)
            cache.add(key)


def build_mail_message_id_and_references(org_id):
    for i, mail in enumerate(MailMetadata.objects.using(org_id).all()):
        identity, created = MailMessageId.get_or_create(
            mail.message_id,
            using=shard_id(org_id)
            )
        if not created:
            continue
        mail.identity = identity
        mail.save()
        references = [int(s.strip()) for s in mail.refs.split(',') if s]
        mail.references = references
        print('[%s]%s--identity:%s, references: %s'
              % (i, mail.id, identity.id, references))


def fix_old_data_for_project_task_statistic(org_id):
    ps = Project.objects.using(org_id).all()
    total = ps.count()
    for i, p in enumerate(ps):
        print('%s/%sstatistic for project %s' % (i, total, p.id))
        for uid in list(p.members())+[TaskStat.ALL_USERS]:
            count_field = 'is_completed'
            tasks = Task.objects \
                .using(org_id) \
                .filter(project_id=p.id)
            if uid != TaskStat.ALL_USERS:
                tasks = tasks.filter(assignee=uid)

        results = dict(tasks.values_list(count_field).annotate(Count(count_field)))
        TaskStat.create_or_update(
            shard_id(org_id), uid, p.id, results.get(1, 0), results.get(0, 0))


def create_org_domain_and_workmail_domain_id(org_id):
    orgs = Org.objects.all()
    if org_id:
        orgs = orgs.filter(id=org_id)

    for o in orgs:
        od = o.default_domain
        od.name = o.domain
        od.save()
        WorkMail.objects.using(o.id).update(domain_id=od.id)
        print('create OrgDomain %s for Org %s, domain %s' % (od.id, o.id, od.name))


def fix_role():
    for i in range(1, 201):
        r = Role.objects \
            .using(i) \
            .get_or_none(id=Role.RESERVED_ROLE_END + 1)
        if not r:
            print('create admin role for org: %s' % i)
            Role(
                id=Role.RESERVED_ROLE_END + 1,
                name=Role.ADMIN_ROLE_NAME,
                is_system=1
            ).save(using=shard_id(i))

        print('delete bad user role for org: %s' % i)
        UserRole.objects.using(i).filter(role=0).delete()


def re_order_tasks(org_id, project_id):
    orgs = Org.objects.all()
    if org_id:
        orgs = orgs.filter(id=org_id)

    for o in orgs:
        projects = Project.objects.using(o.id).filter(is_closed=0)
        if project_id:
            projects = projects.filter(id=project_id)

        total = projects.count()
        for i, p in enumerate(projects):
            tasks = Task.objects.using(o.id).filter(is_completed=0, project_id=p.id)
            handler = Task.OrderHandler(tasks, Task.order_field)
            order_list = handler._re_order_all()
            print('--%s/%s: org: %s, project: %s\n' % (i, total, o.id, p.id),
                  len(order_list), order_list)


def reset_file_permission(org_id):
    orgs = Org.objects.all()
    if org_id:
        orgs = orgs.filter(id=org_id)

    for o in orgs:
        department = o.default_department
        files = File.objects.using(o.id)

        total = files.count()
        for i, f in enumerate(files):
            u = User.objects.get_or_none(id=f.creator)

            if not u:
                continue

            FileRole.set_by_preset(f, f.creator,
                                   FileRole.TYPE_ORG_MEMBER,
                                   u.name, PresetFileRole.CONTROLLER)
            FileRole.set_by_preset(f, department.id,
                                   FileRole.TYPE_DEPARTMENT,
                                   department.name, PresetFileRole.EDITOR)

            print('--%s/%s: org: %s, file: [%s]%s\n' % (i, total, o.id, f.id, f.name))


def fix_user_role(org_id):
    for o in Org.objects.all():
        r = UserRole.objects.using(o.id).filter(user_id=o.creator)
        if not r:
            UserRole.add(o.creator, o.id)
            print('add user role for %s@%s' % (o.creator, o.id))


def create_benchmark_data(org_id):
    benchmark_org_id = 2
    user_ids = range(297, 397)
    for uid in user_ids:
        try:
            UserOrg(user_id=uid, org_id=benchmark_org_id).save()
            print('add user %s to org %s' % (uid, benchmark_org_id))
        except IntegrityError:
            pass

    for i in range(31, 10000):
        g = DiscussionGroup(
            creator=user_ids[0],
            name='压力测试小组%09d' % i,
            intro='',
        )
        g._members = user_ids
        g.save(using=shard_id(benchmark_org_id))

        import time
        time.sleep(10)

        print('create group: %s, num of members: %s' % (g.name, len(g._members)))


def fix_default_department_name(org_id):
    orgs = Org.objects.all()
    if org_id:
        orgs = orgs.filter(id=org_id)

    for o in orgs:
        d = o.default_department
        if o.name != d.name:
            d.name = o.name
            d.save()
            print('fix name for department of %s: %s' % (o.id, o.name))


def user_avatar_change(doit):
    users = User.objects.all()
    total = users.count()

    for i, u in enumerate(users):
        if u.download_and_update_avatar():
            print('...%s/%s, %s, %s' % (i, total, u.id, u.avatar))
            if doit:
                u.save()
        else:
            print('...%s/%s, %s' % (i, total, u.id))


def update_discuss_group_project_id(org_id, doit):
    orgs = Org.objects.all()
    if org_id:
        orgs = orgs.filter(id=org_id)

    for o in orgs:
        ps = Project.objects.using(o.id).all()
        total = ps.count()
        for i, p in enumerate(ps):
            res = None
            if doit:
                res = DiscussionGroup.objects\
                    .using(o.id)\
                    .filter(id=p.discussion_group_id)\
                    .update(related_project_id=p.id)  # do not trigger post-save signal

            print('--%s/%s: project: %s, group: %s, res:%s'
                  % (i, total, p.id, p.discussion_group_id, res))


def update_user_order_field(doit):
    users = User.objects.all()
    total = users.count()
    for i, u in enumerate(users):
        u.order_field = calc_pinyin(u.name)
        print('%s/%s, id: %s, name: %s, %s' % (i, total, u.id, u.name, u.order_field))
        if doit:
            u.save()


def update_all_order_field(org_id, doit):
    orgs = Org.objects.all()
    if org_id:
        orgs = orgs.filter(id=org_id)

    for o in orgs:
        o.order_field = calc_pinyin(o.name)
        if doit and o.get_field_diff('order_field'):
            o.save()
        print('===========org: %s, %s, %s' % (o.id, o.name, o.order_field))

        for model in [DiscussionGroup, Department]:
            try:
                gs = model.objects.using(o.id).filter(is_disbanded=0)
                total = gs.count()
                for i, g in enumerate(gs):
                    g.order_field = calc_pinyin(g.name)
                    print('--%s/%s: %s: %s, name:%s, %s'
                          % (i, total, model.__name__, g.id, g.name, g.order_field))
                    if doit and g.get_field_diff('order_field'):
                        g.save()
            except Exception as e:
                log.info('========%s' % e)


def yxt_user_to_table_user_endpoints(doit):
    yxt_uids = set(UserYxt.objects.values_list('user_id', flat=True))
    user_ids = User.objects.values_list('id', flat=True)
    total = user_ids.count()
    for i, uid in enumerate(user_ids):
        if uid in yxt_uids:
            endpoint = settings.MAXWELL_MASTER_YXT
        else:
            endpoint = settings.MAXWELL_MASTER_STARFISH
        print('%s/%s--, user_id: %s, endpoint: %s' % (i+1, total, uid, endpoint))

        if not doit:
            continue
        o, created = UserMaxwellEndpoint.objects.get_or_create(user_id=uid)
        if setattr_if_changed(o, endpoint=endpoint):
            o.save()


class Command(BaseCommand):
    def handle(self, *args, **options):
        if len(args) >= 2:
            method = int(args[0])
            if method == 1:
                rebuild_task_statistic_for_all_projects(int(args[1]))
            elif method == 2:
                build_mail_message_id_and_references(int(args[1]))
            elif method == 3:
                fix_old_data_for_project_task_statistic(int(args[1]))
            elif method == 4:
                create_org_domain_and_workmail_domain_id(int(args[1]))
            elif method == 5:
                fix_role()
            elif method == 6:
                re_order_tasks(int(args[1]), int(args[2]))
            elif method == 7:
                reset_file_permission(int(args[1]))
            elif method == 9:
                fix_user_role(int(args[1]))
            elif method == 10:
                create_benchmark_data(int(args[1]))
            elif method == 12:
                fix_default_department_name(int(args[1]))
            elif method == 16:
                user_avatar_change(int(args[1]))
            elif method == 17:
                update_discuss_group_project_id(int(args[1]), int(args[2]))
            elif method == 19:
                update_user_order_field(int(args[1]))
            elif method == 20:
                update_all_order_field(int(args[1]), int(args[2]))
            elif method == 21:
                yxt_user_to_table_user_endpoints(int(args[1]))
        else:
            log.error("error args length")
