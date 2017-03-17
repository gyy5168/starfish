from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# # GUEST 提交申请
# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'applications-list'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_global_rules.append(r)

# REGISTERED_USER 导出申请
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'applications-list-export'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)
