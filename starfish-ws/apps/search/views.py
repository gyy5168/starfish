from rest_framework.response import Response
from apps.search.utils import SearchObject
from common.const import ErrorCode
from common.viewset import ViewSet

import logging
log = logging.getLogger(__name__)


class SearchViewSet(ViewSet):
    def search(self, request, org_id):
        data = SearchObject().search(
            request.GET['q'], org_id, int(request.GET['type']),
            page=int(request.GET.get('page', 1)),
            count=int(request.GET.get('count', 10)),
            highlight=int(request.GET.get('highlight', 0)),
            user=request.current_uid,
            time_order=int(request.GET.get('time_order', 0)),
            is_detail=int(request.GET.get('is_detail', 0)),
            conversation=int(request.GET.get('conversation', 0))
        )
        return Response({'errcode': ErrorCode.OK, 'data': data})


class SearchConversationViewSet(ViewSet):
    def search(self, request, org_id):
        data = SearchObject().aggregate_msg_conversations(
            request.GET['q'], org_id,
            user=request.current_uid,
            highlight=int(request.GET.get('highlight', 0))
        )
        return Response({'errcode': ErrorCode.OK, 'data': data})
