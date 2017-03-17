import logging
import requests
import string
from datetime import datetime

from common import models as _models
from common.const import ErrorCode, Gender, DestType
from common.exceptions import APIError
from common.utils import (bfs_host, current_timestamp, dt_to_timestamp,
                          find_first_gap, is_valid_email_local_part, setattr_if_changed, shard_id)
from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import FileSystemStorage
from django.db import IntegrityError, models, transaction
from django.db.models import get_model
from django.utils.crypto import get_random_string

log = logging.getLogger(__name__)


class OrgDomain(_models.BaseModel):
    FAKE_DELETE_FIELDS = ('name',)

    org = models.ForeignKey('Org', db_constraint=False, related_name='domains')
    creator = _models.PositiveBigIntegerField()
    name = models.CharField(max_length=64, unique=True)
    is_default = models.PositiveIntegerField(default=0)

    @property
    def valid_name(self):
        if self.is_fake('name'):
            return ''
        else:
            return self.name

    def to_dict(self):
        ret = super(OrgDomain, self).to_dict(fields=['id', 'name', 'is_default'])
        ret['name'] = self.valid_name
        return ret

    class Meta:
        db_table = 'uc_org_domain'


class Org(_models.BaseModel):
    DEFAULT_AVATAR = '%s/default_org_icon.png' % settings.FS_ROOT

    creator = _models.PositiveBigIntegerField()
    name = models.CharField(max_length=128)
    intro = models.CharField(max_length=1024)
    avatar = models.CharField(max_length=128)
    update_at = models.PositiveIntegerField()
    order_field = models.IntegerField(default=0, db_index=True)

    @property
    def avatar_url(self):
        if self.avatar.lower().startswith('http'):
            return self.avatar

        from yxt.models import OrgYxt
        if OrgYxt.objects.getx(org_id=self.id):
            prefix = settings.ORG_AVATAR_URL_PREFIX_YXT
        else:
            prefix = settings.ORG_AVATAR_URL_PREFIX_STARFISH

        return '%s/%s/%s' % (prefix, self.id, self.avatar)

    @property
    def default_domain(self):
        domain = OrgDomain.objects.get_or_none(org_id=self.id, is_default=1)
        if domain is None:
            domain = OrgDomain(
                org=self,
                creator=self.creator,
                name=OrgDomain.fake_identity(),
                is_default=1)
            domain.save()
        return domain

    @property
    def default_domain_name(self):
        return self.default_domain.valid_name

    @classmethod
    def next_org_id(cls):
        org_ids = Org.objects \
            .values_list('id', flat=True) \
            .order_by('-id')[:100]
        return find_first_gap(list(reversed(org_ids)))

    def save(self, *args, **kwargs):
        if not self.name:
            raise ValueError('invalid org name')

        self.update_at = current_timestamp()

        super(Org, self).save(*args, **kwargs)

    def download_and_update_avatar(self):
        if self.avatar.lower().startswith('http'):
            try:
                r = requests.get(self.avatar, stream=True)
                if r.status_code != 200:
                    self.avatar = ''

                self.avatar = OrgAvatar.save_file2(r.raw.read())
            except Exception as e:
                log.warning('download_and_update_avatar error: %s, %s' % (self.id, e))

            return self.avatar

    def to_dict(self):
        ret = super(Org, self).to_dict([], ['avatar', 'update_at'])

        ret.update({
            'avatar_url': self.avatar_url,
            'domain': self.default_domain_name
        })

        from yxt.models import OrgYxt
        if OrgYxt.objects.getx(org_id=self.id):
            ret['api_url'] = settings.API_URL_YXT
            ret['bfs_host'] = bfs_host(is_yxt_env=True)
        else:
            ret['api_url'] = settings.API_URL
            ret['bfs_host'] = bfs_host(is_yxt_env=False)

        attribute = OrgAttribute.objects.get_or_none(org_id=self.id)
        if attribute:
            ret['province'] = attribute.province
            ret['city'] = attribute.city
            ret['category'] = attribute.category.to_dict() if attribute.category else ''
        else:
            ret['province'] = ''
            ret['city'] = ''
            ret['category'] = ''

        return ret

    @property
    def default_department(self):
        '''get default all department of org, or create it if not exists'''
        d = Department.objects \
            .using(shard_id(self.id)) \
            .get_or_none(type=Department.TYPE_DEFAULT_ALL, parent=None)

        if d is None:
            d = Department(
                creator=self.creator,
                name=self.name,
                type=Department.TYPE_DEFAULT_ALL,
                parent=None
            )
            d.save(using=shard_id(self.id))

        return d

    @classmethod
    def last_modified(cls, request, org_id):
        return Org.objects.get_or_none(id=org_id).update_at

    class Meta:
        db_table = 'uc_org'
        ordering = ('order_field',)


class OrgAvatar(_models.FileModelsMixin):
    fs = FileSystemStorage(location=settings.FS_ROOT)


class OrgCategory(_models.BaseModel):
    name = models.CharField(max_length=128)
    parent = models.ForeignKey('self', db_constraint=False, null=True)

    @classmethod
    def create(cls, full_name):
        if not full_name:
            return

        parent = None
        for n in full_name.split('-'):
            obj = cls.objects.get_or_create(name=n, parent=parent)[0]
            parent = obj

        return parent

    def to_dict(self):
        res = [self.name]
        parent = self.parent
        while parent:
            res.append(parent.name)
            parent = parent.parent

        return '-'.join(reversed(res))

    class Meta:
        db_table = 'uc_org_category'


class OrgAttribute(_models.SimpleBaseModel):
    org_id = _models.PositiveBigIntegerField(db_index=True)
    province = models.CharField(max_length=64)
    city = models.CharField(max_length=64)
    category = models.ForeignKey(OrgCategory, db_constraint=False, null=True)

    class Meta:
        db_table = 'uc_org_attribute'


class UserOrg(_models.SimpleBaseModel):
    user_id = _models.PositiveBigIntegerField()
    org_id = _models.PositiveBigIntegerField(db_index=True)
    is_left = models.PositiveSmallIntegerField(default=0)

    @classmethod
    def user_in_org_ids(cls, user_id):
        return list(
            cls.objects.filter(user_id=user_id, is_left=0).values_list('org_id', flat=True)
        )

    class Meta:
        db_table = 'uc_user_org'
        unique_together = ('user_id', 'org_id', )


class WorkMail(_models.SimpleBaseOrgModel):
    TYPE_ORG_MEMBER = 0
    TYPE_DEPARTMENT = 1
    TYPE_DISCUSSION_GROUP = 2

    owner = _models.PositiveBigIntegerField()
    owner_type = models.PositiveSmallIntegerField()
    local_part = models.CharField(max_length=64)
    is_set = models.PositiveSmallIntegerField(default=0)
    domain_id = _models.PositiveBigIntegerField(db_index=True)

    @property
    def owner_model(self):
        if self.owner_type == self.TYPE_ORG_MEMBER:
            return get_model('account', 'User')
        elif self.owner_type == self.TYPE_DISCUSSION_GROUP:
            return get_model('org', 'DiscussionGroup')
        elif self.owner_type == self.TYPE_DEPARTMENT:
            return get_model('org', 'Department')

    @property
    def address(self):
        org_domain = OrgDomain.objects.getx(id=self.domain_id)
        if not org_domain:
            org = Org.objects.getx(id=self.org_id)
            if org:
                org_domain = org.default_domain
                self.domain_id = org_domain.id
                self.save()
            else:
                return None

        if self.is_fake('local_part') or not org_domain.valid_name:
            return ''
        else:
            return '%s@%s' % (self.local_part, org_domain.name)

    def to_dict(self):
        if self.owner_type == WorkMail.TYPE_ORG_MEMBER:
            return {'user_id': self.owner}

        return {'group_id': self.owner}

    @classmethod
    def find(cls, addr):
        try:
            local_part, domain = addr.split('@')
        except:
            return None
        org_domain = OrgDomain.objects.getx(name=domain)
        if org_domain:
            return cls.objects.using(org_domain.org_id).getx(local_part=local_part)

    @classmethod
    def find_user(cls, addr):
        r = cls.find(addr)
        if not r:
            return None

        if r.owner_type != WorkMail.TYPE_ORG_MEMBER:
            return None

        from apps.account.models import User
        return User.objects.get_or_none(id=r.owner)

    @classmethod
    def get_address(cls, owner, owner_type, org_id):
        wm = cls.objects \
            .using(shard_id(org_id)) \
            .getx(owner=owner, owner_type=owner_type)

        if wm and wm.is_set:
            return wm.address
        else:
            return ''

    @classmethod
    def find_many2(cls, owners, owner_type, org_id):
        o = Org.objects.getx(id=org_id)
        if not o:
            raise ValueError()

        ret = dict([(owner, '') for owner in owners])

        _r = cls.objects \
            .using(shard_id(org_id)) \
            .filter(owner__in=owners, owner_type=owner_type)
        r = dict([
            (i.owner, i.address) for i in _r
            if i.is_set and not i.is_fake('local_part')
        ])

        ret.update(r)

        return ret

    @classmethod
    def set_address(cls, org_id, owner, owner_type, local_part=None, domain_id=None):
        ''' raise APIError '''
        if domain_id:
            assert OrgDomain.objects.getx(id=domain_id).org_id == org_id
        if local_part and not is_valid_email_local_part(local_part):
            raise APIError(ErrorCode.INVALID_EMAIL_ADDR_LOCAL_PART)

        if local_part == '':  # '' to remove local_part
            local_part = WorkMail.fake_identity()
            is_set = 0
        else:
            is_set = 1

        wm, created = cls.objects.\
            using(org_id).\
            get_or_create(owner=owner, owner_type=owner_type)

        if not created:
            _local_part = local_part or wm.local_part
            _domain_id = domain_id or wm.domain_id
        else:
            if not local_part:
                raise APIError(ErrorCode.INVALID_EMAIL_ADDR_LOCAL_PART)
            _local_part = local_part
            _domain_id = domain_id or Org.objects.getx(id=org_id).default_domain.id

        if cls.objects.using(org_id)\
                .filter(local_part=_local_part, domain_id=_domain_id)\
                .exists():
            raise APIError(ErrorCode.ORG_MAIL_SET)

        if setattr_if_changed(wm, local_part=_local_part, domain_id=_domain_id, is_set=is_set):
            wm.save()

        return wm

    class Meta:
        db_table = 'uc_work_mail'
        unique_together = (('owner_type', 'owner'), ('local_part', 'domain_id'))


class DiscussionGroup(_models.BaseOrgModel):
    creator = _models.PositiveBigIntegerField()
    name = models.CharField(max_length=512)
    intro = models.CharField(max_length=1024)
    avatar = models.CharField(max_length=128)
    is_disbanded = models.PositiveSmallIntegerField(default=0)
    related_project_id = _models.PositiveBigIntegerField(default=0)
    order_field = models.IntegerField(default=0, db_index=True)

    @property
    def avatar_url(self):
        return '%s/%s/%s/%s' % (settings.DISCUSSION_GROUP_AVATAR_URL_PREFIX,
                                self.org_id, self.id,
                                self.avatar or GroupAvatarCache(self.org_id).get_or_create())

    def user_count(self):
        return UserDiscussionGroup.objects \
            .using(self.org_id) \
            .filter(group_id=self.id) \
            .filter(is_left=0).count()

    @classmethod
    def to_dict_list(cls, org_id, obj_list):
        ret = []
        group_ids = [i.id for i in obj_list]
        if not group_ids:
            return ret

        for obj in obj_list:
            ret.append(cls._to_dict0(obj, org_id))

        return ret

    @classmethod
    def _to_dict0(cls, obj, org_id):
        ret = super(DiscussionGroup, obj).to_dict([], ['avatar'])

        ret.update({
            'avatar_url': obj.avatar_url,
            'created_at': dt_to_timestamp(obj.create_time),
        })

        for key in ('related_project_id', 'is_disbanded'):
            del ret[key]

        return ret

    def related_project(self):
        if self.related_project_id:
            from apps.project.models import Project
            return Project.objects.using(self.org_id).getx(id=self.related_project_id)

    def to_dict(self):
        return self.to_dict_list(self.org_id, [self])[0]

    def has_user(self, user_id):
        r = UserDiscussionGroup.objects \
            .using(self.org_id) \
            .getx(group_id=self.id, user_id=user_id)
        return r and not r.is_left

    def has_operate_permission(self, operator):
        if self.is_disbanded:
            return False
        elif operator.is_admin(self.org_id):
            return True
        else:
            project = self.related_project()
            if project:  # project discuss group
                return operator.id == project.person_in_charge
            else:  # normal discuss group
                return self.has_user(operator.id)

    def add_users(self, operator, user_ids):
        '''
            interface to add users to a discuss_group, with permission check
            raise APIError.
        '''
        if not self.has_operate_permission(operator):
            raise APIError(
                ErrorCode.PERMISSION_DENIED,
                operator=operator.to_dict(),
                is_disbanded=self.is_disbanded,
                org_id=self.org_id
            )

        from apps.account.models import User
        for user_id in user_ids:
            user = User.objects.getx(id=user_id)
            if not user:
                raise APIError(ErrorCode.NO_SUCH_USER, user_id=user_id)
            if not user.in_org(self.org_id):
                raise APIError(ErrorCode.NO_SUCH_USER_IN_ORG,
                               user_id=user_id, org_id=self.org_id)
            # add user to group
            UserDiscussionGroup.add(user_id, self.id, self.org_id)

    def remove_users(self, operator, user_ids):
        '''
            interface to remove users from a discuss_group, with permission check
            raise APIError.
        '''
        if not self.has_operate_permission(operator):
            raise APIError(ErrorCode.PERMISSION_DENIED)

        for user_id in user_ids:
            UserDiscussionGroup.remove(user_id, self.id, self.org_id)

    class Meta:
        db_table = 'uc_discussion_group'
        ordering = ('order_field',)


class DiscussionGroupAvatar(_models.FileModelsMixin):
    fs = FileSystemStorage(location=settings.FS_ROOT)


class UserDiscussionGroup(_models.SimpleBaseOrgModel):
    DEFAULT_CACHE_TIMEOUT = 86400

    user_id = _models.PositiveBigIntegerField()
    group_id = _models.PositiveBigIntegerField(db_index=True)
    date_joined = models.PositiveIntegerField()
    is_left = models.PositiveSmallIntegerField(default=0)

    def save(self, *args, **kwargs):
        if not self.pk and not self.date_joined:
            self.date_joined = current_timestamp()

        super(UserDiscussionGroup, self).save(*args, **kwargs)

    @classmethod
    def add(cls, user_id, group_id, org_id):
        try:
            v = UserDiscussionGroup(
                user_id=user_id,
                group_id=group_id,
                date_joined=current_timestamp()
            )
            with transaction.atomic():
                v.save(using=shard_id(org_id))
        except IntegrityError:
            v = UserDiscussionGroup.objects \
                .using(shard_id(org_id)) \
                .get_or_none(user_id=user_id, group_id=group_id)

            if setattr_if_changed(v, is_left=0):
                v.save(using=shard_id(org_id))

    @classmethod
    def remove(cls, user_id, group_id, org_id):
        o = UserDiscussionGroup.objects. \
            using(shard_id(org_id)). \
            get_or_none(group_id=group_id, user_id=user_id)
        if o:
            o.is_left = 1
            o.save(using=shard_id(org_id))

    @classmethod
    def group_ids(cls, org_id, user_id):
        r = UserDiscussionGroup.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=user_id) \
            .filter(is_left=0)

        group_ids = [i.group_id for i in r]
        groups = DiscussionGroup.objects \
            .using(shard_id(org_id)) \
            .filter(id__in=group_ids, is_disbanded=0)

        return [g.id for g in groups]

    @classmethod
    def user_ids(cls, org_id, group_id, filter_disbanded=True):
        g = DiscussionGroup.objects \
            .using(shard_id(org_id)) \
            .getx(id=group_id, is_disbanded=0)
        if not g and filter_disbanded:
            return []

        r = UserDiscussionGroup.objects \
            .using(shard_id(org_id)) \
            .filter(group_id=group_id) \
            .filter(is_left=0)

        return list(r.values_list('user_id', flat=True))

    @classmethod
    def last_modified_by_group(cls, request, org_id, group_id):
        if isinstance(group_id, int):
            group_ids = [group_id]
        else:
            group_ids = [int(i) for i in group_id.split(',') if i]

        keys = [cls._last_modified_cache_key(org_id, 'group', i) for i in group_ids]
        values = cache.get_many(keys)
        if len(keys) == len(values):
            return max(values.values())

        now = current_timestamp()
        set_many_args = dict([(k, now) for k in keys if k not in values])
        cache.set_many(set_many_args, cls.DEFAULT_CACHE_TIMEOUT)

        return now

    @classmethod
    def _last_modified_cache_key(cls, org_id, k, id_):
        return '%s_last_modified_cache_key_%s:%s:%s' % ('UserDiscussionGroup', org_id, k, id_)

    @classmethod
    def update_last_modified(cls, org_id, k, id_):
        v = current_timestamp()
        cache.set(cls._last_modified_cache_key(org_id, k, id_), v, cls.DEFAULT_CACHE_TIMEOUT)
        return v

    class Meta:
        db_table = 'uc_user_discussion_group'
        unique_together = ('user_id', 'group_id', )


class Department(_models.BaseOrgModel):
    DEFAULT_AVATAR = '%s/default_department_icon.png' % settings.FS_ROOT

    TYPE_NORMAL = 0
    TYPE_DEFAULT_ALL = 1

    parent = models.ForeignKey('self', db_constraint=False, null=True)
    creator = _models.PositiveBigIntegerField()
    name = models.CharField(max_length=512)
    avatar = models.CharField(max_length=128)
    is_disbanded = models.PositiveSmallIntegerField(default=0)
    order_field = models.IntegerField(default=0, db_index=True)

    TYPE_CHOICES = (
        (TYPE_NORMAL, 'normal'),
        (TYPE_DEFAULT_ALL, 'default all'),
    )
    type = models.PositiveSmallIntegerField(default=TYPE_NORMAL, choices=TYPE_CHOICES)

    @property
    def avatar_url(self):
        if self.avatar.lower().startswith('http'):
            return self.avatar

        return '%s/%s/%s/%s' % (settings.DEPARTMENT_AVATAR_URL_PREFIX,
                                self.org_id, self.id,
                                self.avatar or GroupAvatarCache(self.org_id).get_or_create())

    @property
    def children(self):
        return Department.objects.using(self.org_id).filter(parent=self, is_disbanded=0)

    @classmethod
    def to_dict_list(cls, org_id, obj_list):
        ret = []
        group_ids = [i.id for i in obj_list]
        if not group_ids:
            return ret

        for obj in obj_list:
            ret.append(cls._to_dict0(obj, org_id))

        return ret

    def has_user(self, user_id, direct_in=0):
        qs = UserDepartment.objects.using(self.org_id).filter(group_id=self.id, user_id=user_id)
        if direct_in:
            qs = qs.filter(direct_in=1)
        return qs.exists()

    def user_count(self, direct_in=0):
        qs = UserDepartment.objects \
            .using(self.org_id) \
            .filter(group_id=self.id)
        if direct_in:
            qs = qs.filter(direct_in=1)
        return qs.count()

    def to_dict(self):
        return self.to_dict_list(self.org_id, [self])[0]

    @classmethod
    def _to_dict0(cls, obj, org_id):
        ret = super(Department, obj).to_dict(exclude=['is_disbanded', 'avatar', 'type'])

        ret.update({
            'avatar_url': obj.avatar_url,
        })

        if ret['parent'] is None:
            ret['parent'] = 0

        return ret

    @classmethod
    def user_ids(cls, org_id, group_id, direct_in=0, filter_disbanded=True):
        g = cls.objects.using(org_id).getx(id=group_id)
        if not g:
            raise APIError(ErrorCode.NO_SUCH_DEPARTMENT, group_id=group_id)
        if filter_disbanded and g.is_disbanded:
            return []

        qs = UserDepartment.objects \
            .using(org_id) \
            .filter(group_id=group_id)
        if direct_in:
            qs = qs.filter(direct_in=1)

        return list(qs.values_list('user_id', flat=True))

    @classmethod
    def update_user_departments(cls, org_id, user_id, direct_in):
        parents = []
        for i in direct_in:
            parents += Department.objects.using(org_id).getx(id=i).all_parents()
        parent_ids = [v.id for v in parents]
        indirect_in = set(parent_ids) - set(direct_in)

        original_direct_in, original_indirect_in = [], []
        qs = UserDepartment.objects.using(org_id).filter(user_id=user_id)
        for v in qs:
            if v.direct_in:
                original_direct_in.append(v.group_id)
            else:
                original_indirect_in.append(v.group_id)

        create_direct_in, create_indirect_in, remove = cls.calc_exec_plan(
            direct_in, indirect_in, original_direct_in, original_indirect_in
        )

        qs = UserDepartment.objects.using(org_id).filter(user_id=user_id, group_id__in=remove)
        for v in qs:
            v._quiet = True
            v.delete()

        for v in create_direct_in:
            r = UserDepartment(
                user_id=user_id, group_id=v, direct_in=1
            )
            r._quiet = True
            r.save(using=shard_id(org_id))

        for v in create_indirect_in:
            r = UserDepartment(
                user_id=user_id, group_id=v, direct_in=0
            )
            r._quiet = True
            r.save(using=shard_id(org_id))

        body = {
            user_id: {
                'is_direct': direct_in,
                'is_not_direct': list(indirect_in),
                'original_is_direct': original_direct_in,
                'original_is_not_direct': original_indirect_in,
            }
        }

        from common.message_queue import SystemMessage
        from apps.message.models import Message
        SystemMessage(Message.TYPE_MEMBER_DEPARTMENTS_UPDATED_V2, body, org_id).send(
            dest_type=DestType.ORG,
            dest_id=org_id
        )

    @classmethod
    def calc_exec_plan(cls, direct_in, indirect_in, original_direct_in, original_indirect_in):
        direct_in = set(direct_in)
        indirect_in = set(indirect_in)
        original_direct_in = set(original_direct_in)
        original_indirect_in = set(original_indirect_in)

        return (
            direct_in - original_direct_in,
            indirect_in - original_indirect_in,
            (original_direct_in - direct_in) | (original_indirect_in - indirect_in)
        )

    # TODO 废弃
    @classmethod
    def reset_user_indirect_in(cls, org_id, user_id, original_departments):
        uc_qs = UserDepartment.objects.using(org_id).filter(user_id=user_id)

        # get all indirect(parents) by direct_ids
        direct_ids = uc_qs.filter(direct_in=1).values_list('group_id', flat=True)
        parents = []
        for group_id in direct_ids:
            parents += Department.objects.using(org_id).getx(id=group_id).all_parents()

        # indirect ids except direct ids
        indirect_ids = set([p.id for p in parents if p.id not in direct_ids])

        # delete indirect not need any more
        uc_qs.filter(direct_in=0).exclude(group_id__in=indirect_ids).delete()

        # indirect that existed
        existed = uc_qs.filter(direct_in=0).values_list('group_id', flat=True)

        # add new indirect
        for group_id in set(indirect_ids) - set(existed):
            UserDepartment.create(org_id, user_id, group_id, 0)

        new_departments = UserDepartment.objects \
            .using(org_id) \
            .filter(user_id=user_id) \
            .values_list('group_id', flat=True)

        # user departments changed, send message of direct_in and indirect_in
        body = {
            'user_id': user_id,
            'is_direct': list(direct_ids),
            'is_not_direct': list(indirect_ids),
            'original_departments': original_departments,
            'new_departments': list(new_departments),
        }
        # for Forward Compatible
        body.update(direct_in=body['is_direct'], indirect_in=body['is_not_direct'])

        from common.message_queue import SystemMessage
        from apps.message.models import Message
        SystemMessage(Message.TYPE_MEMBER_DEPARTMENTS_UPDATED, body, org_id).send(
            dest_type=DestType.ORG,
            dest_id=org_id
        )

    # TODO 废弃
    @classmethod
    def user_reset_direct_in(cls, org_id, user_id, group_ids=[]):
        '''rest user direct in groups'''
        uc_qs = UserDepartment.objects.using(org_id).filter(user_id=user_id)
        original_departments = [o.group_id for o in uc_qs]

        uc_qs.filter(direct_in=1).exclude(group_id__in=group_ids).delete()
        existed = uc_qs.filter(direct_in=1).values_list('group_id', flat=True)
        for group_id in set(group_ids) - set(existed):
            obj, created = UserDepartment.objects.using(org_id)\
                .get_or_create(user_id=user_id, group_id=group_id, defaults={'direct_in': 1})

            if not created and setattr_if_changed(obj, direct_in=1):
                obj.save()

        cls.reset_user_indirect_in(org_id, user_id, original_departments)

    def all_parents(self):
        _all = []
        parent_id = self.parent_id
        while parent_id:
            parent = Department.objects.using(self.org_id).getx(id=parent_id)
            if not parent:
                break
            _all.append(parent)
            parent_id = parent.parent_id

        return _all

    def add_direct_in_v2(self, *user_ids):
        for user_id in user_ids:
            qs = UserDepartment.objects \
                .using(self.org_id) \
                .filter(user_id=user_id, direct_in=1)
            direct_in = set([v.group_id for v in qs])
            if self.id not in direct_in:
                Department.update_user_departments(self.org_id, user_id, direct_in | {self.id})

    def remove_direct_in_v2(self, *user_ids):
        for user_id in user_ids:
            qs = UserDepartment.objects \
                .using(self.org_id) \
                .filter(user_id=user_id, direct_in=1)
            direct_in = set([v.group_id for v in qs])
            if self.id in direct_in:
                Department.update_user_departments(self.org_id, user_id, direct_in - {self.id})

    # TODO 废弃
    def add_direct_in(self, *user_ids):
        '''add direct in users'''
        for user_id in user_ids:
            obj, created = UserDepartment.objects\
                .using(self.org_id)\
                .get_or_create(user_id=user_id,
                               group_id=self.id,
                               defaults={'direct_in': 1})
            if not created and setattr_if_changed(obj, direct_in=1):
                obj.save()

            uc_qs = UserDepartment.objects.using(self.org_id).filter(user_id=user_id)
            original_departments = [o.group_id for o in uc_qs]

            Department.reset_user_indirect_in(self.org_id, user_id, original_departments)

    # TODO 废弃
    def remove_direct_in(self, *user_ids):
        '''remove direct in users'''
        for user_id in user_ids:
            qs = UserDepartment.objects\
                .using(self.org_id)\
                .filter(group_id=self.id, user_id=user_id, direct_in=1)

            uc_qs = UserDepartment.objects.using(self.org_id).filter(user_id=user_id)
            original_departments = [o.group_id for o in uc_qs]

            if qs.exists():
                qs.delete()
                Department.reset_user_indirect_in(self.org_id, user_id, original_departments)

    class Meta:
        db_table = 'uc_department'
        ordering = ('order_field',)


class DepartmentAvatar(_models.FileModelsMixin):
    fs = FileSystemStorage(location=settings.FS_ROOT)


class UserDepartment(_models.SimpleBaseOrgModel):
    user_id = _models.PositiveBigIntegerField()
    group_id = _models.PositiveBigIntegerField(db_index=True)
    direct_in = models.PositiveSmallIntegerField(default=1)

    @classmethod
    def normalize(cls, org_id):
        # add to org, left org API can be called in starfish or yxt webservice cluster
        # and UserOrg can be updated normally
        # but Org data (add to department or remove from department)
        #   can not be executed in different webservice cluster
        org_member_ids = UserOrg.objects\
            .filter(org_id=org_id, is_left=0)\
            .values_list('user_id', flat=True)
        department_member_ids = UserDepartment.objects.using(org_id) \
            .filter(direct_in=1) \
            .values_list('user_id', flat=True) \
            .distinct()
        for user_id in set(org_member_ids) - set(department_member_ids):
            o = Org.objects.getx(id=org_id)
            d = o.default_department
            d.add_direct_in_v2(user_id)

    @classmethod
    def create(cls, org_id, user_id, group_id, direct_in):
        try:
            v, created = cls.objects.using(org_id)\
                .get_or_create(user_id=user_id,
                               group_id=group_id,
                               defaults={"direct_in": direct_in}
                               )
            if not created and v.direct_in != direct_in:
                v.delete()
                cls.create(org_id, user_id, group_id, direct_in)
        except IntegrityError as e:
            log.exception(e)

    class Meta:
        db_table = 'uc_user_department'
        unique_together = ('user_id', 'group_id', )


class Invitation(_models.BaseModel):
    (STATUS_INIT,
     STATUS_IGNORE,
     STATUS_REFUSE,
     STATUS_CONFIRM
     ) = list(range(4))

    who = _models.PositiveBigIntegerField()
    whom = _models.PositiveBigIntegerField()
    org_id = _models.PositiveBigIntegerField()
    status = models.PositiveSmallIntegerField(default=STATUS_INIT)
    date_added = models.PositiveIntegerField()
    date_updated = models.PositiveIntegerField()

    def save(self, *args, **kwargs):
        if not self.pk and not self.date_added:
            self.date_added = current_timestamp()

        self.date_updated = current_timestamp()

        super(Invitation, self).save(*args, **kwargs)

    def to_dict(self):
        from apps.account.models import User

        r = super(Invitation, self).to_dict()

        org = Org.objects.get_or_none(id=self.org_id)
        r.update({
            'who': User.objects.get_or_none(id=self.who).to_dict(),
            'whom': User.objects.get_or_none(id=self.whom).to_dict(),
            'org': org.to_dict() if org else None,
        })

        return r

    class Meta:
        db_table = 'uc_invitation'
        index_together = [['who', 'whom', 'org_id']]


class ExternalInvitation(_models.BaseModel):
    VALID_DAYS = 7  # auto invite user into org if external invitation phone registered

    SECURITY_CODE_LENGTH = 32
    VALID_KEY_CHARS = string.ascii_lowercase + string.digits

    (INVITATION_TYPE_NORMAL,
     INVITATION_TYPE_WECHAT) = range(2)

    admin = _models.PositiveBigIntegerField()
    account = models.CharField(max_length=128)
    org_id = _models.PositiveBigIntegerField()
    security_code = models.CharField(max_length=SECURITY_CODE_LENGTH, unique=True)
    used = models.PositiveSmallIntegerField(default=0)
    invitation_type = models.PositiveSmallIntegerField(default=0)

    def to_dict(self):
        from apps.account.models import User

        r = super(ExternalInvitation, self).to_dict()
        r['admin'] = User.objects.get_or_none(id=self.admin).to_dict()
        r['org'] = Org.objects.get_or_none(id=self.org_id).to_dict()
        return r

    @property
    def is_wechat(self):
        return self.invitation_type == self.INVITATION_TYPE_WECHAT

    @classmethod
    def create(cls, admin, account, org_id, invitation_type=0):
        retries = 10
        for i in range(retries):
            try:
                r = ExternalInvitation(
                    admin=admin,
                    account=account,
                    org_id=org_id,
                    security_code=get_random_string(cls.SECURITY_CODE_LENGTH, cls.VALID_KEY_CHARS),
                    invitation_type=invitation_type
                )
                with transaction.atomic():
                    r.save()

                return r
            except IntegrityError as e:
                if i == retries - 1:
                    raise e

    class Meta:
        db_table = 'uc_external_invitation'


class UserPosition(_models.SimpleBaseOrgModel):
    user_id = _models.PositiveBigIntegerField(unique=True)
    position = models.CharField(max_length=128)

    class Meta:
        db_table = 'uc_user_position'


class ExternalContact(_models.BaseOrgModel):
    FAKE_DELETE_FIELDS = ('email',)
    DEFAULT_AVATAR = '%s/member_info_default_icon.png' % settings.FS_ROOT

    name = models.CharField(max_length=128, default='')
    gender = models.PositiveSmallIntegerField(default=Gender.GENDER_UNKNOWN)
    phone = models.CharField(max_length=32, default='')
    wechat = models.CharField(max_length=128, default='')
    email = models.CharField(max_length=128, default='', unique=True)
    corporation = models.CharField(max_length=128, default='')
    position = models.CharField(max_length=32, default='')
    department = models.CharField(max_length=32, default='')
    address = models.CharField(max_length=256, default='')
    avatar = models.CharField(max_length=128)
    creator = _models.PositiveBigIntegerField(default=0)
    manager = _models.PositiveBigIntegerField(default=0)

    @property
    def avatar_url(self):
        return '%s/%s/%s/%s' % (settings.EXTERNAL_CONTACT_AVATAR_URL_PREFIX,
                                self.org_id, self.id, self.avatar)

    def save(self, *args, **kwargs):
        if self.gender is None or self.gender == '':
            self.gender = Gender.GENDER_UNKNOWN

        if self.manager == '':
            self.manager = 0

        if not self.email:
            self.email = self.fake_identity()

        super(ExternalContact, self).save(*args, **kwargs)

    def to_dict(self):
        r = super(ExternalContact, self).to_dict()

        if self.is_fake('email'):
            r['email'] = ''

        r.update(avatar_url=self.avatar_url)

        return r

    class Meta:
        db_table = 'uc_external_contacts'


class ExternalContactAvatar(_models.FileModelsMixin):
    fs = FileSystemStorage(location=settings.FS_ROOT)


class GroupAvatarCache(object):
    KEY_PATTERN = 'GroupAvatarCache:{org_id}'

    DEFAULT_CACHE_TIMEOUT = 86400

    def __init__(self, org_id):
        self.org_id = org_id

    def get_or_create(self, v=None):
        r = cache.get(self._key())
        if r:
            return r

        if not v:
            v = current_timestamp()
        cache.set(self._key(), v, self.DEFAULT_CACHE_TIMEOUT)
        return v

    def delete(self):
        log.info('clear group avatar cache: %s', self._key())
        cache.delete(self._key())

    def _key(self):
        return self.KEY_PATTERN.format(org_id=self.org_id)


class GeneratedContact(_models.BaseOrgModel):
    FAKE_DELETE_FIELDS = ('email',)

    name = models.CharField(max_length=128, null=True)
    gender = models.PositiveSmallIntegerField(default=Gender.GENDER_UNKNOWN)
    phone = models.CharField(max_length=32, null=True)
    email = models.CharField(max_length=128, unique=True)

    @property
    def avatar_url(self):
        return ''

    @classmethod
    def create_by_name_and_email(cls, name, email, org_id):
        r, _ = cls.objects \
            .using(org_id) \
            .get_or_create(email=email, defaults={'name': name})
        return r

    def add_users(self, *user_ids):
        queryset = UserGeneratedContact.objects.using(self._state.db)
        exist_user_ids = queryset\
            .filter(contact_id=self.id, user_id__in=user_ids)\
            .values_list('user_id', flat=True)

        to_added = list(set(user_ids) - set(exist_user_ids))
        queryset.bulk_create(
            [UserGeneratedContact(user_id=uid, contact_id=self.id) for uid in to_added]
        )

    class Meta:
        db_table = 'uc_generated_contact'


class UserGeneratedContact(_models.SimpleBaseOrgModel):
    user_id = _models.PositiveBigIntegerField(db_index=True)
    contact_id = _models.PositiveBigIntegerField(db_index=True)

    class Meta:
        db_table = 'uc_user_generated_contact'
        unique_together = ('user_id', 'contact_id', )


class OrgApp(_models.BaseOrgModel):
    PROJECT = 1
    FILE = 2

    PROJECT_NAME = 'Project'
    FILE_NAME = 'File'

    VALID_APPS = (
        PROJECT,
        FILE,
    )

    APP_NAMES = {
        PROJECT: PROJECT_NAME,
        FILE: FILE_NAME,
    }

    APP_ICONS = {
        PROJECT: settings.PROJECT_APP_ICON,
        FILE: settings.FILE_APP_ICON,
    }

    APP_DOMAINS = {
        ('mobile', PROJECT): 'project-app-mobile.starfish.im',
        ('desktop', PROJECT): 'project-app-desktop.starfish.im',
        ('mobile', FILE): 'fs-app-mobile.starfish.im',
        ('desktop', FILE): 'fs-app-desktop.starfish.im',
    }

    creator = _models.PositiveBigIntegerField()
    app = models.PositiveIntegerField(unique=True)
    is_install = models.PositiveSmallIntegerField(default=0)

    @classmethod
    def has_install(cls, org_id, app):
        return cls.objects.using(org_id).getx(app=app, is_install=1) is not None

    @classmethod
    def app_name(cls, app):
        return cls.APP_NAMES[app]

    @classmethod
    def app_icon(cls, app):
        return cls.APP_ICONS[app]

    @classmethod
    def app_domain(cls, platform, app):
        return cls.APP_DOMAINS[(platform, app)]

    class Meta:
        db_table = 'app_org_app'


class MemberOrgApp(_models.SimpleBaseOrgModel):
    user_id = _models.PositiveBigIntegerField(db_index=True)
    app = models.PositiveIntegerField()
    is_navi = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'app_user_org_app'
        unique_together = ('user_id', 'app', )


class OrgInvitation(_models.BaseModel):
    TYPE_PHONE = 'phone'
    TYPE_WECHAT = 'wechat'
    TYPE_MANAGE = 'manage'

    creator = _models.PositiveBigIntegerField()
    org_id = _models.PositiveBigIntegerField(db_index=True)
    limit = models.PositiveIntegerField(default=0)
    added = models.PositiveIntegerField(default=0)
    is_valid = models.PositiveIntegerField(default=1)
    type = models.CharField(max_length=20)

    @classmethod
    def create_valid(cls, org_id, creator, type=TYPE_MANAGE):
        obj = cls(
            creator=creator,
            org_id=org_id,
            create_time=datetime.now(),
            is_valid=1,
            type=type
        )
        obj.save()
        return obj

    @classmethod
    def get_invitation(cls, org_id, invite_id=None, type=None):
        '''return OrgInvitation or None'''
        qs = cls.objects.filter(org_id=org_id)
        if invite_id:
            qs = qs.filter(id=invite_id)

        if type:
            qs = qs.filter(type=type)

        ret = []
        for obj in qs:
            if obj.is_valid and (datetime.now() - obj.create_time).days >= 1:
                obj.is_valid = 0
                obj.save()

            if obj.is_valid:
                ret.append(obj)

        return ret

    def to_dict(self):
        ret = super(OrgInvitation, self).to_dict()

        o = Org.objects.getx(id=self.org_id)
        ret['org'] = dict(name=o.name, id=o.id, avatar=o.avatar_url, intro=o.intro)

        ret['create_time'] = dt_to_timestamp(self.create_time)

        return ret

    class Meta:
        db_table = 'uc_org_invitation'
