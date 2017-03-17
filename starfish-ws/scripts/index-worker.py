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

from django.db import connections

from django.db.models import get_model
from apps.search.utils import IndexObject
from common.message_queue import MessageConsumerBase
from common.utils import shard_id, valid_org

from log import config_logging
config_logging(filename='/mnt1/logs/starfish-index-worker.log')

import logging
log = logging.getLogger(__name__)


class MessageConsumer(MessageConsumerBase):
    def consume(self, message):
        try:
            self._consume0(message)
        except Exception as e:
            log.info(message)
            log.exception(e)

    def _consume0(self, message):
        log.info('got message: %s', message)
        data = json.loads(message)

        label = data["label"]
        model_name = data["model"]
        model = get_model(label, model_name)

        org_id = data["org_id"]
        pk = data["pk"]

        if not valid_org(org_id):
            return

        if data.get("create_index") == 1:
            IndexObject().create_index(model, pk, org_id, data.get('extra', None))
        else:
            IndexObject().delete_index(model, pk, org_id, data.get('extra', None))

        connections[shard_id(org_id)].close()

    def _get_name(self):
        return str(__file__)

if __name__ == '__main__':
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    utils.register_to_zk_or_wait(__file__, settings.ZK_HOSTS)

    import django
    django.setup()

    MessageConsumer(
        conf={
            'url': settings.KAFKA_URL,
        },
        queue=settings.STARFISH_INDEX_QUEUE_NAME
    ).start()

    while True:
        time.sleep(1)
