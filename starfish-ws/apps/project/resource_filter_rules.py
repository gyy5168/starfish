from apps.acl.models import ResourceFilterManager

default_resource_filter_rules = []

r = {
    'resource_type': ResourceFilterManager.RESOURCE_TYPE_PROJECT,
    'descriptor': {'class': 'project.AdminAccessAllResourceFilter'},
}
default_resource_filter_rules.append(r)

r = {
    'resource_type': ResourceFilterManager.RESOURCE_TYPE_PROJECT,
    'descriptor': {'class': 'project.ProjectMemberAccessProjectResourceFilter'},
}
default_resource_filter_rules.append(r)

r = {
    'resource_type': ResourceFilterManager.RESOURCE_TYPE_PROJECT,
    'descriptor': {'class': 'project.ProjectManagerAccessProjectResourceFilter'},
}
default_resource_filter_rules.append(r)
