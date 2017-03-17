import hashlib
import json
import logging
from decimal import Decimal

import httpagentparser
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import render
from django.template import RequestContext
from django.utils.http import cookie_date
from rest_framework.response import Response

import lifebookv2
from apps.account.models import (SIPAccount, TokenSerial, TokenType, User,
                                 UserAgent, UserAvatar,
                                 UserRememberToken, UserToken, ValidateCode,
                                 ValidateCodeAvatar, ValidateToken,
                                 WechatAccount)
from apps.misc.models import OfflineTask
from apps.org.models import (ExternalInvitation, Org, UserOrg)
from common.const import ErrorCode, Gender
from common.exceptions import APIError
from common.message_queue import send_message_to_queue
from common.utils import (BaseAvatar, WechatUtil, current_timestamp,
                          is_mobile_brower, is_phone_number, list_ids,
                          normalize_phone_number, valid_org)
from common.viewset import ViewSet

log = logging.getLogger(__name__)


class UserViewSet(ViewSet):

    def create(self, request):
        u = UserViewSet._create0(request)
        r0 = Response({'errcode': ErrorCode.OK, 'data': u.to_dict()})

        r = SessionViewSet._create_by_user(request, u)
        r.data = r0.data
        return r

    @classmethod
    def _create0(cls, request):
        if 'openid' in request.DATA:
            return cls._create_by_wechat(request)

        if 'phone' in request.DATA:
            r = cls._validate_phone(request)
            if r:
                return r

        kwargs = {
            'name': '',
            'password': User.encrypt_password(request.DATA['password']),
            'phone': '',
            'gender': Gender.GENDER_UNKNOWN,
            'intro': '',
            'avatar': cls._save_avatar(request),
        }

        for key in ('name', 'phone', 'intro', 'gender'):
            if key in request.DATA:
                kwargs[key] = request.DATA[key]

        if kwargs['phone']:
            kwargs['phone'] = normalize_phone_number(kwargs['phone'], append=False)

        u = User(**kwargs)
        try:
            with transaction.atomic():
                u.save()
        except IntegrityError:
            raise APIError(ErrorCode.DUPLICATE_PHONE_NUMBER, phone=kwargs['phone'])

        return u

    @classmethod
    def _create_by_wechat(cls, request):
        tokens, userinfo = None, None
        try:
            tokens, userinfo = WechatUtil().fetch_userinfo_by_token(request.DATA['refresh_token'])
        except WechatUtil.Error as e:
            log.exception(e)
            return Response({'errcode': ErrorCode.WECHAT_SERVER_ERROR})

        send_message_to_queue(
            settings.STARFISH_WECHAT_BIND_QUEUE_NAME,
            json.dumps(userinfo))

        r = User.wechat_account(tokens['openid'])
        if not r and \
                ('phone' not in request.DATA or 'token' not in request.DATA):
            return Response({'errcode': ErrorCode.MISSING_PHONE_AND_TOKEN})

        if 'token' in request.DATA:
            r = ValidateToken.check_token(
                request.DATA['token']['value'],
                request.DATA['phone'],
                TokenType.VALIDATE_PHONE)
            if r is not None:
                log.warning('invalid auth token 1.')
                return Response({'errcode': ErrorCode.INVALID_AUTH_TOKEN})

        account, created = WechatAccount.objects.get_or_create(
            openid=tokens['openid'],
            defaults={
                'starfish_id': 0,
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
            }
        )

        if created:
            u = User.from_wechat_userinfo_and_phone(userinfo, request.DATA['phone'])
            account.starfish_id = u.id
            account.save()
            return SessionViewSet._create_by_user(request, u)

        # wechat user already signup
        if not account.starfish_id:
            u = User.from_wechat_userinfo_and_phone(userinfo, request.DATA['phone'])
            account.starfish_id = u.id
        else:
            u = User.objects.get_or_none(id=account.starfish_id)

        account.access_token = tokens['access_token']
        account.refresh_token = tokens['refresh_token']
        account.save()

        return SessionViewSet._create_by_user(request, u)

    def retrieve(self, request, user_id):
        user_ids = list_ids(user_id)

        data = []
        for user in User.objects.filter(id__in=user_ids):
            d = user.to_dict()
            d['location'] = user.location
            data.append(d)

        return Response({'errcode': ErrorCode.OK, 'data': data})

    def user_orgs(self, request, user_id):
        org_ids = UserOrg.objects \
            .filter(user_id=user_id, is_left=0) \
            .values_list('org_id', flat=True)

        data = []
        for org_id in org_ids:
            if request.GET.get('is_admin') and not request.current_user.is_admin(org_id):
                continue

            o = Org.objects.get_or_none(id=org_id)
            if not o:
                continue

            data.append(o.to_dict())

        return Response({'errcode': ErrorCode.OK, 'data': data})

    def user_services(self, request, user_id):
        data = {
            'maxwell': self._build_maxwell_res(request, user_id),
            'sip': self._build_sip_res(request, user_id),
            'turn': self._build_turn_res(request),
            'stun': self._build_stun_res(request),
        }

        return Response({'errcode': ErrorCode.OK, 'data': data})

    def search(self, request):
        if 'openid' in request.GET:
            u = User.wechat_account(request.GET.get('openid', ''))
        elif 'phone' in request.GET:
            u = User.find_by_phone(request.GET.get('phone', ''))
        else:
            u = None

        if not u:
            return Response({'errcode': ErrorCode.NO_SUCH_USER})

        return Response({'errcode': ErrorCode.OK, 'data': u.to_dict()})

    def partial_update(self, request, user_id):
        # 提供原始密码修改密码
        if 'original_password' in request.DATA and 'password' in request.DATA:
            r = self.change_password_by_original_password(request)
            if r:
                return r

        # 提供 token 修改密码
        if 'token' in request.DATA and 'password' in request.DATA and 'phone' not in request.DATA:
            r = self.change_password_by_token(request)
            if r:
                return r

        if request.current_uid == user_id:
            self.update_user_info(request, user_id)

        return Response({'errcode': ErrorCode.OK})

    def update_user_info(self, request, user_id):
        u = User.objects.get_or_none(id=user_id)

        if 'phone' in request.DATA:
            r = self._update_phone(request, u)
            if r:
                return r

        for key in ('latitude', 'longitude'):
            if key in request.DATA:
                setattr(u, key, Decimal(request.DATA[key]))

        for key in ('name', 'intro', 'gender'):
            if key in request.DATA:
                setattr(u, key, request.DATA[key])

        if request.DATA.get('avatar_url') == '':
            u.avatar = ''
        elif request.FILES:
            u.avatar = UserViewSet._save_avatar(request)

        u.save()

        return Response({'errcode': ErrorCode.OK, 'data': u.to_dict()})

    def change_password_by_token(self, request):
        valid_types = (
            TokenType.RESET_PASSWORD_BY_PHONE,)

        r = UserToken.objects \
            .filter(token=request.DATA['token']['value']) \
            .filter(type__in=valid_types)

        if not r or len(r) > 1:
            return Response({'errcode': ErrorCode.INVALID_TOKEN})

        if r[0].is_expired():
            return Response({'errcode': ErrorCode.TOKEN_EXPIRED})

        u = User.objects.get_or_none(id=r[0].user_id)

        u.password = User.encrypt_password(request.DATA['password'])
        u.save()

        r.delete()

    def change_password_by_original_password(self, request):
        if not request.session.is_authorized:
            return Response({'errcode': ErrorCode.YOU_NEED_SIGN_IN})

        u = request.current_user
        if not u.auth(request.DATA['original_password']):
            return Response({'errcode': ErrorCode.BAD_PASSWORD})

        u.password = User.encrypt_password(request.DATA['password'])
        u.save()

        agent = request.session.store.find_agent_by_session(
            u.id, request.session.session_key)
        OfflineTask.create_password_changed_task(u.id, agent.key)

    def update_badge(self, request, user_id, device_token):
        request.session.store.update_apns_info(
            user_id,
            device_token,
            request.DATA
        )
        return Response({'errcode': ErrorCode.OK})

    def get_badge(self, request, user_id, device_token):
        return Response({'errcode': ErrorCode.OK, 'data': None})

    def _build_maxwell_res(self, request, user_id):
        return {
            'endpoint': request.session.endpoints['maxwell_frontend_pub'],
            'username': user_id,
            'password': request.session.session_key,
        }

    def _build_sip_res(self, request, user_id):
        # TODO DRI
        return {
            # switch to FreeSWITCH
            'registrar': '123.56.45.157',
            'proxy_server': '123.56.45.157',
            'username': user_id,
            'password': self._update_opensips_account(user_id).password
        }

    def _build_turn_res(self, request):
        # TODO DRI
        return {
            'server': '123.57.59.182',
            'username': '',
            'password': '',
        }

    def _build_stun_res(self, request):
        # TODO DRI
        return {
            'server': '123.57.59.182',
        }

    def _update_opensips_account(self, user_id):
        return SIPAccount.get_or_create(User.objects.get_or_none(id=user_id))

    def invite(self, request):
        if request.method == 'POST':
            return self._do_invite(request)

        invitation = ExternalInvitation.objects \
            .get_or_none(security_code=request.GET.get('c'), used=0)
        if not invitation:
            raise ValueError('invalid security_code')

        if invitation.is_wechat:
            template = 'user/invite-wechat.html'
        elif is_mobile_brower(request.META['HTTP_USER_AGENT']):
            template = 'user/invite-mobile.html'
        else:
            template = 'user/invite-desktop.html'

        return render(
            request, template,
            invitation.to_dict(), context_instance=RequestContext(request))

    def _do_invite(self, request):
        invitation = ExternalInvitation.objects \
            .get_or_none(security_code=request.DATA.get('c'), used=0)
        if not invitation:
            raise ValueError('invalid security_code')

        if not is_phone_number(request.DATA['account']):
            raise ValueError('invalid phone number')

        if invitation.is_wechat:
            r = ValidateToken.check_token(
                request.DATA['token'],
                request.DATA['account'],
                TokenType.VALIDATE_PHONE)
            if r is not None:
                log.warning('invalid auth token 2.')
                return Response({'errcode': ErrorCode.INVALID_AUTH_TOKEN})

        phone = normalize_phone_number(request.DATA['account'], append=False)

        try:
            User(**{
                'name': request.DATA['name'],
                'password': User.encrypt_password(request.DATA['password']),
                'phone': phone,
                'gender': Gender.GENDER_UNKNOWN,
                'intro': '',
                'avatar': '',
            }).save()
        except IntegrityError:
            return Response({'errcode': ErrorCode.DUPLICATE_PHONE_NUMBER})

        invitation.used = 1
        invitation.save()

        from apps.version.models import Version

        return Response({
            'errcode': ErrorCode.OK,
            'download_url': Version.download_url(
                Version.http_agent_to_platform(request.META['HTTP_USER_AGENT']))
        })

    @classmethod
    def _validate_phone(cls, request):
        r = ValidateToken.check_token(
            request.DATA['token']['value'], request.DATA['phone'], TokenType.VALIDATE_PHONE)

        if r is not None:
            return Response({'errcode': r})

    @classmethod
    def _save_avatar(cls, request):
        if not request.FILES:
            return ''

        return UserAvatar.save_file(list(request.FILES.values())[0])

    def _update_phone(self, request, user):
        if not user.auth(request.DATA['password']):
            return Response({'errcode': ErrorCode.BAD_PASSWORD})

        r = ValidateToken.check_token(
            request.DATA['token']['value'],
            request.DATA['phone'],
            TokenType.VALIDATE_PHONE
        )
        if r is not None:
            return Response({'errcode': r})

        user.phone = request.DATA['phone']


class SessionViewSet(ViewSet):

    def create(self, request):
        if hasattr(request, 'DATA'):
            if 'password' in request.DATA:
                return SessionViewSet._create_by_pwd(request)

            if 'token' in request.DATA:
                return SessionViewSet._create_by_token(request)

            if 'remember_token' in request.DATA:
                return SessionViewSet._create_by_remember_token(request)

        if 'remember_token' in request.COOKIES:
            return SessionViewSet._create_by_remember_token(request)

        raise ValueError('invalid request')

    @classmethod
    def _create_by_pwd(cls, request):
        u = None
        if 'phone' in request.DATA:
            qs = User.objects.filter(phone=request.DATA['phone']).order_by('id')
            if qs.exists():
                u = qs[0]
        else:
            u = None
        if not u:
            return Response({'errcode': ErrorCode.NO_SUCH_USER})

        if not u.auth(request.DATA['password']):
            return Response({'errcode': ErrorCode.BAD_USERNAME_OR_PASSWORD})

        return cls._create_by_user(request, u)

    @classmethod
    def _create_by_token(cls, request):
        u = None
        if 'phone' in request.DATA:
            qs = User.objects.filter(phone=request.DATA['phone']).order_by('id')
            if qs.exists():
                u = qs[0]
        else:
            u = None
        if not u:
            return Response({'errcode': ErrorCode.NO_SUCH_USER})

        r = ValidateToken.check_token(
            request.DATA['token'],
            request.DATA['phone'],
            TokenType.VALIDATE_PHONE
        )
        if r:
            return Response({'errcode': r})

        return cls._create_by_user(request, u)

    # TODO refactor
    @classmethod
    def _create_by_user(cls, request, u):
        request.session.set_user_id(u.id)

        agent_key = cls._agent_key(request)
        agent = request.session.store.find_agent(u.id, agent_key)
        if not agent:
            request.session.replace_agent(
                u.id,
                agent_key,
                cls._agent_type(request),
                cls._agent_desc(request),
                settings.AGENT_AGE + current_timestamp())

        cls._update_session(request, u.id, agent_key)

        user_agent, _ = UserAgent.objects \
            .get_or_create(user_id=u.id, agent_key=agent_key)
        token_serial = TokenSerial.create(u.id)
        rem_token = UserRememberToken.create(
            serial=token_serial.id,
            agent_key=user_agent.agent_key,
            token=UserRememberToken.gen_token())

        sip_account = cls._update_opensips_account(
            u, cls._token(token_serial.serial, rem_token.token),
            request.session.session_key)

        return cls._set_cookie(
            cls._build_response(
                request,
                u.id,
                token_serial.serial,
                rem_token.token,
                sip_account.password),
            settings.SESSION_COOKIE_AGE,
            token_serial.serial, rem_token.token,
            sip_account.password)

    # TODO refactor
    @classmethod
    def _create_by_remember_token(cls, request):
        remember_token = None
        if hasattr(request, 'DATA') and 'remember_token' in request.DATA:
            remember_token = request.DATA['remember_token']
        elif 'remember_token' in request.COOKIES:
            remember_token = request.COOKIES['remember_token']
        else:
            pass

        if not remember_token or len(remember_token) <= TokenSerial.SERIAL_LENGTH:
            return cls._set_cookie(
                Response({'errcode': ErrorCode.INVALID_AUTH_TOKEN}))

        token_serial = TokenSerial.objects \
            .get_or_none(serial=remember_token[:TokenSerial.SERIAL_LENGTH])
        if not token_serial:
            log.warning('invalid auth token 4.')
            return cls._set_cookie(Response({'errcode': ErrorCode.INVALID_AUTH_TOKEN}))

        _token = remember_token[TokenSerial.SERIAL_LENGTH:]
        _rem_token = UserRememberToken.objects \
            .filter(serial=token_serial.id) \
            .filter(Q(last_token=_token) | Q(token=_token))
        rem_token = _rem_token[0] if _rem_token else None
        if not rem_token:
            r = UserRememberToken.objects \
                .filter(serial=token_serial.id)
            log.warning('invalid auth token 5, tokens: %s', [i.to_dict() for i in r])
            UserRememberToken.objects \
                .filter(serial=token_serial.id) \
                .delete()
            return cls._set_cookie(
                Response({'errcode': ErrorCode.INVALID_AUTH_TOKEN}))

        agent = request.session.store.find_agent(
            str(token_serial.user_id), rem_token.agent_key)
        if not agent:
            log.warning('invalid auth token 6.')
            return cls._set_cookie(
                Response({'errcode': ErrorCode.INVALID_AUTH_TOKEN}))

        # use old token
        if rem_token.last_token == _token:
            # too old
            if rem_token.update_at + UserRememberToken.TOKEN_AGE < current_timestamp():
                log.warning('invalid auth token 7.')
                return cls._set_cookie(
                    Response({'errcode': ErrorCode.INVALID_AUTH_TOKEN}))

            r = request.session.store \
                .find_session_by_agent(token_serial.user_id, rem_token.agent_key)
            if r:
                cls._update_session(
                    request, token_serial.user_id,
                    rem_token.agent_key, r.key)
            else:
                cls._update_session(
                    request, token_serial.user_id,
                    rem_token.agent_key)
        else:
            cls._update_session(request, token_serial.user_id, rem_token.agent_key)

            if rem_token.update_at + UserRememberToken.TOKEN_AGE < current_timestamp():
                UserRememberToken.objects \
                    .filter(id=rem_token.id, last_token=rem_token.last_token) \
                    .update(
                        last_token=rem_token.token,
                        token=UserRememberToken.gen_token(),
                        update_at=current_timestamp()
                    )

                rem_token = UserRememberToken.objects.get_or_none(id=rem_token.id)

        sip_account = cls._update_opensips_account(
            User.objects.get_or_none(id=token_serial.user_id),
            cls._token(token_serial.serial, rem_token.token),
            request.session.session_key)

        return cls._set_cookie(
            cls._build_response(
                request,
                token_serial.user_id,
                token_serial.serial,
                rem_token.token,
                sip_account.password),
            settings.SESSION_COOKIE_AGE,
            token_serial.serial, rem_token.token,
            sip_account.password)

    @classmethod
    def _update_session(cls, request, user_id, agent_key, session_key=None):
        if session_key:
            request.session.set_session_key(session_key)

        request.session \
            .set_user_id(user_id) \
            .set_agent_key(agent_key)

        # manually save
        request.session['user_id'] = user_id

        if hasattr(request, 'DATA') and 'device_token' in request.DATA:
            request.session['device_token'] = request.DATA['device_token']

            request.session.store.update_apns_info(
                user_id,
                request.DATA['device_token'],
                None,
                agent_key
            )
            log.info(
                'create user_device, user=%s, device=%s', user_id, request.DATA['device_token']
            )
        request.session.save()

    @classmethod
    def _build_response(cls, request, user_id, serial, token, sip_token):
        data = {
            'session_key': request.session.session_key,
            'user_id': user_id,
            'remember_token': cls._token(serial, token),
        }
        log.info('_build_response: %s', data)

        return Response({'errcode': ErrorCode.OK, 'data': data})

    @classmethod
    def _token(cls, serial, token):
        return serial + token

    @classmethod
    def _agent_type(cls, request):
        r = httpagentparser.detect(request.META['HTTP_USER_AGENT'])
        if 'platform' not in r or 'name' not in r['platform'] or not r['platform']['name']:
            return lifebookv2.lifebook_protocol_common_structs_pb2.BROWSER

        platforms = {
            'Android': lifebookv2.lifebook_protocol_common_structs_pb2.ANDROID,
            'iOS': lifebookv2.lifebook_protocol_common_structs_pb2.IPHONE,
            'Mac OS': lifebookv2.lifebook_protocol_common_structs_pb2.MACOSX,
            'Linux': lifebookv2.lifebook_protocol_common_structs_pb2.LINUX,
            'Windows': lifebookv2.lifebook_protocol_common_structs_pb2.WINDOWS,
        }

        if r['platform']['name'] in platforms:
            return platforms[r['platform']['name']]

        return lifebookv2.lifebook_protocol_common_structs_pb2.BROWSER

    @classmethod
    def _agent_desc(cls, request):
        if hasattr(request, 'DATA') and 'agent_desc' in request.DATA:
            return request.DATA['agent_desc']

        return request.META['HTTP_USER_AGENT']

    @classmethod
    def _agent_key(cls, request):
        if 'device_id' not in request.DATA or not request.DATA['device_id']:
            device_id = request.META['HTTP_USER_AGENT']
        else:
            device_id = request.DATA['device_id']

        log.info('device_id: %s', device_id)

        return hashlib.md5(device_id.encode('utf8')).hexdigest()

    def destroy(self, request, session_id):
        if 'device_token' in request.session:
            request.session.store.delete_apns_info(
                request.current_uid,
                request.session['device_token']
            )

            log.info(
                'remove device token, user=%s, token=%s',
                request.current_uid, request.session['device_token']
            )

        ret = request.session.store.find_agent_by_session(
            request.current_uid,
            request.session.session_key
        )
        request.session.delete()

        if ret:
            request.session.store.delete_agent(
                request.current_uid, ret.key)

        response = Response({'errcode': ErrorCode.OK})
        self._set_cookie(response, cookie_age=settings.SESSION_COOKIE_AGE)
        return response

    @classmethod
    def _set_cookie(cls, response, cookie_age=-86400, serial='', token='', sip_token=''):
        response.set_cookie(
            'remember_token',
            cls._token(serial, token),
            max_age=cookie_age,
            expires=cookie_date(cookie_age + current_timestamp()),
            domain=settings.SESSION_COOKIE_DOMAIN,
            httponly=True)

        return response

    @classmethod
    def _update_opensips_account(cls, user, token, session_key):
        # no need access opensips database
        return SIPAccount.get_or_create(user)


class TokenViewSet(ViewSet):
    def search(self, request):
        _type = int(request.GET['type'])

        if _type in (TokenType.VALIDATE_PHONE, ):
            r = ValidateToken.check_token(
                request.GET['value'], request.GET['phone'], _type)
            if r is None:
                user = User.find_by_phone(request.GET['phone'])
                if user and request.GET.get('is_auto_login') == '1':
                    response = SessionViewSet._create_by_user(request, user)
                    return response

        elif _type in (TokenType.RESET_PASSWORD_BY_PHONE, ):
            r = UserToken.check_token(request.GET['value'], _type)
        else:
            raise ValueError('invlid args')

        if r is not None:
            return Response({'errcode': ErrorCode.OK, 'data': None})

        return Response({
            'errcode': ErrorCode.OK,
            'data': {'type': _type, 'value': request.GET['value']}
        })

    def create(self, request):
        type_ = int(request.DATA['type'])
        if type_ not in UserToken.VALID_TOKEN_TYPES \
                and type_ not in ValidateToken.VALID_TOKEN_TYPES:
            raise ValueError('invalid token type')

        methods = {
            TokenType.VALIDATE_PHONE:
            self._create_validate_phone_token,

            TokenType.RESET_PASSWORD_BY_PHONE:
            self._create_reset_password_by_phone_token}

        return methods[type_](request)

    def _create_validate_phone_token(self, request):
        phone = request.DATA['phone']
        r = ValidateToken.get_or_create(phone, TokenType.VALIDATE_PHONE)
        send_message_to_queue(
            settings.STARFISH_TOKEN_QUEUE_NAME,
            json.dumps({
                'type': TokenType.VALIDATE_PHONE,
                'phone': phone,
                'token': r.token
            })
        )

        return Response({'errcode': ErrorCode.OK})

    def _create_reset_password_by_phone_token(self, request):
        u = User.objects.get_or_none(phone=request.DATA['phone'])
        if not u:
            return Response({'errcode': ErrorCode.NO_SUCH_USER})

        if u.is_fake('phone'):
            return Response({'errcode': ErrorCode.YOU_HAVE_NO_PHONE})

        r = UserToken.get_or_create(u.id, TokenType.RESET_PASSWORD_BY_PHONE)
        send_message_to_queue(
            settings.STARFISH_TOKEN_QUEUE_NAME,
            json.dumps({
                'type': TokenType.RESET_PASSWORD_BY_PHONE,
                'phone': u.phone,
                'token': r.token
            })
        )

        return Response({'errcode': ErrorCode.OK})


class AgentViewSet(ViewSet):
    OFFLINE_MESSAGE = "当前设备已经被置为离线"

    def list_by_user(self, request, user_id):
        user_ids = list_ids(user_id)

        for user_id in user_ids:
            if not request.current_user.in_same_org_with(user_id):
                return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        ret = {}
        for user_id in user_ids:
            v = []
            sessions = self._sessions(request, user_id)
            for i in request.session.store.find_agents_by_user(user_id):
                v.append({
                    'key': i.key,
                    'type': i.type,
                    'desc': i.desc.decode('utf8'),
                    'online': int(i.key in sessions)
                })

            ret[user_id] = v

        return Response({'errcode': ErrorCode.OK, 'data': ret})

    def _sessions(self, request, user_id):
        r = request.session.store.find_sessions_by_user(user_id)
        return set([i.agent_key for i in r])

    def destroy(self, request, user_id, agent_key):
        orgs = request.current_user.in_same_org_with(user_id)
        if not orgs:
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        is_admin = sum([
            1 for org_id in orgs if valid_org(org_id) and request.current_user.is_admin(org_id)
        ]) > 0
        if not is_admin and request.current_uid != user_id:
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        OfflineTask.create_remove_agent_task(user_id, agent_key, self.OFFLINE_MESSAGE)

        return Response({'errcode': ErrorCode.OK})


class UserAvatarView(BaseAvatar):
    def get(self, request, user_id):
        return self._get(
            request, User.objects.get_or_none(id=user_id).avatar,
            UserAvatar, User.DEFAULT_AVATAR)


class UserResetPhoneViewSet(ViewSet):
    def get_page(self, request):
        return render(request, 'user/reset_phone.html')

    def reset_phone(self, request):
        phone = request.DATA['phone']
        password = request.DATA['password']
        token = request.DATA['token']
        change_to = request.DATA['change_to']

        u = User.find_by_phone(phone=phone)
        if not u:
            return Response({'errcode': ErrorCode.INVALID_PHONE_NUMBER})

        if not u.auth(password):
            return Response({'errcode': ErrorCode.BAD_PASSWORD})

        r = ValidateToken.check_token(token, phone, TokenType.VALIDATE_PHONE)
        if r is not None:
            return Response({'errcode': r})

        u.phone = change_to
        u.save()
        WechatAccount.objects.filter(starfish_id=u.id).update(starfish_id=0)

        return Response({'errcode': ErrorCode.OK, 'data': u.to_dict()})


class ValidCodeView(ViewSet):
    def validate(self, request):
        code = request.GET.get('code')
        if not code:
            raise APIError(ErrorCode.BAD_REQUEST_PARAMS, code=code)

        data = None
        if ValidateCode.is_valid(request, code):
            data = {'code': request.GET.get('code')}

        return Response({'errcode': ErrorCode.OK, 'data': data})


class ValidCodeAvatarView(BaseAvatar):
    def get(self, request):
        obj = ValidateCode.fetch_one(request)
        return self._get(request, obj.avatar, ValidateCodeAvatar, None)
