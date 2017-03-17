from django.conf.urls import patterns, url

from apps.chat import views

multimedia_chat_attachment = views.MultimediaChatAttachmentView.as_view()

urlpatterns = patterns(
    '',
    url(r'^v1/orgs/(?P<org_id>\d+)/chats/(?P<chat_id>\d+)/attachment',
        multimedia_chat_attachment, name='multimedia-chat-attachment'),
)
