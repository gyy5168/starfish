from rest_framework.response import Response

from common.const import ErrorCode
from common.viewset import ViewSet


class PropertiesViewSet(ViewSet):

    def list(self, request):
        return Response({'errcode': ErrorCode.OK, 'data': ErrorCode.error_message})
