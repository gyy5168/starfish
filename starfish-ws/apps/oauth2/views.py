import logging

from django.shortcuts import render, redirect
from django.template import RequestContext

from apps.account.models import User
from apps.account.views import SessionViewSet

from common.viewset import ViewSet

log = logging.getLogger(__name__)


class LoginViewSet(ViewSet):
    def get(self, request):
        return render(
            request,
            'oauth2/accounts_login.html',
            context={
                'next': request.GET['next'],
            },
            context_instance=RequestContext(request)
        )

    def post(self, request):
        qs = User.objects.filter(phone=request.DATA.get('phone', None)).order_by('id')
        if qs.exists():
            u = qs[0]
        else:
            u = None

        if not u or not u.auth(request.DATA['password']):
            raise ValueError('bad username or password.')

        SessionViewSet._create_by_user(request, u)

        return redirect(request.DATA['next'])
