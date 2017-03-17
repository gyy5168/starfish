from apps.acl.models import SystemRole
from apps.org import views
from django.conf.urls import patterns, url

org_list = views.OrgViewSet.as_view({
    'post': 'create'
})

org_detail = views.OrgViewSet.as_view({
    'get': ('retrieve', SystemRole.REGISTERED_USER),
    'patch': 'partial_update',
})

org_members_list = views.OrgMemberViewSet.as_view({
    'get': 'list',
})

org_member_detail = views.OrgMemberViewSet.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'delete': 'destroy',
})

work_mails_list = views.OrgViewSet.as_view({
    'get': 'list_work_mails'
})

discussion_group_list = views.DiscussionGroupViewSet.as_view({
    'post': 'create',
})

user_discussion_groups = views.DiscussionGroupViewSet.as_view({
    'get': ('user_discussion_groups', SystemRole.USER_SELF)
})

discussion_group_detail = views.DiscussionGroupViewSet.as_view({
    'get': ('retrieve', SystemRole.DISCUSSION_GROUP_MEMBER),
    'patch': ('partial_update', SystemRole.DISCUSSION_GROUP_MEMBER),
    'delete': ('destroy', SystemRole.DISCUSSION_GROUP_MEMBER),
})

discussion_group_members = views.DiscussionGroupMemberViewSet.as_view({
    'post': ('create', SystemRole.DISCUSSION_GROUP_MEMBER),
    'get': ('list', SystemRole.DISCUSSION_GROUP_MEMBER),
})

discussion_group_member_detail = views.DiscussionGroupMemberViewSet.as_view({
    'delete': ('destroy', SystemRole.DISCUSSION_GROUP_MEMBER),
})

invitation_list = views.InvitationViewSet.as_view({
    'post': 'create',
})

invitation_detail = views.InvitationViewSet.as_view({
    'patch': 'partial_update'
})

department_list = views.DepartmentViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

department_detail = views.DepartmentViewSet.as_view({
    'patch': 'partial_update',
    'get': 'retrieve',
    'delete': ('destroy', SystemRole.ORG_ADMIN),
})

department_members = views.DepartmentMemberViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

department_member_detail = views.DepartmentMemberViewSet.as_view({
    'delete': 'destroy',
})

user_departments = views.DepartmentViewSet.as_view({
    'get': 'list_user_departments',
    'patch': 'update_user_departments',
})

department_items = views.DepartmentViewSet.as_view({
    'get': ('list_items', SystemRole.ORG_MEMBER),
})

external_contacts_list = views.ExternalContactView.as_view({
    'post': 'create',
    'get': 'list',
})

external_contact_detail = views.ExternalContactView.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'delete': 'destroy',
})
generated_contacts_list = views.GeneratedContactView.as_view({
    'get': 'list',
})

org_domains = views.OrgDomainViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

org_domain_detail = views.OrgDomainViewSet.as_view({
    'patch': 'partial_update',
    'delete': 'destroy',
})

org_dashboard_app_list = views.OrgAppViewSet.as_view({
    'post': 'install',
    'get': 'list',
})

org_dashboard_app_detail = views.OrgAppViewSet.as_view({
    'delete': 'uninstall',
})

org_member_navigation_app_list = views.OrgAppViewSet.as_view({
    'post': 'create_navigation_app',
    'get': 'list_navigation_app',
})

org_member_navigation_app_detail = views.OrgAppViewSet.as_view({
    'delete': 'delete_navigation_app',
})

org_invitation_list = views.OrgInvitationViewSet.as_view({
    'post': ('create', SystemRole.ORG_ADMIN),
    'get': ('list', SystemRole.ORG_ADMIN),
})

org_invitation_detail = views.OrgInvitationViewSet.as_view({
    'get': ('retrieve', SystemRole.GUEST),
})

org_invitation_detail2 = views.OrgInvitationViewSet.as_view({
    'delete': ('destroy', SystemRole.ORG_ADMIN),
})

org_invitation_user = views.OrgInvitationViewSet.as_view({
    'post': ('invite_user_to_org', SystemRole.REGISTERED_USER),
})

external_contact_avatar = views.ExternalContactAvatarView.as_view()
org_avatar = views.OrgAvatarView.as_view(SystemRole.GUEST)
group_avatar = views.DiscussionGroupAvatarView.as_view()
department_avatar = views.DepartmentAvatarView.as_view()

urlpatterns = patterns(
    '',
    url(r'^v1/orgs$', org_list, name='orgs-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)$', org_detail, name='org-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/discussion_groups$',
        discussion_group_list, name='discussion-groups-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/discussion_groups/(?P<group_id>\d+)$',
        discussion_group_detail, name='discussion-group-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/members$', org_members_list, name='org-members-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>[\d,]+)$',
        org_member_detail, name='org-member-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/discussion_groups/(?P<group_id>[\d,]+)/members$',
        discussion_group_members, name='discussion-group-members-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/discussion_groups/(?P<group_id>\d+)/members/(?P<user_id>\d+)$',
        discussion_group_member_detail, name='discussion-group-member-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/work_mails$', work_mails_list, name='work-mails-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/departments$', department_list, name='departments-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/departments/(?P<group_id>\d+)$',
        department_detail, name='department-detail'),
    url(r'^v1/orgs/(?P<org_id>\d+)/departments/(?P<group_id>[\d,]+)/members$',
        department_members, name='department-members-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/departments/(?P<group_id>\d+)/members/(?P<user_id>[\d,]+)$',
        department_member_detail, name='department-member-detail'),
    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/departments$',
        user_departments, name='user-departments'),
    url(r'^v1/orgs/(?P<org_id>\d+)/departments/(?P<group_id>[\d,]+)/items$',
        department_items, name='department-items-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/discussion_groups$',
        user_discussion_groups, name='user-discussion-groups'),

    url(r'^v1/invitations$', invitation_list, name='invitations-list'),
    url(r'^v1/invitations/(?P<invitation_id>\d+)$', invitation_detail, name='invitation-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/external_contacts$',
        external_contacts_list, name='external-contacts-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/external_contacts/(?P<external_contact_id>\d+)$',
        external_contact_detail, name='external-contact-detail'),

    url(r'^v1/external_contact-avatars/(?P<org_id>\d+)/(?P<external_contact_id>\d+)',
        external_contact_avatar, name='external_contact-avatar'),
    url(r'^v1/org-avatars/(?P<org_id>\d+)', org_avatar, name='org-avatar'),
    url(r'^v1/discussion-group-avatars/(?P<org_id>\d+)/(?P<group_id>\d+)',
        group_avatar, name='discussion-group-avatar'),
    url(r'^v1/department-avatars/(?P<org_id>\d+)/(?P<group_id>\d+)',
        department_avatar, name='department-avatar'),

    url(r'^v1/orgs/(?P<org_id>\d+)/generated_contacts$',
        generated_contacts_list, name='generated-contacts-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/domains$', org_domains, name='org-domains-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/domains/(?P<domain_id>\d+)$',
        org_domain_detail, name='org-domain-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/dashboard/apps$',
        org_dashboard_app_list, name='org-dashboard-app-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/dashboard/apps/(?P<app>\d+)$',
        org_dashboard_app_detail, name='org-dashboard-app-detail'),
    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/navigation/apps$',
        org_member_navigation_app_list, name='org-member-navigation-app-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/navigation/apps/(?P<app>\d+)$',
        org_member_navigation_app_detail, name='org-member-navigation-app-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/org_invitation$', org_invitation_list,
        name='org-invitation-list'),
    url(r'^v1/org_invitation/(?P<invitation_id>\d+)$', org_invitation_detail,
        name='org-invitation-detail'),
    url(r'^v1/orgs/(?P<org_id>\d+)/org_invitation/(?P<invitation_id>\d+)$', org_invitation_detail2,
        name='org-invitation-detail2'),

    url(r'^v1/org_invitation/user$', org_invitation_user,
        name='org-invitation-user'),
)
