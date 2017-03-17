import json
from django.http import HttpResponse
from common.const import ErrorCode


import logging
log = logging.getLogger(__name__)


class YxtBlockMiddleware(object):
    def __init__(self):
        self.methods = {
            ('POST', 'orgs-list'),
            ('POST', 'invite-page'),
            ('POST', 'users-list'),
            ('POST', 'tokens-list'),
            ('PATCH','user-self')

        }

    def process_view(self, request, view_func, view_args, view_kwargs):
        key = (request.method, request.resolver_match.url_name)
        if key not in self.methods:
            return
        else:
            errcode = ErrorCode.API_IS_NOT_SUPPORTED
            data = {
                'errcode': errcode,
                'errmsg': '%s: %s, %s' % (ErrorCode.get_error_message(errcode), key[0], key[1])
            }
            response = HttpResponse(json.dumps(data), content_type='application/json')
            response.data = data
            return response
