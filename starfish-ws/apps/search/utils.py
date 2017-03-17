import logging
import re

from datetime import datetime

from apps.account.models import User
from apps.message.models import Message, UserConversation
from apps.org.models import Department, DiscussionGroup
from apps.search import index_key
from apps.search.serializers import (DepartmentIndexSerializer,
                                     DiscussionGroupIndexSerializer,
                                     MessageIndexSerializer,
                                     OrgMemberIndexSerializer)
from common import AutoRegistryBase, Singleton
from common.const import Const, ErrorCode
from common.exceptions import APIError
from common.utils import TargetObject, Timer, shard_id
from django.conf import settings
from elasticsearch import Elasticsearch

log = logging.getLogger(__name__)


class _IndexWorker(AutoRegistryBase):
    model = None
    serializer = None

    @classmethod
    def regist_keys(cls):
        return cls.model

    def db(self, org_id):
        return shard_id(org_id)

    def validate_obj(self, obj):
        return obj is not None

    def validate_data(self, data):
        return bool(data)

    def get_obj(self, pk, org_id, extra=None):
        if self.model == Message:
            return self._build_message_obj(pk, org_id, extra)

        return self.model.objects.using(self.db(org_id)).get_or_none(id=pk)

    def _build_message_obj(self, pk, org_id, extra):
        kwargs = {
            'create_time': datetime.fromtimestamp(extra['created_at']),
            'update_time': datetime.fromtimestamp(extra['created_at']),
        }
        for key in ('id', 'src_id', 'src_type', 'dest_type', 'dest_id', 'type'):
            kwargs[key] = extra[key]

        message = Message(**kwargs)
        message._extra = extra
        message._update_org_id(extra['scope_org_id'])

        return message

    def get_data(self, obj, org_id):
        if self.validate_obj(obj):
            data = self.serializer(obj, index_org_id=org_id).data
            if self.validate_data(data):
                return data


class UserIndexWorker(_IndexWorker):
    model = User
    serializer = OrgMemberIndexSerializer

    def db(self, org_id):
        return shard_id(0)


class DiscussGroupIndexWorker(_IndexWorker):
    model = DiscussionGroup
    serializer = DiscussionGroupIndexSerializer

    def validate_obj(self, obj):
        return obj and not obj.is_disbanded

    def validate_data(self, data):
        return bool(data.get('users'))


class DepartmentIndexWorker(_IndexWorker):
    model = Department
    serializer = DepartmentIndexSerializer

    def validate_obj(self, obj):
        return obj and not obj.is_disbanded


class MessageIndexWorker(_IndexWorker):
    model = Message
    serializer = MessageIndexSerializer

    index_msg_types = (Message.TYPE_TEXT_CHAT_CREATED,
                       Message.TYPE_MULTIMEDIA_CHAT_CREATED,
                       Message.TYPE_APP_CONTENT_UPDATED)

    def validate_obj(self, obj):
        return obj and obj.type in self.index_msg_types

    def validate_data(self, data):
        return bool(data.get('users'))


class IndexObject(Timer, metaclass=Singleton):

    def __init__(self):
        self.es = Elasticsearch(settings.ELASTICSEARCH["hosts"])
        self.db_cost = 0
        self.es_cost = 0

    def bulk_create_index(self, queryset, org_id):
        try:
            model = queryset.model
            worker = _IndexWorker.registed(model)()
            serializer_obj = worker.serializer(queryset, many=True, index_org_id=org_id)

            _, cost = self.timer_run(serializer_obj.pre_fetch_cache, queryset, shard_id(org_id))
            self.db_cost += cost

            data_all, cost = self.timer_run(lambda s: s.data, serializer_obj)
            self.db_cost += cost

            bulk_list = []
            for data in data_all:
                if not worker.validate_data(data):
                    continue
                bulk_list.append(
                    {"index": {"_index": str(org_id), "_type": model.__name__, "_id": data["id"]}}
                )
                bulk_list.append(data)
            if bulk_list:
                self.es_cost += self.timer_run(self.es.bulk, bulk_list)[1]

        except Exception as e:
            log.error("create_index error, %s" % e)
            log.exception(e)

    def create_index(self, model, pk, org_id, extra=None):
        worker = _IndexWorker.registed(model)()
        obj, cost = self.timer_run(worker.get_obj, pk, org_id, extra)
        self.db_cost += cost
        return self.create_index_by_obj(obj, org_id, worker=worker)

    def create_index_by_obj(self, obj, org_id, worker=None):
        try:
            model = type(obj)
            worker = worker or _IndexWorker.registed(model)()
            data, cost = self.timer_run(worker.get_data, obj, org_id)
            # data = worker.get_data(obj)
            self.db_cost += cost
            if data is None:
                return

            model_name = model.__name__
            log.info('create_index: org_id: %s, model:%s, object_id:%s'
                     % (org_id, model_name, obj.id))

            self.es_cost += self.timer_run(self.es.index, str(org_id), model_name, data, obj.id)[1]
            # self.es.index(str(org_id), model_name, data, obj.id)
        except Exception as e:
            log.error("create_index error, %s, %s: %s, org: %s"
                      % (e, model.__name__, obj.id, org_id))
            log.exception(e)

    def delete_index(self, model, pk, org_id=0, extra=None):
        try:
            model_name = model.__name__
            log.info('delete_index: org_id: %s, model:%s, object_id:%s'
                     % (org_id, model_name, pk))
            self.es.delete(str(org_id), model_name, pk)
        except Exception as e:
            log.error("delete_index error, %s" % e)


class SearchType(Const):
    MESSAGE = 1

    CONTACT = 100
    ORG_MEMBER = 101
    DISCUSS_GROUP = 102
    DEPARTMENT = 103

    TASK = 200


class _SearchWorker(object):
    SEARCH_FIELDS = ('_all', )
    HIGHLIGHT_FIELDS = ()
    DOC_SEARCH_TYPE_MAP = {}

    def doc_types(self):
        if len(self.DOC_SEARCH_TYPE_MAP) > 1:
            return ','.join(self.DOC_SEARCH_TYPE_MAP.keys())
        elif len(self.DOC_SEARCH_TYPE_MAP) == 1:
            return list(self.DOC_SEARCH_TYPE_MAP.keys())[0]

    def prepare_filter(self, **kwargs):
        return {}

    def prepare_query(self, q, **kwargs):
        _query = {
            "filtered": {
                "query": {
                    "multi_match": {
                        "query": q,
                        "fields": list(self.SEARCH_FIELDS)
                    }
                },
                "filter": self.prepare_filter(**kwargs)
            }
        }
        return _query

    def sort_by(self, **kwargs):
        '''return sort (field_name, is_desc)'''
        return '_score', True

    def _source_dict(self, record, **kwargs):
        source = dict(record["_source"])
        for k in self.SEARCH_FIELDS:
            source.pop(k, None)
        return source
        # return dict(org_id=record["_index"], **source)

    def to_dict(self, record, **kwargs):
        content = []  # highlight content
        for k in self.HIGHLIGHT_FIELDS:
            content += record.get("highlight", {}).get(k, []) or [record["_source"][k]]

        data = dict(id=record["_id"],
                    type=self.DOC_SEARCH_TYPE_MAP.get(record["_type"]),
                    source=self._source_dict(record, **kwargs),
                    content=content
                    )
        return data


class MessageSearchWorker(_SearchWorker):
    SEARCH_FIELDS = ('content',)
    HIGHLIGHT_FIELDS = ('content',)
    DOC_SEARCH_TYPE_MAP = {
        'Message': SearchType.MESSAGE,
    }

    def _source_dict(self, record, **kwargs):
        source = super(MessageSearchWorker, self)._source_dict(record, **kwargs)
        if 'user' in kwargs:
            source.update(**source['users'][index_key(kwargs['user'])])
            source.pop('users')

        return TargetObject().update(shard_id(record["_index"]), **source)

    def prepare_filter(self, **kwargs):
        _filter = {}
        user_id = kwargs.get('user')
        if user_id:
            c_ids = kwargs.get('conversation')
            if c_ids:  # filter by conversation ids
                if isinstance(c_ids, int):
                    c_ids = [c_ids]

                if isinstance(c_ids, list):
                    _filter = {
                        "terms": {
                            "users.%s.conversation_id" % index_key(user_id): c_ids
                        }
                    }
            else:  # filter by user id
                _filter = {
                    "exists": {
                        "field": "users.%s.conversation_id" % index_key(user_id)
                    }
                }

        return _filter

    def sort_by(self, **kwargs):
        #  support sort by create_time desc
        if kwargs.get('time_order'):
            return 'create_timestamp', True
        else:
            return super(MessageSearchWorker, self).sort_by(**kwargs)


class ContactSearchWorker(_SearchWorker):
    SEARCH_FIELDS = ('name',)
    HIGHLIGHT_FIELDS = ('name',)
    DOC_SEARCH_TYPE_MAP = {
        'User': SearchType.ORG_MEMBER,
        'DiscussionGroup': SearchType.DISCUSS_GROUP,
        'Department': SearchType.DEPARTMENT,
    }

    def _source_dict(self, record, **kwargs):
        source = super(ContactSearchWorker, self)._source_dict(record, **kwargs)
        _type, _id, org_id = record["_type"], source['id'], record["_index"]

        info = TargetObject() \
            .obj_info(_type, _id, shard_id(org_id))

        return info

    def prepare_filter(self, **kwargs):
        _filter = {}
        user_id = kwargs.get('user')
        if user_id:
            _filter = {
                "bool": {
                    "should": [
                        {
                            "missing": {
                                "field": "users"
                            }
                        },
                        {
                            "term": {
                                "users": user_id
                            }
                        }
                    ]
                }
            }

        return _filter


class UserSearchWorker(ContactSearchWorker):
    DOC_SEARCH_TYPE_MAP = {
        'User': SearchType.ORG_MEMBER,
    }

    def _source_dict(self, record, **kwargs):
        if kwargs.get('is_detail'):
            _id, org_id = record["_source"]['id'], record["_index"]
            u = User.objects.getx(id=_id)
            if u:
                source = u.to_dict()
                source.update(User.build_summary_list(
                    [_id], org_id, _departments=True, _departments_info=True)[0])
                return source

        return super(UserSearchWorker, self)._source_dict(record, **kwargs)

    def prepare_filter(self, **kwargs):
        return {}


class DepartmentSearchWorker(ContactSearchWorker):
    DOC_SEARCH_TYPE_MAP = {
        'Department': SearchType.DEPARTMENT,
    }

    def _source_dict(self, record, **kwargs):
        if kwargs.get('is_detail'):
            _id, org_id = record["_source"]['id'], record["_index"]
            d = Department.objects.using(org_id).getx(id=_id)
            if d:
                return d.to_dict()

        return super(DepartmentSearchWorker, self)._source_dict(record, **kwargs)


class DiscussionGroupSearchWorker(ContactSearchWorker):
    DOC_SEARCH_TYPE_MAP = {
        'DiscussionGroup': SearchType.DISCUSS_GROUP,
    }


class SearchObject(object, metaclass=Singleton):

    SEARCH_WORKER = {
        SearchType.MESSAGE: MessageSearchWorker(),
        SearchType.CONTACT: ContactSearchWorker(),
        SearchType.ORG_MEMBER: UserSearchWorker(),
        SearchType.DEPARTMENT: DepartmentSearchWorker(),
        SearchType.DISCUSS_GROUP: DiscussionGroupSearchWorker(),
    }

    def __init__(self):
        self.es = Elasticsearch(settings.ELASTICSEARCH["hosts"])
        self.regex = re.compile(r"[^a-zA-Z0-9\u4e00-\u9fff]+")

    def _normalize_q(self, q):
        if q:
            return self.regex.sub(' ', q).strip()

    def format_body(self, raw_q, search_type, **kwargs):
        body = dict()
        q = self._normalize_q(raw_q)
        if not q:
            raise APIError(ErrorCode.SEARCH_KEYWORD_ERROR, q=raw_q)

        worker = self.get_worker(search_type)
        body["query"] = worker.prepare_query(q, **kwargs)

        page, count = kwargs.get('page', 1), kwargs.get('count', 10)
        body['from'] = (page - 1) * count
        body['size'] = count

        sort_field, is_desc = worker.sort_by(**kwargs)
        body['sort'] = {
            sort_field: {
                "order": "desc" if is_desc else 'asc'
            }
        }
        return body

    def highlight_body(self, body, search_type, **kwargs):
        highlight = kwargs.get('highlight', 0)
        tags = settings.SEARCH_HIGHLIGHT_TAGS.get(highlight)
        if tags is None:
            raise APIError(ErrorCode.INVALID_QUERY_STRING, highlight=highlight)

        worker = self.get_worker(search_type)
        body["highlight"] = {
            "pre_tags": tags[0],
            "post_tags": tags[1],
            "fields": {f: {} for f in worker.HIGHLIGHT_FIELDS}
        }
        return body

    def get_worker(self, search_type):
        _worker = self.SEARCH_WORKER.get(search_type)
        if _worker is None:
            raise APIError(ErrorCode.INVALID_SEARCH_TYPE)
        return _worker

    def search(self, q, org_id, search_type, **kwargs):
        '''
        page: use page to pagination default=1
        count: limit the number of results to ''count''
        user: the request user id which should in users of search list
        '''
        body = self.format_body(q, search_type, **kwargs)
        body = self.highlight_body(body, search_type, **kwargs)

        worker = self.get_worker(search_type)
        doc_type = worker.doc_types()

        log.info('_search: org_id: %s, doc_type: %s, body=%s'
                 % (org_id, doc_type, body))

        raw_results = self.es.search(body=body, index=str(org_id), doc_type=doc_type)
        results = []
        if raw_results is not None:
            for record in raw_results["hits"]["hits"]:
                data = worker.to_dict(record, **kwargs)
                results.append(data)
        return {"data": results, "total": raw_results["hits"]["total"]}

    def aggregate_msg_conversations(self, q, org_id, **kwargs):
        '''
        user: the request user id which should in users of search list
        '''
        search_type = SearchType.MESSAGE
        user_id = kwargs['user']

        body = self.format_body(q, search_type, **kwargs)
        body["size"] = 0
        body["aggregations"] =\
            {
            "all_conversations": {
                "terms": {
                    "field": "users.%s.conversation_id" % index_key(user_id),
                    "size": 0
                }
            }
        }
        worker = self.get_worker(search_type)
        doc_type = worker.doc_types()
        log.info('_aggregation: org_id: %s, doc_type: %s, body=%s, user:%s'
                 % (org_id, doc_type, body, user_id))

        results = []
        raw_results = self.es.search(body=body, index=str(org_id), doc_type=doc_type)
        if raw_results is not None:
            _sorted_ids = []
            _data = {}

            # aggregate results
            for record in raw_results["aggregations"]["all_conversations"]["buckets"]:
                _data[record['key']] = dict(conversation_id=record['key'],
                                            count=record['doc_count'])
                _sorted_ids.append(record['key'])

            # fetch message info for conversations that count is 1
            to_be_fetchs = [k for k, v in _data.items() if v['count'] == 1]
            if to_be_fetchs:
                res = self.search(q, org_id, search_type,
                                  user=user_id, conversation=to_be_fetchs,
                                  page=1, count=len(to_be_fetchs),
                                  highlight=kwargs.get('highlight', 0))
                for r in res['data']:
                    _data[r['source']['conversation_id']]\
                        .update(content=r['content'], **r['source'])

            print('_data=%s' % _data)
            # get peer_type & peer_id from db
            conversations = UserConversation.find_by_user(org_id, user_id)
            for c in conversations:
                _id, peer_type, peer_id = c['id'], c['peer_type'], c['peer']['id']
                if _id not in _data:
                    continue

                _data[_id].update(peer_type=peer_type, peer_id=peer_id)

            # finalize results
            for i in _sorted_ids:
                results.append(TargetObject().update(shard_id(org_id), **_data[i]))

        return {"data": results, "total": raw_results["hits"]["total"]}
