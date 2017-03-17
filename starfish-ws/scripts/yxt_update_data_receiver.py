#!/usr/bin/env python
import os
import signal

os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES

import json
import time
from threading import Thread
from common.sync import RabbitMqUtils
from yxt.utils import *
import utils
from log import config_logging
config_logging(filename='/mnt1/logs/starfish-yxt-update-data-receiver.log')

import logging
log = logging.getLogger(__name__)


class YxtReceiver(Thread):
    MISSING_RETRIES = (5, 6)  # sleep 6s & 5 times
    IMPORT_CLASS = None

    def __init__(self, queue, *args, **kwargs):
        super(YxtReceiver, self).__init__(daemon=False, *args, **kwargs)
        self.queue = queue

    def handle(self, data):
        assert self.IMPORT_CLASS, 'IMPORT_CLASS can not be None'
        org_uuid = data.get('ORGID')

        imp = self.IMPORT_CLASS(org_uuid=org_uuid)
        data = imp.build_data(data)
        if self.queue.endswith('del'):
            imp.delete_by_data(data)
        else:
            for i in range(self.MISSING_RETRIES[0]):
                try:
                    imp.import_by_data(data)
                    break
                except ImportMissingError as e:
                    log.info('waiting for import missing[%s] %s' % (e, i))
                    time.sleep(self.MISSING_RETRIES[1])
                    continue
                except Exception as e1:
                    log.error('%s error, %s' % (self.__class__.__name__, e1))
                    log.exception(e1)
                    break

    def run(self):
        def _callback(ch, method, properties, body):
            try:
                data = json.loads(body.decode())
                log.info("%s Received %s" % (self.queue, data))
                self.handle(data)
            except Exception as e:
                log.error('handle received data, queue %s, error: %s' % (self.queue, e))
                log.exception(e)

            ch.basic_ack(delivery_tag=method.delivery_tag)

        RabbitMqUtils(self.queue, **settings.RABBITMQ_YXT).receive(_callback)


class UserReceiver(YxtReceiver):
    IMPORT_CLASS = ImportUser


class OrgReceiver(YxtReceiver):
    IMPORT_CLASS = ImportOrg


class UserOrgReceiver(YxtReceiver):
    IMPORT_CLASS = ImportUserOrg


class UserPositionReceiver(YxtReceiver):
    IMPORT_CLASS = ImportUserPosition


class DepartmentReceiver(YxtReceiver):
    IMPORT_CLASS = ImportDepartment


class UserDepartmentReceiver(YxtReceiver):
    IMPORT_CLASS = ImportUserDepartment


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    utils.register_to_zk_or_wait(__file__, settings.ZK_HOSTS)

    UserReceiver('tosf|uc_user|add').start()
    UserReceiver('tosf|uc_user|update').start()
    UserReceiver('tosf|uc_user|del').start()

    OrgReceiver('tosf|uc_org|add').start()
    OrgReceiver('tosf|uc_org|update').start()
    OrgReceiver('tosf|uc_org|del').start()

    UserOrgReceiver('tosf|uc_user_org|add').start()
    UserOrgReceiver('tosf|uc_user_org|update').start()
    UserOrgReceiver('tosf|uc_user_org|del').start()

    UserPositionReceiver('tosf|uc_user_position|add').start()
    UserPositionReceiver('tosf|uc_user_position|update').start()
    UserPositionReceiver('tosf|uc_user_position|del').start()

    DepartmentReceiver('tosf|uc_department|add').start()
    DepartmentReceiver('tosf|uc_department|update').start()
    DepartmentReceiver('tosf|uc_department|del').start()

    UserDepartmentReceiver('tosf|uc_user_department|add').start()
    UserDepartmentReceiver('tosf|uc_user_department|update').start()
    UserDepartmentReceiver('tosf|uc_user_department|del').start()

    time.sleep(10)
