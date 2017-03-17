from utils import MaxwellEndpoint
from lifebookv2 import Lifebook, LifebookError
from maxwell import Sender
import logging
from django.conf import settings
from common import Singleton

log = logging.getLogger(__name__)


def get_maxwell_master_id(user_id):
    if not user_id:
        return None

    from apps.account.models import UserMaxwellEndpoint
    return UserMaxwellEndpoint.find(user_id)


def reset_all_maxwell_link():
    MaxwellEndpointUtil._instances.clear()
    LifebookUtil()._instances.clear()
    MaxwellSenderUtil()._instances.clear()


class MaxwellEndpointUtil(object):
    CACHE_INFO = False
    _instances = {}  # key: value = master_node_id: endpoints

    @classmethod
    def get_all(cls, master_node_id=None, user_id=0):
        if user_id is None or user_id < 0:
            user_id = 0
        if master_node_id is None:
            master_node_id = settings.CURRENT_MAXWELL_MASTER

        if not cls.CACHE_INFO or (master_node_id not in cls._instances):
            try:
                cls._instances[master_node_id] = \
                    MaxwellEndpoint.endpoints(user_id, master_node_id)
            except Exception as e:
                log.error('maxwell endpoint error: %s, user_id: %s, master_node_id: %s'
                          % (e, user_id, master_node_id))
                raise e

        return cls._instances[master_node_id]

    @classmethod
    def get(cls, name, master_node_id=None, user_id=0):
        return cls.get_all(master_node_id, user_id).get(name)


class LifebookUtil(object, metaclass=Singleton):
    @classmethod
    def instance(cls, user_id=0, endpoint=None, master_node_id=None, key='lifebook_cmd'):
        if not endpoint:
            endpoint = MaxwellEndpointUtil.get(key, master_node_id, user_id)

        return cls().get_instance(endpoint)

    class LifebookCap(object):
        def __init__(self, lifebook):
            self.__lifebook = lifebook

        def __getattr__(self, name):
            def f(*args, **kwargs):
                try:
                    method = getattr(self.__lifebook, name)
                    return method(*args, **kwargs)
                except Exception as e:
                    log.warning('Lifebook error, %s, reset maxwell link: %s' % (name, e))
                    reset_all_maxwell_link()
            return f

    def __init__(self):
        self._instances = {}  # key: value = endpoint: instance

    def get_instance(self, endpoint):
        if endpoint not in self._instances:
            self._instances[endpoint] = self.LifebookCap(Lifebook(endpoint))

        return self._instances[endpoint]

    def __del__(self):
        for i in self._instances.values():
            i.dispose()


class MaxwellSenderUtil(object, metaclass=Singleton):
    def __init__(self):
        self._instances = {}  # key: value = endpoint: instance

    def get_instance(self, endpoint):
        if endpoint not in self._instances:
            self._instances[endpoint] = Sender(endpoint)

        return self._instances[endpoint]

    def __del__(self):
        for i in self._instances.values():
            pass   # maybe release resource

    @classmethod
    def send(cls, **kwargs):
        targets = {}

        for user_id in kwargs.pop('user_ids'):
            maxwell_id = get_maxwell_master_id(user_id)
            if maxwell_id not in targets:
                targets[maxwell_id] = []
            targets[maxwell_id].append(user_id)

        for maxwell_id, user_ids in targets.items():
            if maxwell_id != settings.CURRENT_MAXWELL_MASTER:
                log.info('send to %s, by user_ids: %s' % (maxwell_id, user_ids))

            endpoint = MaxwellEndpointUtil.get('maxwell_backend', maxwell_id)
            cls().get_instance(endpoint).send(user_ids=user_ids, **kwargs)
