import importlib

from django.db import models
from django.db.models import Q

from jsonfield import JSONCharField

from common import models as _models
from common.const import Const
from common.utils import shard_id, current_timestamp

import logging
log = logging.getLogger(__name__)


class SystemRole(Const):
    (GUEST,
     REGISTERED_USER,
     ORG_MEMBER,
     ORG_CREATOR,
     DISCUSSION_GROUP_MEMBER,
     USER_SELF,
     ORG_MEMBER_SELF,
     ORG_ADMIN) = list(range(1, 9))

    ROLE_NAMES = {
        GUEST: '访客',
        REGISTERED_USER: '注册用户',
        ORG_MEMBER: '组织成员',
        ORG_CREATOR: '组织创始人',
        DISCUSSION_GROUP_MEMBER: '讨论组成员',
        USER_SELF: '自己',
        ORG_MEMBER_SELF: '自己',
        ORG_ADMIN: '组织管理员',
    }

    ROLE_CLASSES = {
        GUEST: 'Guest',
        REGISTERED_USER: 'RegisteredUser',
        ORG_MEMBER: 'OrgMember',
        ORG_CREATOR: 'OrgCreator',
        DISCUSSION_GROUP_MEMBER: 'DiscussionGroupMember',
        USER_SELF: 'UserSelf',
        ORG_MEMBER_SELF: 'OrgMemberSelf',
        ORG_ADMIN: 'OrgAdmin',
    }


class Role(_models.BaseOrgModel):
    FAKE_DELETE_FIELDS = ('name',)
    RESERVED_ROLE_END = 10000

    (ADMIN_ROLE_NAME, ) = ('管理员', )

    name = models.CharField(max_length=128, unique=True)
    is_system = models.PositiveSmallIntegerField()

    def save(self, *args, **kwargs):
        if self.id and self.id <= self.RESERVED_ROLE_END and self.is_system:
            raise ValueError('invalid role.id')

        super(Role, self).save(*args, **kwargs)

    @classmethod
    def role_id(cls, org_id, name):
        return Role.objects \
            .using(shard_id(org_id)) \
            .getx(name=name).id

    class Meta:
        db_table = 'acl_role'


class UserRole(_models.SimpleBaseOrgModel):
    user_id = _models.PositiveBigIntegerField()
    role = _models.PositiveBigIntegerField()
    expires_at = models.PositiveIntegerField(default=0)  # 0 means never expire

    @classmethod
    def add(cls, user_id, org_id, role_name=Role.ADMIN_ROLE_NAME, expires_at=0):
        return cls.objects \
            .using(shard_id(org_id)) \
            .get_or_create(
                user_id=user_id,
                role=Role.role_id(org_id, role_name),
                defaults={'expires_at': expires_at}
            )[0]

    @classmethod
    def has(cls, user_id, role, org_id):
        r = UserRole.objects \
            .using(shard_id(org_id)) \
            .getx(user_id=user_id, role=role)
        return r is not None and (r.expires_at == 0 or r.expires_at > current_timestamp())

    @classmethod
    def user_list(cls, org_id, role_name=Role.ADMIN_ROLE_NAME):
        r = cls.objects\
            .using(shard_id(org_id))\
            .filter(role=Role.role_id(org_id, role_name))\
            .filter(Q(expires_at=0) | Q(expires_at__gt=current_timestamp()))\
            .values_list('user_id', flat=True)
        return list(r)

    def to_dict(self):
        ret = super(UserRole, self).to_dict()
        ret['role'] = Role.objects \
            .using(self._state.db) \
            .get_or_none(id=self.role).name

        del ret['id']

        return ret

    class Meta:
        db_table = 'acl_user_role'
        unique_together = ('user_id', 'role', )


class RuleDescriptor(_models.BaseModel):
    (PERMISSION_CREATE,
     PERMISSION_VIEW,
     PERMISSION_UPDATE,
     PERMISSION_DELETE) = (1, 2, 4, 8)

    PERMISSION_ALL = PERMISSION_CREATE | PERMISSION_VIEW | PERMISSION_UPDATE | PERMISSION_DELETE

    (ALLOW, DENY) = list(range(1, 3))

    role = _models.PositiveBigIntegerField()
    resource_descriptor = JSONCharField(max_length=4096 * 16)
    permission = models.PositiveSmallIntegerField()
    allow_or_deny = models.PositiveSmallIntegerField()
    priority = models.PositiveSmallIntegerField(db_index=True)
    is_system = models.PositiveSmallIntegerField(db_index=True)

    class Meta:
        db_table = 'acl_rule_descriptor'


class Resource(object):
    def __init__(self, desc, args):
        self.desc = desc
        self.args = args

    def __repr__(self):
        return 'Resource(desc=%s, args=%s)' % (self.desc, self.args)


class ACL(object):

    @classmethod
    def is_allowed(cls, user_id, resource, permission):
        # print('----test permission: ', user_id, resource)
        org_id = 0 if 'org_id' not in resource.args else resource.args['org_id']
        for v in cls._load_rules(org_id):
            rule = Rule(v)
            # print('----build rule: ', rule.rule_descriptor.to_dict())
            if not rule.match(resource, permission):
                continue

            # print('----match rule: ', rule.rule_descriptor.to_dict())
            r = rule.check(user_id, resource, permission)
            if r not in (RuleDescriptor.ALLOW, RuleDescriptor.DENY):
                continue

            # print('----match rule result: ', r, resource)
            if r == RuleDescriptor.DENY:
                log.info(
                    "permission denied by rule: %s, resource: %s, permission: %s, user_id: %s",
                    v.id, resource, permission, user_id)

            return r == RuleDescriptor.ALLOW

        # print('----denied by default rule')
        log.info(
            "permission denied by default rule: %s, resource: %s, permission: %s, user_id: %s",
            v.id, resource, permission, user_id)

        return False

    @classmethod
    def _load_rules(cls, org_id):
        if org_id:
            from apps.acl.default_rules import default_org_rules as rules
        else:
            from apps.acl.default_rules import default_global_rules as rules

        return [RuleDescriptor(**r) for r in rules]


class Rule(object):

    RESOURCE_DESCRIPTOR_MODULE_NAME = 'apps.acl.resource_descriptors'

    SYSTEM_ROLE_MODULE_NAME = 'apps.acl.roles'

    def __init__(self, rule_descriptor):
        self.rule_descriptor = rule_descriptor

        klass = Rule._load_class(
            self.RESOURCE_DESCRIPTOR_MODULE_NAME,
            self.rule_descriptor.resource_descriptor['class'])

        o = klass()
        o.descriptor = rule_descriptor.resource_descriptor

        self.resource_descriptor = o

    def match(self, resource, permission):
        return (permission & self.rule_descriptor.permission) \
            and self.resource_descriptor.match(resource)

    def check(self, user_id, resource, permission):
        org_id = 0 if 'org_id' not in resource.args else resource.args['org_id']
        if self.rule_descriptor.role > Role.RESERVED_ROLE_END:
            if UserRole.has(
                    user_id, self.rule_descriptor.role, org_id):
                return self.rule_descriptor.allow_or_deny
        else:
            klass = Rule._load_class(
                self.SYSTEM_ROLE_MODULE_NAME,
                SystemRole.ROLE_CLASSES[self.rule_descriptor.role])

            o = klass(resource.args)
            o.resource = resource
            if o.has_or_is(user_id):
                return self.rule_descriptor.allow_or_deny

    @classmethod
    def _load_class(cls, module_name, class_name):
        return getattr(importlib.import_module(module_name), class_name)


class ResourceFilterDescriptor(_models.BaseModel):
    resource_type = models.PositiveSmallIntegerField(db_index=True)
    descriptor = JSONCharField(max_length=4096 * 16)

    class Meta:
        db_table = 'acl_resource_filter_descriptor'


class ResourceFilter(object):
    def __init__(self, descriptor, org_id):
        self.descriptor = descriptor
        self.org_id = org_id

    def filter(self, user_id):
        pass

    def has_permission(self, user_id, resource_id):
        pass


class ResourceFilterManager(object):
    (RESOURCE_TYPE_PROJECT,
     RESOURCE_TYPE_FILE) = list(range(2))

    @classmethod
    def filter(cls, org_id, resource_type, user_id):
        r = set()
        for f in cls._filters(org_id, resource_type):
            r = r | set(f.filter(user_id))
        return r

    @classmethod
    def has_permission(cls, org_id, resource_type, user_id, resource_id):
        for f in cls._filters(org_id, resource_type):
            if f.has_permission(user_id, resource_id):
                return True
        return False

    @classmethod
    def _filters(cls, org_id, resource_type):
        filters = []
        for i in cls._load_rules(org_id, resource_type):
            klass = cls._load_filter_class(i.descriptor['class'])
            filters.append(klass(i.descriptor, org_id))

        return filters

    @classmethod
    def _load_filter_class(cls, class_name):
        app, _class_name = class_name.split('.')
        module_name = 'apps.%s.filter' % app
        return getattr(importlib.import_module(module_name), _class_name)

    @classmethod
    def _load_rules(cls, org_id, resource_type):
        from apps.acl.default_rules import default_resource_filter_rules
        return [
            ResourceFilterDescriptor(**r)
            for r in default_resource_filter_rules if r['resource_type'] == resource_type
        ]


class PermissionRule(object):
    SYSTEM_ROLE_MODULE_NAME = 'apps.acl.roles'

    @classmethod
    def check(cls, user_id, role, kwargs):
        if role is None:  # do default permission check
            if 'org_id' in kwargs:
                role = SystemRole.ORG_MEMBER
            else:
                role = SystemRole.REGISTERED_USER

        klass = Rule._load_class(
            cls.SYSTEM_ROLE_MODULE_NAME,
            SystemRole.ROLE_CLASSES[role])

        return klass(**kwargs).has_or_is(user_id)
