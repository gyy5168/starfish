import logging
import os
import uuid

from datetime import datetime
from random import randint
from django.db import models
from django.db.models import fields, CharField, DateTimeField, PositiveSmallIntegerField
from django.core import exceptions
from django.core.files.base import ContentFile
from django.db.models.signals import post_delete, post_save, pre_save, pre_delete
from django.dispatch import Signal, receiver
from django.forms.models import model_to_dict
from django.db.models.expressions import BaseExpression

from jsonfield import JSONCharField
from common.cache import ModelCache
from common.const import ErrorCode
from common.exceptions import APIError
from common.utils import shard_id, setattr_if_changed

log = logging.getLogger(__name__)

pre_update = Signal(providing_args=["queryset", "using", "update_fields"])


@receiver(pre_save)
def check_char_fields_length_before_save(sender, instance, **kwargs):
    for f in sender._meta.local_fields:
        if isinstance(f, CharField):
            if isinstance(f, JSONCharField):
                val = f.value_to_string(instance)
            else:
                val = getattr(instance, f.attname, None)
            if isinstance(val, str) and len(val) > f.max_length:
                raise APIError(ErrorCode.STRING_LENGTH_EXCEED_LIMIT,
                               model=sender.__name__, field=f.attname,
                               limit=f.max_length, length=len(val), text=val)


@receiver(pre_update)
def clean_cache_for_object_updated(sender, queryset, **kwargs):
    model_cache = ModelCache.find(sender)
    if model_cache:
        model_cache.clean_cache(
            kwargs['using'],
            *list(queryset.values_list('id', flat=True))
        )


@receiver([post_delete, post_save])
def clean_cache_for_object_saved_or_deleted(sender, instance, **kwargs):
    if kwargs['signal'] == post_save and kwargs['created']:
        return

    model_cache = ModelCache.find(sender)
    if model_cache:
        model_cache.clean_cache(kwargs['using'], instance.id)


class PositiveBigIntegerField(fields.IntegerField):

    def db_type(self, connection):
        if connection.vendor == 'mysql':
            return "bigint"
        elif connection.vendor == 'oracle':
            return "NUMBER(19)"
        elif connection.vendor == 'postgresql':
            return "bigint"
        elif connection.vendor == 'sqlite':
            return "integer"
        else:
            raise NotImplemented

    def get_internal_type(self):
        return "BigIntegerField"

    def to_python(self, value):
        if value is None:
            return value
        try:
            return int(value)
        except (TypeError, ValueError):
            raise exceptions.ValidationError("This value must be a long integer.")


class BigAutoField(fields.AutoField):

    def db_type(self, connection):
        if connection.vendor == 'mysql':
            return "bigint AUTO_INCREMENT"
        elif connection.vendor == 'oracle':
            return "NUMBER(19)"
        elif connection.vendor == 'postgresql':
            return "bigserial"
        elif connection.vendor == 'sqlite':
            return "integer"
        else:
            raise NotImplemented

    def get_internal_type(self):
        return "BigAutoField"

    def to_python(self, value):
        if value is None:
            return value
        try:
            return int(value)
        except (TypeError, ValueError):
            raise exceptions.ValidationError("This value must be a long integer.")


class SimpleBaseQuerySet(models.query.QuerySet):
    def get_or_none(self, **kwargs):
        try:
            return self.get(**kwargs)
        except (self.model.DoesNotExist, self.model.MultipleObjectsReturned):
            return None

    def update(self, **kwargs):
        pre_update.send(sender=self.model, queryset=self, using=self._db, update_fields=kwargs)
        return super(SimpleBaseQuerySet, self).update(**kwargs)

    def getx(self, **kwargs):
        model_cache = ModelCache.find(self.model)
        if model_cache:
            return model_cache.use_cache(
                self.db,
                kwargs,
                lambda _db, _args: self.get_or_none(**kwargs)
            )
        else:
            return self.get_or_none(**kwargs)


class SF(BaseExpression):
    '''String compose expression'''
    def __init__(self, field, prefix='', postfix=''):
        self.field = field
        self.prefix = prefix
        self.postfix = postfix
        super(SF, self).__init__()

    def evaluate(self, evaluator, qn, connection):
        '''
        column_name = prefix||column_name||postfix
        '''
        s = [self.field]
        args = []
        if self.prefix:
            s.insert(0, '%s')
            args.append(self.prefix)
        if self.postfix:
            s.append('%s')
            args.append(self.postfix)

        return '||'.join(s), tuple(args)


class BaseQuerySet(SimpleBaseQuerySet):
    def __fake_postfix(self):
        from common.globals import get_current_user_id
        return '/-%s-%s-/' % (get_current_user_id(), datetime.now().strftime('%y%m%d%H%M%S'))

    def update(self, *args, **kwargs):
        if 'update_time' not in kwargs:
            kwargs['update_time'] = datetime.now()
        return super(BaseQuerySet, self).update(*args, **kwargs)

    def delete(self, force=False):
        if force:
            return super(BaseQuerySet, self).delete()
        else:
            fake_postfix = self.__fake_postfix()
            fake_delete_fields = getattr(self.model, 'FAKE_DELETE_FIELDS', [])
            obj_cache = list(self._clone())

            # send pre_delete signal
            for o in obj_cache:
                pre_delete.send(sender=self.model, instance=o, using=self.db)

            # fake delete queryset by update
            try:
                kwargs = {"is_deleted": 1}
                for f in fake_delete_fields:
                    kwargs[f] = SF(f, postfix=fake_postfix)

                self.update(**kwargs)
            except Exception as e:
                log.warning('Fake delete queryset error: %s,  db: %s, model: %s, query: %s'
                            % (e, self.db, self.model, self.query))
                return super(BaseQuerySet, self).delete()

            # send post_delete signal
            for o in obj_cache:
                kwargs = {"is_deleted": 1}
                for f in fake_delete_fields:
                    kwargs[f] = '%s%s' % (getattr(o, f), fake_postfix)

                setattr_if_changed(o, **kwargs)
                post_delete.send(sender=self.model, instance=o, using=self.db)


class SimpleBaseManager(models.Manager):
    QUERYSET_CLASS = SimpleBaseQuerySet

    def get_or_none(self, **kwargs):
        return self.get_queryset().get_or_none(**kwargs)

    def getx(self, **kwargs):
        return self.get_queryset().getx(**kwargs)

    def get_queryset(self):
        klass = self.QUERYSET_CLASS or models.query.QuerySet
        return klass(self.model, using=self._db)


class BaseManager(SimpleBaseManager):
    QUERYSET_CLASS = BaseQuerySet

    def get_queryset(self):
        return super(BaseManager, self).get_queryset().filter(is_deleted=0)

    def all(self, show_all=False):
        if show_all:
            return super(BaseManager, self).get_queryset()
        else:
            return self.get_queryset()


class ModelDiffMixin(object):
    """
    A model mixin that tracks model fields' values and provide some useful api
    to know what fields have been changed.
    """

    def __init__(self, *args, **kwargs):
        super(ModelDiffMixin, self).__init__(*args, **kwargs)
        self.__initial = self._dict

    @property
    def diff(self):
        d1 = self.__initial
        d2 = self._dict
        diffs = [(k, (v, d2[k])) for k, v in d1.items() if v != d2[k]]
        return dict(diffs)

    @property
    def has_changed(self):
        return bool(self.diff)

    @property
    def changed_fields(self):
        return self.diff.keys()

    def get_field_diff(self, field_name):
        """
        Returns a diff for field if it's changed and None otherwise.
        """
        return self.diff.get(field_name, None)

    def _reset_diff(self, *args, **kwargs):
        """
        Saves model and set initial state.
        """
        self.__initial = self._dict

    @property
    def _dict(self):
        return model_to_dict(self, fields=[field.name for field in self._meta.fields])


class SimpleBaseModel(models.Model, ModelDiffMixin):
    '''Simple Base Model'''
    _CACHE_TIMEOUT = None  # None means use default timeout in settings; 0 means no cache
    id = BigAutoField(primary_key=True)

    objects = SimpleBaseManager()

    def to_dict(self, fields=[], exclude=[]):
        ret = model_to_dict(self, fields=fields, exclude=exclude)

        from common.utils import TargetObject
        _t = TargetObject()
        ret = _t.update(self._state.db, **ret)

        s_fields = [('creator', 'User')]
        if hasattr(self, 'serialize_object_fields'):
            s_fields += list(self.serialize_object_fields)
        for field, model_name in s_fields:
            if field in ret:
                ret[field] = _t.obj_info(model_name, ret[field], self._state.db)

        return ret

    def save(self, *args, **kwargs):
        ret = super(SimpleBaseModel, self).save(*args, **kwargs)
        # pre_save & post_save signals have been sent-handled, then reset diff.
        self._reset_diff()
        return ret

    @classmethod
    def fake_identity(cls):
        return '$%s' % str(uuid.uuid4())

    def is_fake(self, key):
        r = getattr(self, key)
        return r and r.startswith('$')

    @classmethod
    def create(cls, **kwargs):
        using = kwargs.pop('using', None)
        r = cls(**kwargs)
        r.save(using=using)
        return r

    @classmethod
    def has_cache(cls):
        return cls._CACHE_TIMEOUT != 0

    class Meta:
        abstract = True


class BaseModel(SimpleBaseModel):
    '''Base Model with standard fields'''
    is_deleted = PositiveSmallIntegerField(default=0)
    create_time = DateTimeField(auto_now_add=True, null=True)
    update_time = DateTimeField(auto_now=True, null=True)

    objects = BaseManager()

    def delete(self, using=None, force=False):
        if force:
            return super(BaseModel, self).delete(using=using)
        elif not self.is_deleted:
            # use queryset.update(), do not send pre_save & post_save
            self.__class__.objects.using(self._state.db).filter(id=self.id).delete()

    def to_dict(self, fields=[], exclude=[]):
        if "is_deleted" not in exclude:
            exclude.append("is_deleted")

        exclude.extend(['create_time', 'update_time', 'date_added', 'date_updated', 'order_field'])

        ret = super(BaseModel, self).to_dict(fields, exclude)

        if hasattr(self, 'date_added') and self.date_added and 'created_at' not in exclude:
            ret['created_at'] = self.date_added

        if hasattr(self, 'date_updated') and self.date_updated and 'updated_at' not in exclude:
            ret['updated_at'] = self.date_updated

        return ret

    class Meta:
        abstract = True

##############################################################
# BASE CLASSES FOR ORG_DB: Queryset, Manager, Model  #
##############################################################


class SmartShardIdMixin(object):
    def alias(self, org_id_or_alias):
        '''supports using(org_id) and using(alias)'''
        from common.utils import is_valid_shard_id, shard_id
        if is_valid_shard_id(org_id_or_alias):
            alias = org_id_or_alias
        else:
            alias = shard_id(org_id_or_alias)
            if not is_valid_shard_id(alias):
                raise ValueError('using(org_id or alias) error: %s' % org_id_or_alias)

        return alias


class SimpleBaseOrgQuerySet(SimpleBaseQuerySet, SmartShardIdMixin):
    def using(self, org_id_or_alias):
        return super(SimpleBaseOrgQuerySet, self).using(self.alias(org_id_or_alias))


class BaseOrgQuerySet(BaseQuerySet, SmartShardIdMixin):
    def using(self, org_id_or_alias):
        return super(BaseOrgQuerySet, self).using(self.alias(org_id_or_alias))


class SimpleBaseOrgManager(SimpleBaseManager):
    QUERYSET_CLASS = SimpleBaseOrgQuerySet


class BaseOrgManager(BaseManager):
    QUERYSET_CLASS = BaseOrgQuerySet


class OrgModelMixin(object):
    IS_ORG_MODEL = True

    def _update_org_id(self, org_id):
        self._org_id_cache = org_id

    @property
    def org_id(self):
        if not hasattr(self, '_org_id_cache'):
            from common.utils import to_org_id
            if self._state.db:
                self._org_id_cache = to_org_id(self._state.db)
            else:
                return None
        return self._org_id_cache


class SimpleBaseOrgModel(SimpleBaseModel, OrgModelMixin):
    '''Simple Org Base Model'''
    objects = SimpleBaseOrgManager()

    class Meta:
        abstract = True


class BaseOrgModel(BaseModel, OrgModelMixin):
    '''Simple Org Base Model with standard fields'''
    objects = BaseOrgManager()

    class Meta:
        abstract = True


class FileModelsMixin(object):
    GENERATED_EXT = '.bbgen'

    @classmethod
    def save_file(cls, upload_file, org_id=0):
        ext = os.path.splitext(upload_file._name)[-1]
        filename = '%s%s' % (cls.gen_filepath(org_id), ext)
        return cls.fs.save(filename, ContentFile(upload_file.read()))

    @classmethod
    def save_file2(cls, filedata, org_id=0):
        filename = cls.gen_filepath(org_id)
        return cls.fs.save(filename, ContentFile(filedata))

    @classmethod
    def generate_file(cls, filedata, org_id=0):
        filename = '%s%s' % (cls.gen_filepath(org_id), cls.GENERATED_EXT)
        return cls.fs.save(filename, ContentFile(filedata))

    @classmethod
    def gen_filepath(cls, org_id=0):
        return '%s/%s/%08d/f' % \
            (org_id, datetime.strftime(datetime.now(), '%Y-%m-%d'), randint(0, 99999999))

    @classmethod
    def load_file(cls, filename):
        return cls.fs.open(filename).read()

    @classmethod
    def open_file(cls, filename):
        return cls.fs.open(filename)

    @classmethod
    def full_path(cls, filename):
        return '%s/%s' % (cls.fs.base_location, filename)

    @classmethod
    def is_generated(cls, filename):
        return os.path.splitext(filename)[-1] == cls.GENERATED_EXT


# class CreatorModels(BaseModel):
#     creator = PositiveBigIntegerField(db_index=True)
#
#     class Meta:
#         abstract = True


class OrderMixin(object):
    order_field = 'order'
    order_filter_fields = ()

    ORDER_BEFORE = 'before'
    ORDER_AFTER = 'after'

    @classmethod
    def new_order(cls, org_id, obj_id=0, order_type=ORDER_BEFORE, **kwargs):
        filter_kwargs = {}
        for field in cls.order_filter_fields:
            if field not in kwargs:
                raise ValueError('missing order_filter_fields %s' % field)
            filter_kwargs[field] = kwargs[field]

        queryset = cls.objects \
            .using(shard_id(org_id))\
            .filter(**filter_kwargs)

        if obj_id:
            obj = queryset.get_or_none(id=obj_id)
        else:
            obj = None

        order = getattr(obj, cls.order_field) if obj else None
        handler = cls.OrderHandler(queryset, cls.order_field)

        if order_type == cls.ORDER_BEFORE:
            return handler.insert_before(order)
        elif order_type == cls.ORDER_AFTER:
            return handler.insert_after(order)
        else:
            raise ValueError('wrong order type %s' % order_type)

    class OrderHandler(object):
        HIGH_LIMIT = 2**63 - 1
        LOW_LIMIT = 0
        TOLERANCE = 0.25

        def __init__(self, queryset, order_field='order'):
            self.queryset = queryset
            self.order_field = order_field

        def _re_order_all(self):
            count = self.queryset.count()
            step = round((self.HIGH_LIMIT-self.LOW_LIMIT)/(count+1))

            order_list = [self.LOW_LIMIT]
            for i, o in enumerate(self.queryset.order_by(self.order_field)):
                expected = self.LOW_LIMIT+(i+1)*step
                current = getattr(o, self.order_field)
                if abs(current-expected) > step*self.TOLERANCE:
                    setattr(o, self.order_field, expected)
                    o.save()
                order_list.append(getattr(o, self.order_field))

            order_list.append(self.HIGH_LIMIT)
            return order_list

        def _safe_order(self, low=None, high=None):
            low = low or self.LOW_LIMIT
            high = high or self.HIGH_LIMIT
            if high-low < 2:
                index = self.queryset\
                    .filter(**{'%s__lte' % self.order_field: low})\
                    .count()
                new_orders = self._re_order_all()
                low, high = new_orders[index], new_orders[index+1]

            return round(low+(high-low)/2)

        def _prev_order(self, order):
            qs = self.queryset \
                     .filter(**{'%s__lt' % self.order_field: order}) \
                     .order_by('-%s' % self.order_field)[:1]

            return qs[0].order if qs else None

        def _next_order(self, order):
            qs = self.queryset \
                     .filter(**{'%s__gt' % self.order_field: order}) \
                     .order_by(self.order_field)[:1]

            return qs[0].order if qs else None

        @property
        def _min_order(self):
            r = self.queryset.order_by(self.order_field)[:1]
            return r[0].order if r else None

        @property
        def _max_order(self):
            r = self.queryset.order_by('-%s' % self.order_field)[:1]
            return r[0].order if r else None

        def insert_before(self, order=None):
            if order is None:
                # insert in beginning of array
                return self._safe_order(None, self._min_order)
            else:
                # insert in front of given 'order'
                return self._safe_order(self._prev_order(order), order)

        def insert_after(self, order=None):
            if order is None:
                # insert in the end of array
                return self._safe_order(self._max_order, None)
            else:
                # insert after given 'order'
                return self._safe_order(order, self._next_order(order))


class AutoCleanMixin(object):
    auto_clean_setting = ('date_added', 3600*24*30)  # (field_name, seconds)

    AUTO_CLEAN_CACHE_PREFIX = 'auto_clean_mixin'
    AUTO_CLEAN_INTERVAL = 3600*24
