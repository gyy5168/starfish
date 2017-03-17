from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# 登陆用户获取自己全局消息的未读数目
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'global-message-unread-count'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# 登陆用户将全局消息标记为已读
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'multi-global-messages-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

###########################################################################

# ORG_MEMBER 访问消息列表
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'conversation-messages-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 将消息标记为忽略
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'conversation-messages-list'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# # ORG_MEMBER_SELF 访问自己的CONVERSATION列表
# r = {
#     'role': SystemRole.ORG_MEMBER_SELF,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'conversations-list'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)

# ORG_MEMBER 删除 conversation
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'conversation-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 更新 conversation
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'conversation-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)


# ORG_MEMBER 创建消息
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'messages-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 把消息标记为已读
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'multi-messages-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 获取消息 status
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-message-status'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)


# ORG_MEMBER 访问未读消息id列表
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'conversation-unread-message-ids-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)
