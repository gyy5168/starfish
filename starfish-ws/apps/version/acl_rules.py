from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# REGISTERED_USER 访问版本列表
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'versions-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 发布版本
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'versions-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 管理版本
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'versions-manage'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 删除版本
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'version-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)
