from django.conf.urls import patterns, url
from apps.acl.models import SystemRole

from apps.mail import views

mails_list = views.MailViewSet.as_view({
    'post': 'create_send_async',
})

contacts_list = views.MailViewSet.as_view({
    'get': 'list_contacts',
})

mail_detail = views.MailViewSet.as_view({
    'patch': 'partial_update',
    'delete': 'destroy_mail',
    'get': 'retrieve',
})

subjects_list = views.MailViewSet.as_view({
    'get': ('list_subjects', SystemRole.ORG_MEMBER_SELF)
})

subject_detail = views.MailViewSet.as_view({
    'get': 'subject_detail',
    'delete': 'destroy_subject',
    'patch': 'partial_update_subject',
})

replies_list = views.MailViewSet.as_view({
    'get': 'list_mails',
})

mail_attachment = views.MailAttachmentView.as_view()

urlpatterns = patterns(
    '',
    url(r'^v1/orgs/(?P<org_id>\d+)/mail/mails$', mails_list, name='mail-app-mails-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/mail/contacts/recent$',
        contacts_list, name='mail-app-contacts-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/mail/subjects$',
        subjects_list, name='mail-app-subjects-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/mail/subjects/(?P<subject_id>\d+)$',
        subject_detail, name='mail-app-subject-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/mail/mails/(?P<mail_id>[\d,]+)$',
        mail_detail, name='mail-app-mail-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/mail/subjects/(?P<subject_id>\d+)/mails$',
        replies_list, name='mail-app-replies-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/mail/mails/(?P<mail_id>\d+)/attachments/(?P<attachment_id>\d+)$',
        mail_attachment, name='mail-app-mail-attachment'),
)
