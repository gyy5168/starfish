import json
import logging

from apps.acl.models import PermissionRule, ResourceFilterManager
from common.const import ErrorCode
from common.exceptions import APIError
from common.globals import set_current_request
from common.utils import current_timestamp, shard_id
from django.conf import settings
from django.db import connection
from django.http import HttpResponse, HttpResponseForbidden
from django.utils.cache import patch_vary_headers
from django.utils.http import cookie_date
from django.utils.importlib import import_module
from django.contrib.auth.models import AnonymousUser
from oauth2_provider.oauth2_validators import OAuth2Validator

log = logging.getLogger(__name__)


class GlobalRequestMiddleware(object):
    """ Simple middleware that adds the request object in thread local storage."""
    def process_request(self, request):
        set_current_request(request)


class DisableCSRFMiddleware(object):
    def process_request(self, request):
        setattr(request, '_dont_enforce_csrf_checks', True)


class ParametersConverterMiddleware(object):
    INTEGER_PARAMS = (
        'org_id', 'group_id', 'user_id',
        'message_id',
        'mail_id', 'attachment_id',
        'task_id', 'project_id', 'tag_id',
        'file_id')

    @staticmethod
    def is_int(v):
        try:
            int(v)
            return True
        except ValueError:
            return False

    def process_view(self, request, view_func, view_args, view_kwargs):
        for k, v in list(view_kwargs.items()):
            if k in ParametersConverterMiddleware.INTEGER_PARAMS and self.is_int(v):
                view_kwargs[k] = int(v)


class OrgIdCheckMiddleware(object):
    def process_view(self, request, view_func, view_args, view_kwargs):
        org_id = view_kwargs.get('org_id')
        if org_id is None:
            return

        from django.conf import settings
        from common.utils import valid_org
        if shard_id(org_id) not in settings.DATABASES or not valid_org(org_id):
            errcode = ErrorCode.NO_SUCH_ORG
            data = {
                'error': {
                    'code': errcode,
                    'msg': ErrorCode.get_error_message(errcode)}
                }
            response = HttpResponse(json.dumps(data), content_type='application/json')
            response.data = data
            return response


class QueryLoggingMiddleware(object):
    def process_response(self, request, response):
        if not settings.DEBUG:
            return response

        for query in connection.queries:
            log.debug(query['sql'])

        return response


class SessionMiddleware(object):
    def process_request(self, request):
        engine = import_module(settings.SESSION_ENGINE)

        _session_key = None
        if 'session_id' in request.GET:
            _session_key = request.GET.get('session_id', None)

        if not _session_key:
            _session_key = request.COOKIES.get(settings.SESSION_COOKIE_NAME, None)

        if not _session_key and 'HTTP_X_SESSION_ID' in request.META:
            _session_key = request.META.get('HTTP_X_SESSION_ID', None)

        if not _session_key or _session_key.find(':') == -1:
            user_id, session_key = 0, None
        else:
            user_id, session_key = _session_key.split(':', 1)

        request.session = engine.SessionStore(int(user_id), session_key)

    def process_response(self, request, response):
        """
        If request.session was modified, or if the configuration is to save the
        session every time, save the changes and set a session cookie.
        """
        try:
            accessed = request.session.accessed
            modified = request.session.modified
        except AttributeError:
            pass
        else:
            if accessed:
                patch_vary_headers(response, ('Cookie',))
            if modified or settings.SESSION_SAVE_EVERY_REQUEST:
                if request.session.get_expire_at_browser_close():
                    max_age = None
                    expires = None
                else:
                    max_age = request.session.get_expiry_age()
                    expires_time = current_timestamp() + max_age
                    expires = cookie_date(expires_time)
                # Save the session data and refresh the client cookie.
                # Skip session save for 500 responses, refs #3881.
                if response.status_code != 500:
                    response.set_cookie(
                        settings.SESSION_COOKIE_NAME,
                        '%s:%s' % (request.session.user_id, request.session.session_key),
                        max_age=max_age,
                        expires=expires, domain=settings.SESSION_COOKIE_DOMAIN,
                        path=settings.SESSION_COOKIE_PATH,
                        secure=settings.SESSION_COOKIE_SECURE or None,
                        httponly=settings.SESSION_COOKIE_HTTPONLY or None)

        return response


class BasicACLMiddleware(object):

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not AutoSignInMiddleware.auth_required(request):
            return

        user_id = 0 if not request.session.is_authorized \
            else request.session.user_id

        role = None
        starfish_perms = getattr(request.resolver_match.func, 'starfish_api_perms', None)
        if starfish_perms:
            role = starfish_perms.get(request.method.lower())

        if not PermissionRule.check(user_id, role, view_kwargs):
            response = self._build_response(request)
            return response

    def _build_response(self, request):
        if request.session.is_authorized:
            errcode = ErrorCode.PERMISSION_DENIED
        else:
            errcode = ErrorCode.YOU_NEED_SIGN_IN

        data = {
            'error': {
                'code': errcode,
                'msg': ErrorCode.get_error_message(errcode)}
            }
        response = HttpResponse(json.dumps(data), content_type='application/json')
        response.data = data

        return response


class AppACLMiddleware(object):
    def process_view(self, request, view_func, view_args, view_kwargs):
        key = (request.method, request.resolver_match.url_name)
        if key not in self.methods:
            return

        if not self.methods[key](request, view_func, view_args, view_kwargs):
            if request.session.is_authorized:
                errcode = ErrorCode.PERMISSION_DENIED
            else:
                errcode = ErrorCode.YOU_NEED_SIGN_IN

            data = {
                'error': {
                    'code': errcode,
                    'msg': ErrorCode.get_error_message(errcode)
                }
            }
            response = HttpResponse(json.dumps(data), content_type='application/json')
            response.data = data
            return response


class ProjectACLMiddleware(AppACLMiddleware):
    def __init__(self):
        self.methods = {
            ('GET', 'project-app-project-detail'): self._check_retrieve_project,
            ('PATCH', 'project-app-project-detail'): self._check_modify_project,

            ('DELETE', 'project-app-task-detail'): self._check_retrieve_task,
            ('PATCH', 'project-app-task-detail'): self._check_retrieve_task,
            ('GET', 'project-app-task-detail'): self._check_retrieve_task,

            ('POST', 'project-app-tags-list'): self._check_retrieve_project,
            ('PATCH', 'project-app-tag-detail'): self._check_retrieve_project,
            ('DELETE', 'project-app-tag-detail'): self._check_retrieve_project,

            ('POST', 'project-app-project-members-list'): self._check_retrieve_project,
            ('DELETE', 'project-app-project-members-list'): self._check_retrieve_project,

            ('PATCH', 'project-app-task-tags-list'): self._check_retrieve_task,
            ('GET', 'project-app-task-tags-list'): self._check_retrieve_task,

            ('DELETE', 'project-app-task-comment-detail'): self._check_retrieve_task,
            ('DELETE', 'project-app-task-attachment-detail'): self._check_retrieve_task,
            ('DELETE', 'project-app-task-tag-detail'): self._check_retrieve_task,
        }

    def _check_retrieve_project(self, request, view_func, view_args, view_kwargs):
        from apps.account.models import User
        u = User.objects \
            .get_or_none(id=request.session.user_id)
        if u.is_admin(view_kwargs.get('org_id')):
            return True

        return ResourceFilterManager.has_permission(
            view_kwargs.get('org_id'),
            ResourceFilterManager.RESOURCE_TYPE_PROJECT,
            request.session.user_id,
            view_kwargs.get('project_id'))

    def _check_modify_project(self, request, view_func, view_args, view_kwargs):
        from apps.account.models import User
        u = User.objects \
            .get_or_none(id=request.session.user_id)
        if u.is_admin(view_kwargs.get('org_id')):
            return True

        from apps.project.models import Project

        if self._check_retrieve_project(request, view_func, view_args, view_kwargs):
            project_id = view_kwargs.get('project_id')
            p = Project.objects.using(view_kwargs.get('org_id')).getx(id=project_id)
            if p and p.person_in_charge == request.session.user_id:
                return True

        return False

    def _check_retrieve_task(self, request, view_func, view_args, view_kwargs):
        from apps.project.models import Task

        task_id = view_kwargs.get('task_id')
        task_ids = [task_id] if isinstance(task_id, int) else [int(i) for i in task_id.split(',')]
        for tid in task_ids:
            task = Task.objects \
                .using(shard_id(view_kwargs.get('org_id'))) \
                .get_or_none(id=tid)
            if not task:
                continue

            r = ResourceFilterManager.has_permission(
                view_kwargs.get('org_id'),
                ResourceFilterManager.RESOURCE_TYPE_PROJECT,
                request.session.user_id,
                task.project_id)
            if not r:
                return False

        return True


class MailACLMiddleware(AppACLMiddleware):
    def __init__(self):
        self.methods = {
            ('GET', 'mail-app-mail-attachment'): self._check_retrieve_mail,
            ('GET', 'mail-app-mail-detail'): self._check_retrieve_mail,
            ('PATCH', 'mail-app-mail-detail'): self._check_retrieve_mail,
        }

    def _check_retrieve_mail(self, request, view_func, view_args, view_kwargs):
        from apps.mail.models import UserMail
        from common.utils import list_ids
        org_id = view_kwargs.get('org_id')

        r = UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(mail_id__in=list_ids(view_kwargs.get('mail_id')))
        if not r:
            return True

        for v in r:
            if v.user_id == request.session.user_id:
                return True

        return False


class UserACLMiddleware(AppACLMiddleware):
    def __init__(self):
        self.methods = {
            ('PATCH', 'org-detail'): self._check_is_admin,
            ('GET', 'admins-list'): self._check_is_admin,

            ('PATCH', 'org-members-list'): self._check_is_admin,
            ('PATCH', 'org-member-detail'): self._check_is_admin,
            ('DELETE', 'org-member-detail'): self._check_is_admin,

            ('POST', 'departments-list'): self._check_is_admin,
            ('PATCH', 'departments-list'): self._check_is_admin,
            ('PATCH', 'department-detail'): self._check_is_admin,
            ('POST', 'department-members-list'): self._check_is_admin,
            ('DELETE', 'department-member-detail'): self._check_is_admin,
            ('PATCH', 'user-departments'): self._check_is_admin,

            ('PATCH', 'external-contact-detail'): self._check_is_admin,
            ('DELETE', 'external-contact-detail'): self._check_is_admin,

            ('GET', 'discussion-group-avatar'): self._check_retrieve_discussion_group,

            ('PATCH', 'discussion-groups-list'): self._check_is_admin,
            ('PATCH', 'discussion-group-detail'): self._check_update_discussion_group,
            ('DELETE', 'discussion-group-detail'): self._check_update_discussion_group,
        }

    def _check_is_admin(self, request, view_func, view_args, view_kwargs):
        from apps.account.models import User
        u = User.objects \
            .get_or_none(id=request.session.user_id)
        return u.is_admin(view_kwargs.get('org_id'))

    def _check_update_discussion_group(self, request, view_func, view_args, view_kwargs):
        org_id = view_kwargs.get('org_id')
        from apps.account.models import User
        u = User.objects \
            .get_or_none(id=request.session.user_id)
        if u.is_admin(org_id):
            return True

        from apps.org.models import DiscussionGroup
        group_id = view_kwargs.get('group_id')
        group = DiscussionGroup.objects \
            .using(org_id) \
            .getx(id=group_id, is_disbanded=0)
        if not group:
            raise APIError(ErrorCode.NO_SUCH_DISCUSSION_GROUP, org_id=org_id, group_id=group_id)
        project = group.related_project()
        if project:
            return request.session.user_id == project.person_in_charge
        else:
            return group.has_user(request.session.user_id)

    def _check_retrieve_discussion_group(self, request, view_func, view_args, view_kwargs):
        from apps.org.models import DiscussionGroup
        g = DiscussionGroup.objects \
            .using(shard_id(view_kwargs.get('org_id'))) \
            .get_or_none(id=view_kwargs.get('group_id'))
        if not g:
            return False

        from apps.org.models import UserDiscussionGroup
        r = UserDiscussionGroup.objects \
            .using(shard_id(view_kwargs.get('org_id'))) \
            .filter(
                group_id=view_kwargs.get('group_id'),
                user_id=request.session.user_id)
        return bool(r)


class OAuth2TokenMiddleware(object):
    def process_view(self, request, view_func, view_args, view_kwargs):
        if not request.META.get('HTTP_AUTHORIZATION', '').startswith('Bearer '):
            return

        token = request.META.get('HTTP_AUTHORIZATION', '')[7:]
        scopes = self.build_scopes(request)
        if not OAuth2Validator().validate_bearer_token(token, scopes, request):
            return HttpResponseForbidden()

        engine = import_module(settings.SESSION_ENGINE)

        request.session = engine.SessionStore(request.user.id)
        request.session._is_authorized = True  # TODO OAuth ugly

    def build_scopes(self, request):
        if request.method.upper() in ('POST', 'PATCH', 'DELETE', 'PUT'):
            return ['read', 'write']
        return ['read']


class AutoSignInMiddleware(object):
    URLS_NEED_NOT_SIGNIN = (
        ('POST',   'permissions-list'),
        ('GET',    'tokens-list'),
        ('POST',   'tokens-list'),
        ('PATCH',  'user-self'),
        ('GET',    'users-list'),
        ('POST',   'users-list'),
        ('DELETE', 'session-self'),
        ('POST',   'sessions-list'),
        ('GET',    'versions-list'),
        ('GET',    'latest-versions-list'),
    )

    @classmethod
    def auth_required(cls, request):
        # oauth2
        if request.path.startswith('/o/'):
            return False

        # accounts/login URL
        if request.path.startswith('/accounts/login/'):
            return False

        if request.path == '/__debug__/render_panel/':
            return False

        for method, url_name in cls.URLS_NEED_NOT_SIGNIN:
            if method == request.method.upper() and \
                    url_name == request.resolver_match.url_name:
                return False

        return True

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not AutoSignInMiddleware.auth_required(request):
            return

        if request.session.is_authorized:
            return

        from apps.account.views import SessionViewSet

        r = SessionViewSet._create_by_remember_token(request)
        if r.data['errcode'] != ErrorCode.OK:
            return

        # renew session object
        request.session._is_authorized = True

        # save signin response and cookies
        request._auto_signin_extra = r.data['data']
        request._auto_signin_cookies = r.cookies


class FormatResponseMiddleware(object):
    def process_response(self, request, response):
        if 'Content-Type' not in response or response['Content-Type'] != 'application/json':
            return response

        if not hasattr(response, 'data'):
            return response

        if 'error' not in response.data:
            return response

        if response.data['error']['code'] in \
                (ErrorCode.YOU_NEED_SIGN_IN, ErrorCode.PERMISSION_DENIED):
            response['X-Starfish-Error'] = 'permission denied'

        return response


class CurrentUserMiddleware(object):
    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.session.is_authorized:
            from apps.account.models import User
            from django.utils.functional import SimpleLazyObject

            setattr(request, 'current_uid', request.session.user_id)

            user = SimpleLazyObject(lambda: User.objects.getx(id=request.current_uid))

            setattr(request, 'current_user', user)
            setattr(request, 'user', user)
        else:
            setattr(request, 'current_uid', 0)
            setattr(request, 'current_user', None)
            setattr(request, 'user', AnonymousUser())

        log.info(
            '%s %s user_id=%s',
            request.method, request.get_full_path(), request.current_uid)

        org_id = view_kwargs.get('org_id')
        if org_id:
            from apps.org.models import Org
            setattr(request, 'current_org_id', org_id)
            setattr(request, 'current_org', Org.objects.getx(id=org_id))
        else:
            setattr(request, 'current_org_id', 0)
            setattr(request, 'current_org', None)
