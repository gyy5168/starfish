#!/usr/bin/env python
import os

os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES

import json
import signal
import time
import utils

from common.message_queue import MessageConsumerBase

from log import config_logging
config_logging(filename='/mnt1/logs/starfish-operation-info.log')

import logging
log = logging.getLogger(__name__)


class MessageConsumer(MessageConsumerBase):
    def get_level(self, time_cost):
        levels = settings.REQUEST_TIME_LIMIT_LEVELS
        if not levels:
            return

        low, high = 0, 0
        for i in range(len(levels)):
            if i > 0:
                low = levels[i-1]
            high = levels[i]

            if low <= time_cost < high:
                return low

        return levels[-1]

    def consume(self, data):
        data = json.loads(data)
        level = self.get_level(data['time_cost'])

        if level:
            log.info(
                "REQUEST TIME L%s(%s|%s|%s ms): %s %s, RESPONSE: %s, %s KB,  %s",
                level,
                data['org_id'], data['user_id'],
                data['time_cost'],
                data['method'], data['path'],
                data['status_code'], round(data['response_len']/1024, 2),
                data['agent']
            )
        # do additional statistic works

    def _get_name(self):
        return str(__file__)


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    utils.register_to_zk_or_wait(__file__, settings.ZK_HOSTS)

    MessageConsumer(
        conf={
            'url': settings.KAFKA_URL
        },
        queue=settings.STARFISH_OPERATION_INFO_QUEUE
    ).start()

    while True:
        time.sleep(1)
