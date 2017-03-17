#!/usr/bin/env python
import os

os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES

import signal
import time
import maxwell
import utils

from apps.account.models import (UserAgent, UserRememberToken, TokenSerial)
from apps.message.models import Message
from apps.misc.models import OfflineTask

from common.maxwell_utils import LifebookUtil
from common.maxwell_utils import get_maxwell_master_id
from common.message_queue import SystemMessage


from log import config_logging
config_logging(filename='/mnt1/logs/starfish-async-set-offline.log')

import logging
log = logging.getLogger(__name__)


class Main(object):
    WAIT_BEFORE_FORCE_OFFLINE = 3

    def __init__(self, *args, **kwargs):
        self.maxwell_id2lifebook = {}

    def run(self):
        while True:
            self._run0()
            time.sleep(1)

    def get_lifebook_for(self, user_id):
        master_id = get_maxwell_master_id(user_id)
        lifebook = self.maxwell_id2lifebook.get(master_id)
        if lifebook is None:
            lifebook = LifebookUtil.instance(user_id=user_id,
                                             master_node_id=master_id)
            self.maxwell_id2lifebook[master_id] = lifebook
            return lifebook
        else:
            return lifebook

    def _run0(self):
        for t in OfflineTask.objects.all():
            self._process_task(t)

    def _process_task(self, t):
        method_name = {
            OfflineTask.PASSWORD_CHANGED: '_process_password_changed_task_step%s',
            OfflineTask.OFFLINE_AGENT: '_process_offline_agent_task_step%s',
            OfflineTask.REMOVE_AGENT: '_process_remove_agent_task_step%s',
        }[t.type] % t.step

        if t.step == 1:
            getattr(self, method_name)(t.task['user_id'], t)
            t.step = 2
            t.save()
        else:
            if t.date_created + self.WAIT_BEFORE_FORCE_OFFLINE > time.time():
                return

            getattr(self, method_name)(t.task['user_id'], t)
            t.delete()

    def _process_password_changed_task_step1(self, user_id, t):
        body = {
            'user': user_id,
        }
        SystemMessage(Message.TYPE_USER_SELF_PASSWORD_CHANGED, body).send(
            dest_id=user_id
        )

    def _process_password_changed_task_step2(self, user_id, t):
        for agent in self.get_lifebook_for(user_id).find_agents_by_user(user_id):
            if agent.key == t.task['current_agent_key']:
                continue

            self._offline_agent(user_id, agent.key)

    def _process_offline_agent_task_step1(self, user_id, t):
        body = {
            'message': t.task['message'],
            'agent': self._find_agent(user_id, t.task['agent_key'])
        }
        SystemMessage(Message.TYPE_USER_GOT_OFFLINE, body).send(
            dest_id=user_id
        )

    def _process_offline_agent_task_step2(self, user_id, t):
        self._offline_agent(user_id, t.task['agent_key'])

    def _process_remove_agent_task_step1(self, user_id, t):
        body = {
            'message': t.task['message'],
            'agent': self._find_agent(user_id, t.task['agent_key'])
        }
        SystemMessage(Message.TYPE_USER_GOT_OFFLINE, body).send(
            dest_id=user_id
        )

    def _process_remove_agent_task_step2(self, user_id, t):
        self._remove_agent(user_id, t.task['agent_key'])

    def _find_agent(self, user_id, agent_key):
        lifebook = self.get_lifebook_for(user_id)
        agent = lifebook.find_agent(user_id, agent_key)
        if not agent:
            return None

        return {
            'key': agent_key,
            'type': agent.type,
            'desc': agent.desc.decode('utf8'),
        }

    def _offline_agent(self, user_id, agent_key):
        log.info('set agent offline: %s:%s', user_id, agent_key)

        self._remove_rem_tokens(user_id, agent_key)

        lifebook = self.get_lifebook_for(user_id)
        r = lifebook.find_session_by_agent(user_id, agent_key)
        if r:
            lifebook.delete_session(user_id, r.key)

    def _remove_agent(self, user_id, agent_key):
        log.info('remove agent: %s:%s', user_id, agent_key)

        self._remove_rem_tokens(user_id, agent_key)

        UserAgent.objects.filter(user_id=user_id, agent_key=agent_key).delete()

        lifebook = self.get_lifebook_for(user_id)
        r = lifebook.find_session_by_agent(user_id, agent_key)
        if r:
            lifebook.delete_session(user_id, r.key)

        lifebook.delete_agent(user_id, agent_key)

    def _remove_rem_tokens(self, user_id, agent_key):
        serials = TokenSerial.objects \
            .filter(user_id=user_id) \
            .values_list('id', flat=True)
        if serials:
            UserRememberToken.objects \
                .filter(serial__in=serials) \
                .filter(agent_key=agent_key) \
                .delete()

    def _agent_ids_per_users(self, user_id, agent_keys):
        return [
            maxwell.maxwell_protocol_sender_receiver_structs_pb2.agent_ids_per_user_t(
                user_id=user_id, agent_keys=agent_keys)
        ]


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    utils.register_to_zk_or_wait(__file__, settings.ZK_HOSTS)

    Main().run()
