from django.conf.urls import patterns, url

from apps.i18n import views

properties_list = views.PropertiesViewSet.as_view({
    'get': 'list'
})

urlpatterns = patterns(
    '',
    url(r'^v1/i18n/properties$', properties_list, name='i18n-properties-list'),
)
