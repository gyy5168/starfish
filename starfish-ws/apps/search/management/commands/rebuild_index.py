import time
import json
import requests

from django.core.management import BaseCommand
from django.db import connections
from apps.account.models import User
from apps.message.models import Message
from apps.org.models import UserOrg, DiscussionGroup, Department
from apps.search.utils import SearchType, MessageIndexWorker, IndexObject
from common.utils import shard_id, all_orgs
from django.conf import settings

from log import config_logging
config_logging(filename='/mnt1/logs/starfish-rebuild-index.log')

import logging
log = logging.getLogger(__name__)

logging.getLogger("elasticsearch").setLevel(logging.ERROR)
logging.getLogger("urllib3.util.retry").setLevel(logging.ERROR)
logging.getLogger("urllib3.connectionpool").setLevel(logging.ERROR)


class Command(BaseCommand):
    MESSAGE_STEP_COUNT = 5000

    def add_arguments(self, parser):
        parser.add_argument('org', nargs=1, type=int)
        parser.add_argument('type', nargs=1, type=int)

    def build_index(self, model, pk, org_id, extra=None):
        self.indexer.create_index(model, pk, org_id, extra)
        log.info('build_index: model: %s, pk: %s, org_id: %s, cost: %s'
                 % (model.__name__, pk, org_id, self.indexer.timer_catch(org_id)))

    def _args(self, options):
        org_id = options['org'][0]
        search_type = options['type'][0]
        thread_count = 2
        limit = None
        step = self.MESSAGE_STEP_COUNT
        delete = 1
        mapping = 0
        if org_id is None or search_type is None:
            print('org, type is necessary!\n'
                  'ARGS: \n'
                  'org=0 (0 for all), \n'
                  'type=0 (1:MESSAGE, 100:CONTACT, 101:USER, \n'
                  '102:DISCUSS_GROUP, 103:DEPARTMENT, 0:all), \n'
                  'threads=1 (thread pool count, default 1),\n'
                  'limit=0 (index limit to recent messages count),\n'
                  'step=5000 (execute count per thread),\n'
                  'delete=1 (delete index & type before rebuild),\n'
                  'mapping=0 (put mapping before rebuild)\n')
        return org_id, search_type, thread_count, limit, step, delete, mapping

    def set_mapping(self, org_id, doc_type, add_users=False):
        properties = {
            "id": {
                "type": "long"
            },
            "name": {
                "type": "string",
                "analyzer": "standard"
            }
        }
        if add_users:
            properties['users'] = {'type': 'string', 'index': 'not_analyzed'}

        body = {
            doc_type: {
                "properties": properties
            }
        }
        try:
            self.es.indices.delete_mapping(index=str(org_id), doc_type=doc_type)
            self.es.indices.put_mapping(doc_type, body, index=str(org_id))
        except Exception as e:
            log.error('set_mapping, error: org:%s, doc_type:%s, %s' % (org_id, doc_type, e))

    def delete_index_type(self, org_id, doc_type):
        try:
            q = {'query': {'match_all': {}}}
            self.es.delete_by_query(str(org_id), doc_type, body=q)
        except Exception as e:
            log.error('delete_index_type, error: org:%s, doc_type:%s, %s' % (org_id, doc_type, e))

    def _fetch_messages(self, org_id, shard, start, ps=1000):
        url = '{prefix}/v1/orgs/{org_id}/messages?start={start}&ps={ps}'.format(
            prefix=settings.LANDBRIDGE_SPEC['shard'][shard]['rest_url'],
            org_id=org_id,
            start=start,
            ps=ps,
        )
        return json.loads(requests.get(url).content.decode('utf8'))

    def handle(self, *args, **options):
        org_id, search_type, thread_count, limit, step, delete, mapping = self._args(options)
        if org_id is None or search_type is None:
            return

        self.indexer = IndexObject()
        self.es = self.indexer.es

        orgs = all_orgs().order_by('id')
        if org_id:
            orgs = orgs.filter(id=org_id)

        for org_id in orgs.values_list('id', flat=True):
            self.indexer.timer_start(org_id)
            log.info('rebuild-index START for org: %s' % org_id)

            # MESSAGE
            if search_type == SearchType.MESSAGE or search_type == 0:
                for shard in settings.LANDBRIDGE_SPEC['shard']:
                    start = 0
                    while True:
                        messages = self._fetch_messages(org_id, shard, start)
                        if not messages:
                            break

                        for msg in messages:
                            start = max(start, msg['id'])

                            if msg['type'] not in MessageIndexWorker.index_msg_types:
                                continue

                            self.build_index(Message, msg['id'], org_id, msg)

            #  CONTACT
            if search_type in [0, SearchType.CONTACT, SearchType.ORG_MEMBER]:
                if delete:
                    self.delete_index_type(org_id, 'User')
                if mapping:
                    self.set_mapping(org_id, 'User')
                objs = UserOrg.objects.filter(org_id=org_id, is_left=0)
                for pk in objs.values_list('user_id', flat=True):
                    self.build_index(User, pk, org_id)

            if search_type in [0, SearchType.CONTACT, SearchType.DISCUSS_GROUP]:
                if delete:
                    self.delete_index_type(org_id, 'DiscussionGroup')
                if mapping:
                    self.set_mapping(org_id, 'DiscussionGroup', add_users=True)
                objs = DiscussionGroup.objects.using(org_id).filter(is_disbanded=0)
                for pk in objs.values_list('id', flat=True):
                    self.build_index(DiscussionGroup, pk, org_id)

            if search_type in [0, SearchType.CONTACT, SearchType.DEPARTMENT]:
                if delete:
                    self.delete_index_type(org_id, 'Department')
                if mapping:
                    self.set_mapping(org_id, 'Department')
                objs = Department.objects.using(org_id).filter(is_disbanded=0)
                for pk in objs.values_list('id', flat=True):
                    self.build_index(Department, pk, org_id)

            log.info('rebuild-index FINISH for org: %s, cost: %s, db_cost: %s s, es_cost: %s s'
                     % (org_id,
                        self.indexer.timer_stop(org_id),
                        self.indexer.db_cost,
                        self.indexer.es_cost))

            connections[shard_id(org_id)].close()
            time.sleep(1)
