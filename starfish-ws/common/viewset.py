import logging
from django.utils.decorators import classonlymethod

from rest_framework import viewsets
from rest_framework.response import Response

from apps.account.models import User

from common.const import ErrorCode
from common.globals import set_current_request

log = logging.getLogger(__name__)


class ViewSet(viewsets.ViewSet):
    MAX_PAGE_COUNT = 0xffff
    DEFAULT_PAGE_COUNT = 10

    def __init__(self, *args, **kwargs):
        super(ViewSet, self).__init__(*args, **kwargs)

    @classonlymethod
    def as_view(cls, actions={}, **initkwargs):
        starfish_api_perms = {}
        for method, action in actions.items():
            if isinstance(action, (tuple, list)):
                actions[method] = action[0]
                starfish_api_perms[method] = action[1]

        view = super(ViewSet, cls).as_view(actions, **initkwargs)

        view.starfish_api_perms = starfish_api_perms
        return view

    def paging(self, request, queryset, default_count=DEFAULT_PAGE_COUNT, ordering=None):
        page = int(request.GET.get('page', 1))
        count = int(request.GET.get('count', default_count))
        if not queryset.ordered and ordering:
            queryset = queryset.order_by(ordering)
        queryset = queryset[(page-1)*count: page*count]
        return queryset

    def initial(self, request, *args, **kwargs):
        super(ViewSet, self).initial(request, *args, **kwargs)
        set_current_request(request)

        if request.session.is_authorized:
            u = User.objects.get_or_none(id=request.session.user_id)
            if not u:
                raise RuntimeError('no such user')

            setattr(request, 'current_uid', request.session.user_id)
            setattr(request, 'current_user', u)
        else:
            setattr(request, 'current_uid', 0)
            setattr(request, 'current_user', None)

    def finalize_response(self, request, response, *args, **kwargs):
        if not isinstance(response, Response):
            return super(ViewSet, self).finalize_response(request, response, *args, **kwargs)

        # add auto signin response and cookies
        if hasattr(request, '_auto_signin_extra'):
            response.data['extra'] = request._auto_signin_extra
            response.cookies = request._auto_signin_cookies

        if 'errcode' in response.data:
            response.data['error'] = {
                'code': response.data['errcode'],
                'msg': ErrorCode.get_error_message(response.data['errcode'])
            }

            del response.data['errcode']

        log.info(
            "REQUEST PARAMS[%s]: %s: %s GET=%s POST=%s COOKIES=%s",
            request.META.get('HTTP_USER_AGENT'), request.method, request.path,
            request.GET, request.DATA, request.COOKIES)

        return super(ViewSet, self).finalize_response(request, response, *args, **kwargs)

    """
    def list(self, request):
        pass

    def create(self, request):
        pass

    def retrieve(self, request, pk=None):
        pass

    def update(self, request, pk=None):
        pass

    def partial_update(self, request, pk=None):
        pass

    def destroy(self, request, pk=None):
        pass
    """
