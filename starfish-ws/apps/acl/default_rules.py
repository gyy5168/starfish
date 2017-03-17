from apps.acl.models import Role, SystemRole, RuleDescriptor

from apps.acl.acl_rules import default_global_rules as acl_default_global_rules
from apps.acl.acl_rules import default_org_rules as acl_default_org_rules
from apps.application.acl_rules import default_global_rules as application_default_global_rules
from apps.application.acl_rules import default_org_rules as application_default_org_rules
from apps.chat.acl_rules import default_global_rules as chat_default_global_rules
from apps.chat.acl_rules import default_org_rules as chat_default_org_rules
from apps.fs.acl_rules import default_global_rules as fs_default_global_rules
from apps.fs.acl_rules import default_org_rules as fs_default_org_rules
from apps.i18n.acl_rules import default_global_rules as i18n_default_global_rules
from apps.i18n.acl_rules import default_org_rules as i18n_default_org_rules
from apps.mail.acl_rules import default_global_rules as mail_default_global_rules
from apps.mail.acl_rules import default_org_rules as mail_default_org_rules
from apps.message.acl_rules import default_global_rules as message_default_global_rules
from apps.message.acl_rules import default_org_rules as message_default_org_rules
from apps.misc.acl_rules import default_global_rules as misc_default_global_rules
from apps.misc.acl_rules import default_org_rules as misc_default_org_rules
from apps.project.acl_rules import default_global_rules as project_default_global_rules
from apps.project.acl_rules import default_org_rules as project_default_org_rules
from apps.account.acl_rules import default_global_rules as account_default_global_rules
from apps.account.acl_rules import default_org_rules as account_default_org_rules
from apps.org.acl_rules import default_global_rules as org_default_global_rules
from apps.org.acl_rules import default_org_rules as org_default_org_rules
from apps.version.acl_rules import default_global_rules as version_default_global_rules
from apps.version.acl_rules import default_org_rules as version_default_org_rules
from apps.search.acl_rules import default_global_rules as search_default_global_rules
from apps.search.acl_rules import default_org_rules as search_default_org_rules
from yxt.acl_rules import default_global_rules as yxt_default_global_rules
from yxt.acl_rules import default_org_rules as yxt_default_org_rules

from apps.project.resource_filter_rules import (
    default_resource_filter_rules as project_default_resource_filter_rules)

default_org_roles = []
default_org_rules = []

default_global_roles = []
default_global_rules = []

default_resource_filter_rules = []

###########################################################################

# ADMIN ROLE
admin_role_id = Role.RESERVED_ROLE_END + 1
r = {
    'id': admin_role_id,
    'name': Role.ADMIN_ROLE_NAME,
    'is_system': 1,
}
default_org_roles.append(r)

# ADMIN RULE #
r = {
    'role': admin_role_id,
    'resource_descriptor': {'class': 'MatchAllDescriptor'},
    'permission': RuleDescriptor.PERMISSION_ALL,
    'allow_or_deny': RuleDescriptor.ALLOW,
    'priority': 20,
    'is_system': 1,
}
default_org_rules.append(r)

default_global_rules += acl_default_global_rules
default_org_rules += acl_default_org_rules
default_global_rules += application_default_global_rules
default_org_rules += application_default_org_rules
default_global_rules += chat_default_global_rules
default_org_rules += chat_default_org_rules
default_global_rules += fs_default_global_rules
default_org_rules += fs_default_org_rules
default_global_rules += i18n_default_global_rules
default_org_rules += i18n_default_org_rules
default_global_rules += mail_default_global_rules
default_org_rules += mail_default_org_rules
default_global_rules += message_default_global_rules
default_org_rules += message_default_org_rules
default_global_rules += misc_default_global_rules
default_org_rules += misc_default_org_rules
default_global_rules += project_default_global_rules
default_org_rules += project_default_org_rules
default_global_rules += account_default_global_rules
default_org_rules += account_default_org_rules
default_global_rules += org_default_global_rules
default_org_rules += org_default_org_rules
default_global_rules += version_default_global_rules
default_org_rules += version_default_org_rules
default_global_rules += search_default_global_rules
default_org_rules += search_default_org_rules
default_global_rules += yxt_default_global_rules
default_org_rules += yxt_default_org_rules

default_resource_filter_rules += project_default_resource_filter_rules

# DENY ALL RULE
r = {
    'role': SystemRole.GUEST,
    'resource_descriptor': {'class': 'MatchAllDescriptor'},
    'permission': RuleDescriptor.PERMISSION_ALL,
    'allow_or_deny': RuleDescriptor.DENY,
    'priority': 1,
    'is_system': 1,
}
default_org_rules.append(r)
