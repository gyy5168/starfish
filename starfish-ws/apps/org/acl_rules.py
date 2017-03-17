from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# REGISTERED_USER 创建 ORG
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'orgs-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 创建邀请
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'invitations-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 更新邀请
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'invitation-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# # GUEST 创建 TOKEN
# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'tokens-list'},
#     'permission': RuleDescriptor.PERMISSION_CREATE,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_global_rules.append(r)

# # GUEST 查询 TOKEN
# r = {
#     'role': SystemRole.GUEST,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'tokens-list'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_global_rules.append(r)

# REGISTERED_USER 查询 INVITATION_CODE
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'invitation-codes-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 查看 组织状态
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'orgs-status'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_global_rules.append(r)

# REGISTERED_USER 获取 ORG 详情
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-detail'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 更新 ORG 详情
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# REGISTERED_USER 查看ORG头像
r = {
    'role': SystemRole.REGISTERED_USER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-avatar'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 创建 DISCUSSION_GROUP
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'discussion-groups-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 修改 DISCUSSION_GROUP WORK_MAIL
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'discussion-groups-list'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)
#
# # USER_SELF 获取自己所在的 DISCUSSION_GROUP
# r = {
#     'role': SystemRole.USER_SELF,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'user-discussion-groups'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)

# # DISCUSSION_GROUP_MEMBER 获取 DISCUSSION_GROUP 详情
# r = {
#     'role': SystemRole.DISCUSSION_GROUP_MEMBER,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'discussion-group-detail'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)

# ORG_MEMBER 更新 DISCUSSION_GROUP 详情
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'discussion-group-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# # DISCUSSION_GROUP_MEMBER 修改 DISCUSSION_GROUP 详情
# r = {
#     'role': SystemRole.DISCUSSION_GROUP_MEMBER,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'discussion-group-detail'},
#     'permission': RuleDescriptor.PERMISSION_UPDATE,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)

# ORG_MEMBER 获取 ORG 成员列表
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-members-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 修改 ORG 成员
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-member-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 批量修改 ORG 成员
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-members-list'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 更新 ORG 成员信息
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-member-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看 ORG 成员信息
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-member-detail'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# # DISCUSSION_GROUP_MEMBER 增加 DISCUSSION_GROUP 成员
# r = {
#     'role': SystemRole.DISCUSSION_GROUP_MEMBER,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'discussion-group-members-list'},
#     'permission': RuleDescriptor.PERMISSION_CREATE,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)

# # DISCUSSION_GROUP_MEMBER 获取 DISCUSSION_GROUP 成员列表
# r = {
#     'role': SystemRole.DISCUSSION_GROUP_MEMBER,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'discussion-group-members-list'},
#     'permission': RuleDescriptor.PERMISSION_VIEW,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)

# # DISCUSSION_GROUP_MEMBER 修改 DISCUSSION_GROUP 成员
# r = {
#     'role': SystemRole.DISCUSSION_GROUP_MEMBER,
#     'resource_descriptor': {
#         'class': 'SimpleResourceDescriptor',
#         'desc': 'discussion-group-member-detail'},
#     'permission': RuleDescriptor.PERMISSION_DELETE,
#     'allow_or_deny': RuleDescriptor.ALLOW,
#     'priority': 10,
#     'is_system': 1,
# }
# default_org_rules.append(r)


# ORG_MEMBER 查看 DISCUSSION_GROUP 成员
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'discussion-group-member-detail'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)


# ORG_MEMBER 创建 DEPARTMENT
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'departments-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 修改 DEPARTMENT WORK_MAIL
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'departments-list'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 更新 DEPARTMENT
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'department-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 访问 DEPARTMENT 列表
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'departments-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 访问 DEPARTMENT 成员列表
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'department-members-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 添加 DEPARTMENT 成员
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'department-members-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 删除 DEPARTMENT 成员
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'department-member-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 获取 DEPARTMENT 成员详情
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'department-member-detail'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)


# ORG_MEMBER 查看 DEPARTMENT 成员
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'user-departments'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 修改 DEPARTMENT 成员
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'user-departments'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看 DEPARTMENT 头像
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'discussion-group-avatar'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)


# ORG_MEMBER 查看 DEPARTMENT 头像
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'department-avatar'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看外部联系人
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'external-contacts-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 创建外部联系人
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'external-contacts-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看外部联系人
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'external-contact-detail'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 修改外部联系人
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'external-contact-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 删除外部联系人
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'external-contact-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看 EXTERNAL_CONTACT 头像
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'external_contact-avatar'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看 work mails
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'work-mails-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看自己的generated contacts
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'generated-contacts-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 获取 ORG domain列表
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-domains-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 创建 ORG domain
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-domains-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 更新 ORG domain信息
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-domain-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 删除 ORG domain
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-domain-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看org app
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-dashboard-app-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 删除org app
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-dashboard-app-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 安装org app
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-dashboard-app-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看member navigation app
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-member-navigation-app-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 添加org navigation app
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-member-navigation-app'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 删除org navigation app
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'org-member-navigation-app-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看Department items详情
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'department-item-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)
