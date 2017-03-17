import os

os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES

import lz4
import json
import signal
import utils
import time
import OpenSSL
import threading

from queue import Queue
from datetime import datetime, timedelta
from apnsclient import Session, APNs, Message

from common.message_queue import MessageConsumerBase
from common.const import SrcType

from apps.account.models import User, UserDevice
from apps.org.models import Invitation

from log import config_logging
config_logging(
    filename='/mnt1/logs/starfish-push-to-ios-devices-%s.log' % os.environ['IOS_PUSH_ENV']
)

import logging
logging.getLogger("apnsclient.backends.stdio").setLevel(logging.ERROR)
log = logging.getLogger(__name__)


class MessageFormater(object):
    TYPE_INVITATION_CREATED = '{name}邀请您加入{org_name}'

    TYPE_INVITATION_UPDATED_CONFIRM = '{name}接受了您的邀请，加入了{org_name}'
    TYPE_INVITATION_UPDATED_IGNORE = '{name}忽略了您的邀请，没有加入{org_name}'
    TYPE_INVITATION_UPDATED_REFUSE = '{name}拒绝了您的邀请，没有加入{org_name}'

    TYPE_TEXT_CHAT_CREATED = '{name}：{chat_text}'
    TYPE_MULTIMEDIA_CHAT_CREATED = '{name}：[{format}]'

    TYPE_APP_MSG = '{name}：{subject}'


class MessageConsumer(MessageConsumerBase):
    USER_DEVICE_TOKEN_EXPIRED = 20

    def __init__(self, apns_queue, *args, **kwargs):
        super(MessageConsumer, self).__init__(*args, **kwargs)

        self.apns_queue = apns_queue

    def consume(self, message):
        start = time.time()
        try:
            self._consume0(self._decode_message(message))
        except Exception as e:
            log.info(message)
            log.exception(e)

        log.info('consume message spent:%.2fs', time.time() - start)

    def _decode_message(self, message):
        from maxwell.maxwell_protocol_backend_subscriber_publisher_structs_pb2 import (
            backend_pub_msg_t)
        msg = backend_pub_msg_t()
        msg.ParseFromString(message[1:])
        msg.msg.payload = lz4.loads(msg.msg.payload)
        return msg

    def _consume0(self, message):
        log.info('got message, id=%s', message.msg.id)

        user_ids = set([agent.user_id for agent in message.agents])
        payload = json.loads(message.msg.payload.decode('utf8'))
        messages = self._build_messages(user_ids, payload)

        log.info(
            'build message, user_ids=%s, id=%s, type=%s, send(%s)',
            user_ids, payload['id'], payload['type'], len(messages)
        )

        self.apns_queue.put(messages)

    def _build_messages(self, user_ids, payload):
        type_ = payload['type']
        if not hasattr(self, '_build_messages_type_%s' % type_):
            log.info('skip message, type=%s', type_)
            return []

        return getattr(self, '_build_messages_type_%s' % type_)(user_ids, payload)

    def _should_build_message(self, user_device, message):
        if message['src_type'] == SrcType.ORG_MEMBER and message['src_id'] == user_device.user_id:
            log.info('skip user self, msg.src=%s', message['src_id'])
            return False

        return user_device.update_time and user_device.update_time > \
            datetime.now() - timedelta(days=self.USER_DEVICE_TOKEN_EXPIRED)

    def _build_messages_type_0(self, user_ids, message):
        invitation = message['body']['invitation']
        return self.__build_message(
            set([invitation['whom']['id']]) & user_ids,
            MessageFormater.TYPE_INVITATION_CREATED.format(
                name=invitation['who']['name'],
                org_name=invitation['org']['name']
            ),
            message
        )

    def _build_messages_type_1(self, user_ids, message):
        invitation = message['body']['invitation']
        if invitation['status'] == Invitation.STATUS_CONFIRM:
            alert = MessageFormater.TYPE_INVITATION_UPDATED_CONFIRM.format(
                name=invitation['whom']['name'],
                org_name=invitation['org']['name']
            )
        elif invitation['status'] == Invitation.STATUS_IGNORE:
            alert = MessageFormater.TYPE_INVITATION_UPDATED_IGNORE.format(
                name=invitation['whom']['name'],
                org_name=invitation['org']['name']
            )
        elif invitation['status'] == Invitation.STATUS_REFUSE:
            alert = MessageFormater.TYPE_INVITATION_UPDATED_REFUSE.format(
                name=invitation['whom']['name'],
                org_name=invitation['org']['name']
            )
        else:
            log.warning('invalid invitation status: %s', invitation['status'])
            return []

        return self.__build_message(
            set([invitation['who']['id']]) & user_ids,
            alert,
            message
        )

    def _build_messages_type_2(self, user_ids, message):
        user = User.objects.get_or_none(id=message['src_id'])

        return self.__build_message(
            user_ids,
            MessageFormater.TYPE_TEXT_CHAT_CREATED.format(
                name=user.name,
                chat_text=message['body']['chat']['content']
            ),
            message
        )

    def _build_messages_type_3(self, user_ids, message):
        user = User.objects.get_or_none(id=message['src_id'])

        format_ = '文件'
        if message['body']['chat']['mimetype'].startswith('image/'):
            format_ = '图片'
        elif message['body']['chat']['mimetype'].startswith('audio/'):
            format_ = '语音'
        else:
            pass

        return self.__build_message(
            user_ids,
            MessageFormater.TYPE_MULTIMEDIA_CHAT_CREATED.format(
                name=user.name, format=format_
            ),
            message
        )

    def _build_messages_type_63(self, user_ids, message):
        user = User.objects.get_or_none(id=message['src_id'])

        return self.__build_message(
            user_ids,
            MessageFormater.TYPE_APP_MSG.format(
                name=user.name,
                subject=message['body']['content']['subject'],
            ),
            message
        )

    def __build_message(self, user_ids, alert, message):
        if not user_ids:
            return []

        user_devices_ = UserDevice.objects \
            .filter(user_id__in=user_ids)
        user_devices = [i for i in user_devices_]

        log.info('len(user_devices) = %s', len(user_devices))

        messages = []
        for user_device in user_devices:
            if not self._should_build_message(user_device, message):
                continue

            messages.append(Message(
                [user_device.device_token],
                sound='StarfishNews.caf',
                alert=alert
                # badge=self._calc_badge(user_device.user_id)
                )
            )

            log.info('build message, token=%s', user_device.device_token)

        return messages

    def _calc_badge(self, user_id):
        return 1

    def _get_name(self):
        return str(__file__)


class MessageSender(threading.Thread):

    RETRIES = 5

    def __init__(self, apns_queue):
        super(MessageSender, self).__init__(daemon=True)
        self.apns_queue = apns_queue
        self.session = Session(write_timeout=8, read_timeout=8)
        self.conn = None

    def run(self):
        while True:
            for message in self.apns_queue.get():
                self._send_message(message)

    def _send_message(self, message):
        res = None
        for i in range(self.RETRIES):
            try:
                res = APNs(self._get_conn()).send(message)
                break
            except (OpenSSL.SSL.SysCallError, OpenSSL.SSL.SysCallError) as e:
                self.conn = None
                log.exception(e)

                if i == self.RETRIES - 1:
                    log.error('apns failed')

        for token, reason in res.failed.items():
            code, errmsg = reason
            log.warning("device failed: %s, reason: %s", token, errmsg)

    def _get_conn(self):
        if not self.conn:
            self.conn = self.session.new_connection(
                os.environ['IOS_PUSH_ENV'], cert_file=self._get_cert())

        return self.conn

    def _get_cert(self):
        if settings.IS_YXT_ENV:
            return '%s/conf/apns-%s_yxt.pem' % (root_path, os.environ['IOS_PUSH_ENV'])
        else:
            return '%s/conf/apns-%s.pem' % (root_path, os.environ['IOS_PUSH_ENV'])


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    utils.register_to_zk_or_wait(
        '%s.%s' % (__file__, os.environ['IOS_PUSH_ENV']), settings.ZK_HOSTS)

    apns_queue = Queue(maxsize=64)

    num_of_workers = 64
    for i in range(num_of_workers):
        MessageSender(apns_queue).start()

    log.info('num_of_workers: %s', num_of_workers)

    MessageConsumer(
        apns_queue=apns_queue,
        conf={
            'url': settings.KAFKA_URL
        },
        queue=settings.STARFISH_APNS_QUEUE,
    ).start()

    while True:
        time.sleep(1)
