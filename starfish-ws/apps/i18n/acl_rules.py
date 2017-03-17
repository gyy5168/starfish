from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# REGISTERED_USER 访问错误代码列表
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'i18n-properties-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)
