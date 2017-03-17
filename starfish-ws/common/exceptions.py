import logging
import random
from common.const import ErrorCode
from common.globals import get_current_user_id, get_current_org_id

log = logging.getLogger(__name__)


class APIError(Exception):
    def __init__(self, error_code, log_level='error', **extra):
        self.log_level = log_level
        self.error_code = error_code
        self.extra = extra

    def __str__(self):
        return '%s, extra: %s' % (ErrorCode.get_error_message(self.error_code), self.extra)


def final_exception_handler(exc):
    # All http response status code is 200.
    # DO NOT Call REST framework's default exception handler to get the standard error response.
    # response = exception_handler(exc)
    # if response is not None:
        # return response
    from rest_framework.response import Response

    if isinstance(exc, APIError):
        response = Response({
            'error': {
                'code': exc.error_code,
            }
        })
    else:
        r = {
            'error': {
                'code': ErrorCode.UNKNOWN_ERROR,
                'msg': "%s: %s" %
                (ErrorCode.get_error_message(ErrorCode.UNKNOWN_ERROR), exc.__repr__())
            }
        }
        response = Response(r)

    from common.globals import get_current_request
    request = get_current_request()
    log_txt = ''
    if request:
        log_txt = "request: [%s:%s] GET=%s DATA=%s COOKIES=%s" % (
            request.method, request.path, request.GET, request.DATA, request.COOKIES)

    s = 'final_exception_handler: [%s][%s:%s] errcode=%s, %s\n%s' \
        % (random.randint(100000, 999999),
           get_current_org_id(),
           get_current_user_id(),
           response.data['error']['code'],
           str(exc),
           log_txt)

    if getattr(exc, 'log_level', 'error') == 'warning':
        log.warning(s)
    else:
        log.exception(s)

    return response
