from django.core.cache import cache as memcache

import logging
from django.db.models import ForeignKey
from common import Singleton
from common.utils import current_timestamp

log = logging.getLogger(__name__)


class GlobalCacheSettings(object):
    prefix = 0


class BaseModelCache(object):
    '''
    Cache Key COMPOSITIONS:
        field_names = FORMAT_FIELDS_PREFIX-field1-field2-field3...(sorted)
        field_values = values-value2-value3...
        key = '%s_%s_%s_%s' % (db_alias, model_name, field_names, field_values)
        Example:
            FORMAT_FIELDS_PREFIX = 'getx'
              egA:
                query: Org.objects.getx(id=1)
                key: default_Org_getx-id_1
              egB:
                query: WorkMail.objects.using(1).getx(local_part='quyilin', is_set=1)
                key: starfish-org-1_WorkMail_getx-is_set-local_part_1-quyilin
    Cache logic:
        1. When query only by primary key,
         it will save main 'PK-CACHE' which value is a model instance with timestamp.
        2. Other queries will save two caches,
         one is main 'PK-CACHE',
         another is the index cache which values is timestamp and primary key.
        3. See example above,
            egA:
              key: default_Org_getx-id_1
              value: <Org object pk:1 with timestamp>
            egB:
              key: starfish-org-1_WorkMail_getx-id_9
              value: <WorkMail object pk:9 with timestamp>
              key: starfish-org-1_WorkMail_getx-is_set-local_part_1-quyilin
              value: timestamp and 9
        4. So each instance only has one copy of cache in 'PK-CACHE',
         other caches are the indexes of the 'PK-CACHE'.
        5. When object is updated/deleted, 'PK-CACHE' will be cleaned.
        6. When use an index cache, timestamp will be checked,
         index cache will be abandoned if 'PK-CACHE' is newer than index cache.
    '''
    FORMAT_FIELDS_PREFIX = 'getx'
    CACHE_TIMESTAMP_NAME = '_cache_timestamp'
    model = None

    def __init__(self):
        assert self.model, 'class %s model should not be None' % self.__class__.__name__
        self.timestamp = current_timestamp()
        self.model_fields = self._init_model_fields()
        self.pk_name = 'id'
        self.pk_fields = set(['id', 'pk', 'id__exact', 'pk__exact'])

    def __set_cache(self, key, val):
        # print('--%s_set_cache--' % self.__class__.__name__, key, val, self.cache_timeout)
        if isinstance(val, self.model):
            setattr(val, self.CACHE_TIMESTAMP_NAME, self.timestamp)
        memcache.set(key, val, self.cache_timeout)

    def __get_cache(self, key):
        return memcache.get(key)

    def __delete_cache(self, key):
        # print('--%s_delete_cache--' % self.__class__.__name__, key)
        return memcache.delete(key)

    def _init_model_fields(self):
        fs = {}
        for f in self.model._meta.local_fields:
            fs[f.name] = f
            if f.attname != f.name:
                fs[f.attname] = f
        return fs

    def _handle_kwargs(self, **kwargs):
        '''
        Only query by model's local fields will be cached, like:
            Org.objects.getx(name='bitbrothers') or Org.objects.getx(creator=1)
        cache ignores the query across related model, like:
            Org.objects.get(domains__name='starfish.im')
        because it has problem when related model OrgDomain has changed,
        'PK-CACHE' of Org model is still valid, but 'domains__name' cache of Org should be invalid.
        this make the current cache logic impossible to handle.
        '''
        _kwargs = {}

        for k, v in kwargs.items():
            if k in self.pk_fields:
                _kwargs[self.pk_name] = v
            else:
                f = self.model_fields.get(k)
                if f is None:
                    _kwargs = {}
                    break

                if isinstance(f, ForeignKey) and isinstance(v, f.rel.to):
                    _kwargs[f.attname] = v.pk
                else:
                    _kwargs[f.attname] = v

        return _kwargs

    #  @TODO: cache key could be hash value.
    def _format_key(self, _db_name, **kwargs):
        # TODO hash
        keys, values = [], []
        for k, v in sorted(kwargs.items()):
            keys.append(k)
            values.append(str(v).replace(' ', '*'))
        field_names = '%s-%s' % (self.FORMAT_FIELDS_PREFIX, '-'.join(keys))
        field_values = '-'.join(values)
        cache_key = '%s_%s_%s_%s' % (_db_name, self.model.__name__, field_names, field_values)
        return cache_key

    @property
    def cache_timeout(self):
        if self.model._CACHE_TIMEOUT == 0:
            raise RuntimeError('no cache timeout for model %s' % self.model.__name__)
        if self.model._CACHE_TIMEOUT is None:
            return memcache.default_timeout
        else:
            return self.model._CACHE_TIMEOUT

    def use(self, timestamp=None):
        self.timestamp = timestamp or current_timestamp()
        return self

    def use_cache(self, db_name, query_params, default_handler):
        '''
        default_handler should take two input parameters as:
        def default_handler(db_name, query_params): pass
        '''
        obj = None
        _kwargs = self._handle_kwargs(**query_params)

        if len(_kwargs) == 0:
            obj = default_handler(db_name, query_params)
        else:
            cache_key = self._format_key(db_name, **_kwargs)

            if len(_kwargs) == 1 and self.pk_name in _kwargs:
                obj = self.__get_cache(cache_key)
                if obj is None:
                    obj = default_handler(db_name, _kwargs)
                    if obj:
                        self.__set_cache(cache_key, obj)
            else:
                val = self.__get_cache(cache_key)
                if val is not None:
                    pk_timestamp, obj_id = tuple(int(i) for i in val.split('_'))
                    obj = self.use_cache(db_name, {self.pk_name: obj_id}, default_handler)
                    if getattr(obj, self.CACHE_TIMESTAMP_NAME, self.timestamp) > pk_timestamp:
                        self.__delete_cache(cache_key)
                        obj = None

                if obj is None:
                    obj = default_handler(db_name, _kwargs)
                    if obj:
                        self.__set_cache(cache_key, '%s_%s' % (self.timestamp, obj.pk))
                        self.__set_cache(self._format_key(db_name, **{self.pk_name: obj.pk}), obj)

        return obj

    def clean_cache(self, db_name, *object_id_list):
        for object_id in object_id_list:
            self.__delete_cache(self._format_key(db_name, **{self.pk_name: object_id}))


class ModelCache(object):
    all_cache_instances = {}

    @classmethod
    def find(cls, model):
        if hasattr(model, 'has_cache') and model.has_cache():
            _cache = cls.all_cache_instances.get(model)
            if not _cache:
                _cache_class = Singleton(
                    '%sCache' % model.__name__,
                    (BaseModelCache,),
                    dict(model=model)
                )
                _cache = _cache_class()
                cls.all_cache_instances[model] = _cache

            return _cache.use()
