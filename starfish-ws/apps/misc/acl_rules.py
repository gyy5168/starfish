from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# # GUEST 下载
# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'download'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_global_rules.append(r)

# # 微信通知
# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'wechat-notify'},
#     'permission': RuleDescriptor.PERMISSION_CREATE,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_global_rules.append(r)
#
# # 微信通知检查
# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'wechat-notify'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_global_rules.append(r)

# GUEST 访问静态文件
r = {
    'role': SystemRole.GUEST,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'django.contrib.staticfiles.views.serve'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)
