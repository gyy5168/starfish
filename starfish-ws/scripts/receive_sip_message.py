#!/usr/bin/env python
import os
import signal
import simpleflake
import json

os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES

import time
from threading import Thread
from common.sync import RabbitMqUtils
from apps.message.models import Message
from common.const import SrcType, DestType
from common.utils import shard_id, TargetObject, current_timestamp
#from django.core.cache import cache as memcache
#from common import Singleton
from common.maxwell_utils import MaxwellSenderUtil

import utils
from log import config_logging
config_logging(filename='/mnt1/logs/starfish-receive-sip-message.log')

import logging
log = logging.getLogger(__name__)

class MessageReceiver(Thread):
    def __init__(self, queue, *args, **kwargs):
        log.info("init msgreceiver")
        super(MessageReceiver, self).__init__(daemon=False, *args, **kwargs)
        self.queue = queue

    def isConf(self, data):
        to_str = data.get('group_id')
        if to_str == None:
            to_str = data.get('department_id')
            if to_str == None:
                return False
        return True

    def send2Maxwell(self, data, from_type, from_id, to_type, to_id, parties):
        _kwargs_body = {
            'src_type': from_type,
            'src_id': from_id,
            'dest_type': to_type,
            'dest_id': to_id,
            'voice_event_type': data['voice_event_type'],
            'voice_event_content': data['voice_event_content'],
            'voice_event_time': data['voice_event_time'],
            'voice_caller':data['voice_caller'],
            'conference_id':data['conference_id'],
            'voice_parties':parties

        }
        _kwargs_body = TargetObject().update(shard_id(data['organization_id']), **_kwargs_body)

        _kwargs = {
            'id':simpleflake.simpleflake(),
            'src_type': from_type,
            'src_id': from_id,
            'src':_kwargs_body['src'],
            'dest_type': to_type,
            'dest_id': to_id,
            'dest':_kwargs_body['dest'],
            'type':Message.TYPE_VOICE_MESSAGE_UPDATED,
            'scope_org_id':int(data['organization_id']),
            'date_added':current_timestamp(),
            'body':_kwargs_body
        }        
        _kwargs = TargetObject().update(shard_id(data['organization_id']), **_kwargs)
        payload = json.dumps(_kwargs).encode('utf8')

        send_parties = parties
        send_parties_str = data.get('voice_notify_parties')
        if send_parties_str != None:
            send_parties = list(map(int, send_parties_str.lstrip('[').rstrip(']').split(',')))

        MaxwellSenderUtil.send(
            id=simpleflake.simpleflake(),
            user_ids=send_parties,
            payload=payload,
            excl_agent_ids_per_users=[],
            date_added=current_timestamp())

    def handle(self, data):
        if self.isConf(data) == False :
            from_id = int(data['voice_event_content'])
            from_type = SrcType.ORG_MEMBER
            if 'CONFEND' ==  data['voice_event_type'] :
                from_id = int(data['voice_caller'])

            parties = list(map(int, data['voice_parties'].lstrip('[').rstrip(']').split(',')))
            to_id = parties[1] if parties[0] == from_id else parties[0]
            to_type = DestType.ORG_MEMBER
            
            self.send2Maxwell(data, from_type, from_id, to_type, to_id, parties)

        else:
            from_id = 0
            from_type = SrcType.SYSTEM
            parties = list(map(int, data['voice_parties'].lstrip('[').rstrip(']').split(',')))

            to_str = data.get('group_id')
            to_type = DestType.DISCUSSION_GROUP
            if to_str == None:
                to_str = data.get('department_id')
                to_type = DestType.DEPARTMENT
            to_id = int(to_str)

            if 'CONFEND' != data['voice_event_type'] :
                from_id = int(data['voice_event_content'])
                from_type = SrcType.ORG_MEMBER

            self.send2Maxwell(data, from_type, from_id, to_type, to_id, parties)

    def run(self):
        def _callback(ch, method, properties, body):
            try:
                data = dict(tuple(i.split(':')) for i in body.decode().split('\n')[:-1])
                log.info("%s Received %s" % (self.queue, data))
                self.handle(data)
            except Exception as e:
                log.error('handle received data, queue %s, error: %s' % (self.queue, e))
                log.exception(e)

            ch.basic_ack(delivery_tag=method.delivery_tag)

        RabbitMqUtils(self.queue, **settings.RABBIT_MQ_CONF).receive(_callback)


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    #utils.register_to_zk_or_wait(__file__, settings.ZK_HOSTS)

    MessageReceiver('starfish_sip_event').start()

    time.sleep(10)
