from django.conf.urls import patterns, url

from apps.oauth2 import views

account_login = views.LoginViewSet.as_view({
    'get': 'get',
    'post': 'post',
})

urlpatterns = patterns(
    '',
    url(r'^accounts/login/$', account_login, name='account-login'),
)
