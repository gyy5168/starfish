from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# REGISTERED_USER 获取 USER 详情
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'user-detail'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

#  REGISTERED_USER 获取自己的 USER 详情
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'user-self'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)


# REGISTERED_USER 查看设备列表
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'user-agents'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 删除设备
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'agent-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 离线设备
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'agent-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 查看用户头像
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'user-avatar'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 获取 USER SUMMARY
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'user-summary'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 获取 UNREAD COUNT
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'user-all-unread-count'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)
