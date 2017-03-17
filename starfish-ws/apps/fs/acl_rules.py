from apps.acl.models import SystemRole, RuleDescriptor

default_org_rules = []
default_global_rules = []

# ORG_MEMBER 新建文件
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'files-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 更新文件
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'file-detail'},
    'permission': RuleDescriptor.PERMISSION_UPDATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 访问文件
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'file-detail'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 下载文件
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'file-download-file'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 删除文件
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'file-detail'},
    'permission': RuleDescriptor.PERMISSION_DELETE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 打包下载文件
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'files-bundle'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 访问目录
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'dir-children'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 查看目录
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'files-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)


# ORG_MEMBER 获取角色
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'files-role-list'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 创建角色
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'files-role-list'},
    'permission': RuleDescriptor.PERMISSION_CREATE,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)

# ORG_MEMBER 检查文件存在
r = {
    'role': SystemRole.ORG_MEMBER,
    'resource_descriptor': {
        'class': 'SimpleResourceDescriptor',
        'desc': 'check-file'},
    'permission': RuleDescriptor.PERMISSION_VIEW,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 10,
    'is_system': 1,
}
default_org_rules.append(r)