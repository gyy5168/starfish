from common.const import DestType, SrcType
from kafka.client import KafkaClient
from django.conf import settings
import struct

import logging

log = logging.getLogger(__name__)


# route and sharding
def encode_partition_id(partition_id):
    return struct.pack('>H', partition_id)


def decode_partition_id(packed_partition_id):
    return struct.unpack('>H', packed_partition_id)[0]


def is_conv_event(msg_type):
    from apps.message.models import Message
    return msg_type in (
        Message.TYPE_TEXT_CHAT_CREATED,
        Message.TYPE_MULTIMEDIA_CHAT_CREATED,
        Message.TYPE_APP_CONTENT_UPDATED,
    )


def hash_spec():
    return {'type': 'hash'}


def list_spec(addrs):
    spec = {'type': 'list'}
    if len(addrs) == 0 or isinstance(addrs[0], int):
        spec['arguments'] = {
            'type': 'id_list',
            'addrs': addrs
        }
        return spec
    else:
        spec['arguments'] = {
            'type': 'peer_list' if len(addrs[0]) == 4 else 'conv_list',
            'addrs': addrs
        }
        return spec


def dest_type2peer_type(dest_type):
    from common.const import PeerType
    return {
        DestType.ORG_MEMBER: PeerType.ORG_MEMBER,
        DestType.DEPARTMENT: PeerType.DEPARTMENT,
        DestType.DISCUSSION_GROUP: PeerType.DISCUSSION_GROUP,
    }.get(dest_type)


# @TODO fix here
def src_type2peer_type(src_type):
    from common.const import PeerType
    if src_type == SrcType.ORG_MEMBER:
        return PeerType.ORG_MEMBER
    else:
        return src_type


def collapse(msg):
    from apps.account.models import User
    dest_type = msg['dest_type']
    if dest_type != DestType.USER_ORG:
        return [msg]
    dest_id = msg['dest_id']
    user = User.objects.getx(id=dest_id)
    if user is None:
        log.error("user_org message send failed, reason:%s not found", dest_id)
        return []
    msgs = []
    for org in user.orgs():
        org_id = org.org_id
        m = msg.copy()
        m['scope_org_id'] = org_id
        m['dest_type'] = DestType.ORG
        m['dest_id'] = org_id
        msgs.append(m)
    return msgs


def generate_route_spec(data):
    from apps.message.models import Message
    msg_type = data['type']
    dest_type = data['dest_type']
    if not is_conv_event(msg_type):
        user_ids = []
        if dest_type == DestType.ORG_MEMBER:
            user_ids.append(int(data['dest_id']))
            if 'src_type' in data and 'src_id' in data \
                    and data['src_type'] == SrcType.ORG_MEMBER \
                    and data['type'] != Message.TYPE_MESSAGE_READ:
                user_ids.append(int(data['src_id']))
            user_ids = list(set(user_ids))
            return list_spec(user_ids)
        elif dest_type in (DestType.DISCUSSION_GROUP, DestType.DEPARTMENT, DestType.ORG):
            return hash_spec()
    else:
        if dest_type == DestType.ORG_MEMBER:
            peer_list = [data['src_id'], data['dest_id']]
            return list_spec(list(set(peer_list)))
        else:
            return hash_spec()


def get_partition_cnt(queue):
    kc = KafkaClient(settings.KAFKA_URL)
    return len(kc.get_partition_ids_for_topic(queue))


def calc_landbridge_server_url(user_id):
    landbridge_spec = settings.LANDBRIDGE_SPEC
    mod = landbridge_spec['cluster_size']
    index = user_id % mod
    return landbridge_spec['shard'][index]['url']


def calc_partition_id(user_id):
    landbridge_spec = settings.LANDBRIDGE_SPEC
    mod = landbridge_spec['cluster_size']
    index = user_id % mod
    return landbridge_spec['shard'][index]['queue_partition']


def partition_id2queue_partition_id(index):
    landbridge_spec = settings.LANDBRIDGE_SPEC
    return landbridge_spec['shard'][index]['queue_partition']


def do_partition(addrs):
    partitions = {}
    for addr in addrs:
        if isinstance(addr, int):
            partition_id = calc_partition_id(addr)
        elif isinstance(addr, list):
            partition_id = calc_partition_id(addr[0])
        else:
            raise ValueError('partition id list error')
        append_to_dict(partitions, partition_id, addr)
    return partitions


def do_sharding(msg, partition_num):
    import copy
    route_spec = msg['shard']
    if route_spec is None:
        return [msg]

    sharded_msg = {}
    route_type = route_spec['type']
    if route_type is None:
        return [msg]
    elif route_type == 'list':
        args = route_spec['arguments']
        list_type = args['type']
        list_addrs = args['addrs']
        if list_type in ('id_list', 'peer_list', 'conv_list'):
            shards = do_partition(list_addrs)
            for (k, v) in shards.items():
                m = msg.copy()
                m['shard']['arguments']['addrs'] = v
                sharded_msg[k] = [m]
            return sharded_msg
        else:
            raise ValueError('unknown list route')

    elif route_type == 'hash':
        landbridge_spec = settings.LANDBRIDGE_SPEC
        mod = landbridge_spec['cluster_size']
        for i in range(mod):
            m = copy.deepcopy(msg)
            m['shard']['arguments'] = {'mod': mod, 'index': i}
            queue_partition = partition_id2queue_partition_id(i)
            append_to_dict(sharded_msg, queue_partition, m)
        return sharded_msg
    else:
        raise ValueError("not support shard type now")


def append_to_dict(dictionary, k, v):
    acc = dictionary.get(k)
    if acc is None:
        dictionary[k] = [v]
    else:
        acc.append(v)
