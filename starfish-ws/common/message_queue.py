import os
import json
from kafka.partitioner.base import Partitioner
import simpleflake
from kafka.client import KafkaClient
from kafka.consumer import SimpleConsumer
from kafka.producer import SimpleProducer, KeyedProducer

import struct

from django.conf import settings
from common import Singleton
from common.const import DestType, SrcType
from common.message_consumer import MultiProcessConsumerEx
from common.utils import TargetObject, shard_id, current_timestamp

from common.shard import decode_partition_id,encode_partition_id,collapse
from common.shard import generate_route_spec,do_sharding,get_partition_cnt

import logging
log = logging.getLogger(__name__)

def send_message_to_queue(queue, message):
    KafKaQueue().send(queue, message)

def send_keyed_message_to_queue(queue, key, message):
    KafKaQueue().send(queue, message, key = key)

def is_org_message(msg_type):
    from apps.message.models import Message
    return msg_type in (Message.TYPE_ORG_CREATED,
         Message.TYPE_ORG_UPDATED,
         Message.TYPE_ORG_MEMBER_JOINED,
         Message.TYPE_ORG_MEMBER_LEFT,
         Message.TYPE_DEPARTMENT_CREATED,
         Message.TYPE_DEPARTMENT_UPDATED,
         Message.TYPE_DEPARTMENT_DISBANDED,
         Message.TYPE_DEPARTMENT_MEMBER_JOINED,
         Message.TYPE_DEPARTMENT_MEMBER_LEFT,
         Message.TYPE_MEMBER_DEPARTMENTS_UPDATED,
         Message.TYPE_MEMBER_DEPARTMENTS_UPDATED_V2,
         Message.TYPE_USER_UPDATED)


class KafKaQueue(object, metaclass=Singleton):
    SEND_RETRIES = 3


    class IndexPartitioner(Partitioner):
        def partition(self, key, partitions=None):
            idx = decode_partition_id(key)
            if not partitions:
                partitions = self.partitions
            return partitions[idx]

    def __init__(self):
        self._kafka_producer = None

        self.send_switch = True
        if hasattr(settings, 'MESSAGE_TO_MAXWELL_SWITCH') \
                and not settings.MESSAGE_TO_MAXWELL_SWITCH:
            self.send_switch = False

    @property
    def kafka_producer(self):
        if not self._kafka_producer:
            self._kafka_producer = \
             KeyedProducer(KafkaClient(settings.KAFKA_URL), partitioner=self.IndexPartitioner)
        #SimpleProducer(KafkaClient(settings.KAFKA_URL))
        return self._kafka_producer

    def reset_producer(self):
        try:
            self.kafka_producer.client.close()
        except:
            pass
        self._kafka_producer = None

    def send(self, queue, data, key=None):
        if not self.send_switch:
            return

        if isinstance(data, dict):
            data = json.dumps(data)

        for i in range(self.SEND_RETRIES):
            try:
                bmsg = data.encode('utf8')
                if key is None:
                    return self.kafka_producer.send_messages(queue, encode_partition_id(0), bmsg)
                else:
                    return self.kafka_producer.send_messages(queue, key, bmsg)

            except Exception as e:
                log.error('send message to queue: %s, error: %s, data: %s' % (queue, data, e))
                self.reset_producer()

                if i == self.SEND_RETRIES - 1:
                    raise e

class SaveMessageQueue(KafKaQueue):
    TO_FAST = 0
    TO_SLOW = 1
    queue = settings.STARFISH_SAVE_USER_MESSAGE_QUEUE_NAME

    class _MyPartitioner(Partitioner):
        def partition(self, key, partitions=None):
            _to, org_id = tuple(int(i) for i in key.decode('utf-8').split('_'))
            if not partitions:
                partitions = self.partitions

            fast, slow = settings.STARFISH_SAVE_USER_MESSAGE_PROCESSES
            if len(partitions) != fast+slow:
                raise ValueError('partitions count %s does not match settings %s, %s'
                                 % (len(partitions), fast, slow))
            if _to == SaveMessageQueue.TO_FAST:
                idx = org_id % fast
            else:
                idx = fast + (org_id % slow)

            return partitions[idx]

    @property
    def kafka_producer(self):
        if not self._kafka_producer:
            kc = KafkaClient(settings.KAFKA_URL)
            if not kc.has_metadata_for_topic(self.queue):
                raise ValueError(
                    "topic %s not found in kafka, please create manually" % self.queue)
            self._kafka_producer = KeyedProducer(kc, partitioner=self._MyPartitioner)
        return self._kafka_producer

    def send_to(self, data, org_id, to=TO_FAST):
        key = '%s_%s' % (to, org_id)
        log.info('send to user-message-worker: %s, %s, %s' % (org_id, to, data))
        return self.send(self.queue, data, key.encode('utf8'))

class MessageConsumerBase(object):

    MAX_BUFFER_SIZE = 8912 * 64

    KAFKA_CONSUMER_ITER_TIMEOUT = 0.1

    def __init__(self, conf, queue):
        self.conf = conf
        self.queue = queue
        self._consumer = self.get_consumer()

    def get_consumer(self):
        return SimpleConsumer(
            KafkaClient(self.conf['url']),
            self._get_name().encode('utf8'),
            self.queue.encode('utf8'),
            max_buffer_size=self.MAX_BUFFER_SIZE,
            iter_timeout=self.KAFKA_CONSUMER_ITER_TIMEOUT)

    def start(self):
        while True:
            for message in self._consumer:
                try:
                    self.consume(message.message.value.decode('utf8'))
                except UnicodeDecodeError as e:
                    self.consume(message.message.value)
                except Exception as e:
                    log.exception(e)

    def stop(self):
        if self._consumer:
            self._consumer.stop()

    def _get_name(self):
        raise ValueError("_get_name")

    def consume(self, message):
        pass

class MessageConsumerMultiProcess(MessageConsumerBase):
    @property
    def partitions_num(self):
        return sum(settings.STARFISH_SAVE_USER_MESSAGE_PROCESSES)

    @property
    def cmd(self):
        return 'kafka-topics.sh --create --zookeeper %s --replication-factor n --partitions %s --topic %s' \
               % (settings.ZK_HOSTS.split(',')[0],
                  self.partitions_num, self.queue)

    def get_consumer(self):
        kc = KafkaClient(self.conf['url'])
        if not kc.has_metadata_for_topic(self.queue):
            raise ValueError("topic %s not found in kafka, please create manually. \n%s"
                             % (self.queue, self.cmd))

        return MultiProcessConsumerEx(
            kc, self._get_name(), self.queue,
            num_procs=self.partitions_num,
            # partitions_per_proc=1,
            consume_handler=self._consume_and_handle,
            max_buffer_size=self.MAX_BUFFER_SIZE,
            iter_timeout=self.KAFKA_CONSUMER_ITER_TIMEOUT)

    def _consume_and_handle(self, partition, offset, message):
        '''called and consume message in children processes'''
        # log.info('consume_and_handle: %s:%s' % (partition, offset))
        self.consume(message.value.decode('utf8'))

    def start(self):
        while True:
            try:
                for message in self._consumer:
                    log.info('handled message: %s' % message.offset)
            except Exception as e:
                # log.info('end start: %s' % e)
                break

class MessageSender(object):
    def __init__(self, msg_type, body, scope_org_id=0):
        if scope_org_id is None:
            scope_org_id = 0

        self.msg_type = msg_type
        self.body = body
        self.scope_org_id = scope_org_id
        self.partition_num = get_partition_cnt(settings.STARFISH_MESSAGE_QUEUE_NAME)

    def send(self, src_id, src_type, dest_id, dest_type,
             date_added=None, message_id=None, session_id=None):
        _kwargs = {
            'id': message_id or simpleflake.simpleflake(),
            'is_event': 0 if message_id else 1,
            'type': self.msg_type,
            'src_type': src_type,
            'src_id': src_id,
            'dest_type': dest_type,
            'dest_id': dest_id,
            'scope_org_id': self.scope_org_id,
            'created_at': date_added or current_timestamp(),
            'body': self.body,
            'session_id': session_id
        }
        for cmsg in collapse(_kwargs):
            cmsg = TargetObject().update(shard_id(self.scope_org_id), **cmsg)
            if is_org_message(self.msg_type):
                send_message_to_queue(settings.STARFISH_MESSAGE_ORG_QUEUE_NAME, json.dumps(cmsg))
            cmsg['shard'] = generate_route_spec(cmsg)
            msgs = do_sharding(cmsg, self.partition_num)
            for (index,msgs) in msgs.items():
                key = encode_partition_id(index)
                for m in msgs:
                    send_keyed_message_to_queue(settings.STARFISH_MESSAGE_QUEUE_NAME, key, json.dumps(m))

class SystemMessage(MessageSender):
    def send(self, dest_id, dest_type=DestType.ORG_MEMBER, session_id=None):
        return super(SystemMessage, self).send(src_id=0, src_type=SrcType.SYSTEM,
                                               dest_id=dest_id, dest_type=dest_type,
                                               session_id=session_id)
