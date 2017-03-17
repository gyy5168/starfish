#!/usr/bin/env python
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES

import requests
import json
import signal
import time
import utils

from common.utils import normalize_phone_number
from common.message_queue import MessageConsumerBase
from apps.account.models import TokenType

from log import config_logging
config_logging(filename='/mnt1/logs/starfish-send-token-message.log')

import logging
log = logging.getLogger(__name__)


class MessageConsumer(MessageConsumerBase):
    def consume(self, message):
        log.info('got message: %s', message)
        data = json.loads(message)

        methods = {
            TokenType.RESET_PASSWORD_BY_PHONE:
            self._handle_reset_password_by_phone,

            TokenType.VALIDATE_PHONE:
            self._handle_validate_phone,
        }

        return methods[data['type']](data)

    def _handle_reset_password_by_phone(self, data):
        from apps.account.template import reset_password_sms_template
        self._sendsms(
            data['phone'],
            reset_password_sms_template.format(token=data['token']))

    def _handle_validate_phone(self, data):
        from apps.account.template import validate_phone_sms_template
        self._sendsms(
            data['phone'],
            validate_phone_sms_template.format(token=data['token']))

    def _sendsms(self, to, content):
        if not settings.SMS_SWITCH:
            return

        try:
            requests.get(
                settings.SMS_GATEWAY_URL,
                params={
                    'to': normalize_phone_number(to),
                    'body': content,
                    'sc': settings.SMS_GATEWAY_SECRET_CODE,
                    'type': settings.SMS_TYPE_TOKEN},
                timeout=settings.SMS_GATEWAY_TIMEOUT)
        except Exception as e:
            log.exception(e)

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
        queue=settings.STARFISH_TOKEN_QUEUE_NAME
    ).start()

    while True:
        time.sleep(1)
