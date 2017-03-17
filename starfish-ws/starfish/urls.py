from django.conf import settings
from django.conf.urls import patterns, url, include

from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from apps.account.urls import urlpatterns as account_urlpatterns
from apps.org.urls import urlpatterns as org_urlpatterns
from apps.chat.urls import urlpatterns as chat_urlpatterns
from apps.mail.urls import urlpatterns as mail_urlpatterns
from apps.project.urls import urlpatterns as task_urlpatterns
from apps.i18n.urls import urlpatterns as i18n_urlpatterns
from apps.message.urls import urlpatterns as message_urlpatterns
from apps.version.urls import urlpatterns as version_urlpatterns
from apps.acl.urls import urlpatterns as acl_urlpatterns
from apps.application.urls import urlpatterns as application_urlpatterns
from apps.misc.urls import urlpatterns as misc_urlpatterns
from apps.search.urls import urlpatterns as search_urlpatterns
from apps.oauth2.urls import urlpatterns as oauth2_urlpatterns
from apps.fs.urls_v2 import urlpatterns as fs_urlpatterns_v2
from yxt.urls import urlpatterns as yxt_urlpatterns


urlpatterns = patterns(
    '',
    url(r'^o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
)

urlpatterns += staticfiles_urlpatterns()

urlpatterns += account_urlpatterns
urlpatterns += org_urlpatterns
urlpatterns += chat_urlpatterns
urlpatterns += mail_urlpatterns
urlpatterns += task_urlpatterns
urlpatterns += i18n_urlpatterns
urlpatterns += message_urlpatterns
urlpatterns += version_urlpatterns
urlpatterns += acl_urlpatterns
urlpatterns += application_urlpatterns
urlpatterns += misc_urlpatterns
urlpatterns += search_urlpatterns
urlpatterns += oauth2_urlpatterns
urlpatterns += yxt_urlpatterns
urlpatterns += fs_urlpatterns_v2

if settings.DEBUG:
    import debug_toolbar
    urlpatterns += patterns(
        '',
        url(r'^__debug__/', include(debug_toolbar.urls)),
    )
