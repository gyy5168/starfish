import json
import struct

import lifebookv2

from django.contrib.sessions.backends.base import SessionBase

from lifebookv2 import LifebookError

from common.maxwell_utils import MaxwellEndpointUtil, LifebookUtil, get_maxwell_master_id
from common.utils import current_timestamp, parse_endpoint

import logging
log = logging.getLogger(__name__)


class SessionStore(SessionBase):
    SESSION_AGE = 600

    def __init__(self, user_id=0, session_key=None):
        super(SessionStore, self).__init__(session_key)

        self._user_id = user_id

        self._is_authorized = False
        self._immutable_value = None
        self._action = lifebookv2.lifebook_protocol_commander_pb2.NONE_ACT
        self._endpoints = None
        self._store = None
        self._create_session_response = {'is_active': False}

        # gen session key
        self._get_or_create_session_key()

    def _get_is_authorized(self):
        if self._is_authorized:
            return True

        self._is_authorized = bool(self.load())

        return self._is_authorized

    is_authorized = property(_get_is_authorized)

    def _get_user_id(self):
        return self._user_id

    user_id = property(_get_user_id)

    def _get_store(self):
        if not self._store:
            self._store = LifebookUtil.instance(user_id=self.user_id,
                                                master_node_id=get_maxwell_master_id(self.user_id))
            log.info('session_store_init: %s, %s'
                     % (self.user_id, get_maxwell_master_id(self.user_id))
                     )

        return self._store

    store = property(_get_store)

    def _get_endpoints(self):
        if not self._endpoints:
            self._endpoints = MaxwellEndpointUtil.get_all(get_maxwell_master_id(self.user_id),
                                                          self.user_id)

        return self._endpoints

    endpoints = property(_get_endpoints)

    def _get_create_session_response(self):
        return self._create_session_response

    create_session_response = property(_get_create_session_response)

    def load(self):
        if not self.user_id:
            return {}

        try:
            _agent_key, session_data, self._immutable_value = \
                self.store.find_session(self.user_id, self.session_key)
        except Exception:
            session_data = None

        if not self._immutable_value:
            self._immutable_value = self._build_immutable_value()

        if session_data:
            return self.decode(session_data)

        return {}

    def set_user_id(self, user_id):
        self._user_id = user_id
        self._store = None
        self._endpoints = None
        return self

    def set_session_key(self, session_key):
        self._session_key = session_key
        return self

    def set_agent_key(self, agent_key):
        self._agent_key = agent_key
        return self

    def save(self, must_create=False):
        try:
            v = self.store.replace_session_with_action(
                self.user_id,
                self.session_key,
                self.encode(self._get_session(no_load=must_create)),
                self._immutable_value,
                self._agent_key,
                current_timestamp() + self.SESSION_AGE,
                self._action
            )
            if v:
                v['is_active'] = bool(struct.unpack('B', v['is_active'].encode('utf8'))[0])
                self._create_session_response = v
        except Exception as e:
            log.exception(e)
            raise e

    def exists(self, session_key):
        if not self.user_id:
            return False

        _, value, _ = self.store.find_session(self.user_id, session_key)
        return bool(value)

    def delete(self, session_key=None):
        if session_key is None:
            if self._session_key is None:
                return
            session_key = self._session_key

        self.store.delete_session(self.user_id, session_key)

    def encode(self, session_dict):
        return json.dumps(session_dict)

    def decode(self, session_data):
        return json.loads(session_data)

    def replace_agent(self, user_id, agent_key, type_, desc, expired_at):
        self.store.replace_agent(
            user_id, agent_key, type_, desc, expired_at)
        return agent_key

    def find_sessions_by_user(self, user_id):
        try:
            return self.store.find_sessions_by_user(int(user_id))
        except LifebookError as e:
            if e.message == 'no_such_user':
                return None
            else:
                raise

    def _build_immutable_value(self):
        endpoint1 = self.endpoints['maxwell_frontend_pub']
        _, host1, port1 = parse_endpoint(endpoint1)

        endpoint2 = self.endpoints['maxwell_frontend_recv']
        _, host2, port2 = parse_endpoint(endpoint2)

        return '%s:%s:%s' % (host2, port1, port2)

    @classmethod
    def clear_expired(cls):
        pass
