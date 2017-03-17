from django.conf.urls import patterns, url
from apps.search import views

full_search = views.SearchViewSet.as_view({
    'get': 'search',
})

search_group_by_conversations = views.SearchConversationViewSet.as_view({
    'get': 'search',
})

urlpatterns = patterns(
    '',
    url(r'^v1/orgs/(?P<org_id>\d+)/search$', full_search, name='full-search'),
    url(r'^v1/orgs/(?P<org_id>\d+)/search/conversations$',
        search_group_by_conversations, name='search-group-by-conversations'),
)
