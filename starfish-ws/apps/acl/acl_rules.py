from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# # GUEST 查询权限
# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'permissions-list'},
#     'permission': RuleDescriptor.PERMISSION_CREATE,  # query not create
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 1,
#     'is_system': 1,
# }
# default_global_rules.append(r)

# REGISTERED_USER 查询权限
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'self-permissions-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,  # query not create
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 1,
    'is_system': 1,
}
default_global_rules.append(r)

# ORG_MEMBER 获取管理员列表
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'admins-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# # ORG_CREATOR 添加管理员
# r = {
#     'role': SystemRole.ORG_CREATOR,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'admins-list'},
#     'permission': RuleDescriptor.PERMISSION_CREATE,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)

# # ORG_CREATOR 删除管理员
# r = {
#     'role': SystemRole.ORG_CREATOR,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'admin-detail'},
#     'permission': RuleDescriptor.PERMISSION_DELETE,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)

# ORG_MEMBER 查询管理员
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'admin-detail'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)