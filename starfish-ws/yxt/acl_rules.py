from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'yxt-sessions-list'},
#     'permission': RuleDescriptor.PERMISSION_CREATE,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 1,
#     'is_system': 1,
# }
# default_global_rules.append(r)
#
# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'yxt-pub-key'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 1,
#     'is_system': 1,
# }
# default_global_rules.append(r)