#!/usr/bin/env python
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES

import time
import utils

from datetime import datetime, timedelta
from django.db import connections
from apps.project.models import TaskStat, TaskStatus, Task
from common.utils import shard_id, str_to_date, setattr_if_changed, all_orgs, current_timestamp

from log import config_logging
config_logging(filename='/mnt1/logs/starfish-project-task-statistic.log')

import logging
log = logging.getLogger(__name__)


class TaskStatisticHandler(object):
    def __init__(self, org_id, save_to_timestamp=None, is_overwrite=True):
        '''save_to_timestamp:
            None by default today,
            or datetime/date object
            or string in format as '2015-04-08'
        '''
        if save_to_timestamp is None:
            save_to_timestamp = datetime.now()
        if isinstance(save_to_timestamp, str):
            save_to_timestamp = str_to_date(save_to_timestamp)
        if isinstance(save_to_timestamp, datetime):
            save_to_timestamp = save_to_timestamp.date()

        assert save_to_timestamp, 'error save_to_timestamp %s' % save_to_timestamp
        self.stamp = save_to_timestamp
        self.org_id = org_id
        self.db = shard_id(self.org_id)
        self.is_overwrite = is_overwrite

    def run(self):
        all_ts = TaskStat.objects \
            .using(self.db) \
            .filter(project__is_closed=0, timestamp=None) \
            .order_by('project', 'user_id')
        for ts in all_ts:
            self._save_history(ts)

        connections[self.db].close()
        time.sleep(1)

    def _save_history(self, obj):
        all_history = TaskStat.objects \
            .using(self.db) \
            .filter(user_id=obj.user_id, project_id=obj.project_id) \
            .filter(timestamp__lte=self.stamp) \
            .order_by('-timestamp')

        # save record everyday
        if all_history.exists():
            last_ts = all_history[0]
            # if last_ts.completed == obj.completed and last_ts.uncompleted == obj.uncompleted:
            #     return
            if last_ts.timestamp == self.stamp:
                if self.is_overwrite:
                    if setattr_if_changed(last_ts,
                                          completed=obj.completed,
                                          uncompleted=obj.uncompleted):
                        last_ts.save()
                return

        # save history record
        TaskStat(
            user_id=obj.user_id,
            project_id=obj.project_id,
            uncompleted=obj.uncompleted,
            completed=obj.completed,
            timestamp=self.stamp).save(using=self.db)
        log.info("save statistic record %s project: %s, user: %s, completed: %s, uncompleted: %s"
                 % (self.stamp, obj.project_id, obj.user_id, obj.completed, obj.uncompleted))


class TaskStatusHandler(object):
    def __init__(self, org_id):
        self.org_id = org_id

    def run(self):
        timestamp = current_timestamp()
        for t in Task.objects.using(self.org_id)\
                .filter(date_due__lte=timestamp)\
                .exclude(date_due=0)\
                .exclude(status__name='逾期'):
            t.status = TaskStatus.expired(self.org_id, t.project_id)
            t.save()

        connections[shard_id(self.org_id)].close()
        time.sleep(1)


TRIGGER_HOUR_PER_DAY = 1  # trigger statistic at 1:00 AM everyday

if __name__ == '__main__':
    import django
    django.setup()

    utils.register_to_zk_or_wait(__file__, settings.ZK_HOSTS)

    while True:
        now = datetime.now()
        if now.hour == TRIGGER_HOUR_PER_DAY:
            for org_id in all_orgs().values_list('id', flat=True):
                log.info("start to trigger project statistic for org: %s", org_id)
                # run at 1:00 AM and save history record of yesterday
                TaskStatisticHandler(org_id, now-timedelta(days=1)).run()

        for org_id in all_orgs().values_list('id', flat=True):
            TaskStatusHandler(org_id).run()

        time.sleep(60)
