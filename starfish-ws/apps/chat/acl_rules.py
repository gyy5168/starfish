from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# ORG_MEMBER 下载聊天附件
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'multimedia-chat-attachment'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)
