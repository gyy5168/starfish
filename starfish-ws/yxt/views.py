import json
import logging

import requests
from apps.account.views import SessionViewSet
from common.const import ErrorCode
from common.exceptions import APIError
from common.globals import read_from_readwrite_main
from common.utils import current_timestamp
from common.viewset import ViewSet
from django.conf import settings
from django.utils.http import cookie_date
from rest_framework.response import Response
from yxt.models import OrgYxt, UserYxt
from yxt.utils import (ImportDepartment, ImportMissingError, ImportOrg,
                       ImportUser, ImportUserDepartment, ImportUserOrg,
                       ImportUserPosition, RsaUtils)

log = logging.getLogger(__name__)


class YxtSessionViewSet(ViewSet):

    def login_yxt(self, username, password, domain):
        body = {
            "userName": username,
            "password": password,
            "domainName": domain
        }
        headers = {'Source': 511}

        resp = None
        try:
            resp = requests.post(settings.YXT_LOGIN_URL, json=body, timeout=10, headers=headers)
        except requests.exceptions.Timeout:
            raise APIError(
                ErrorCode.UNKNOWN_ERROR,
                username=username, domain=domain,
                exception='timeout'
            )

        log.info('login response: %s', resp.content)

        if resp.status_code != requests.status_codes.codes.ok:
            if resp.status_code == requests.status_codes.codes.bad_request:
                r = json.loads(resp.content.decode('utf8'))
                key = r['error']["key"]
                if key == "apis.domainName.not.existed":
                    raise APIError(ErrorCode.LOGIN_DOMAIN_NOT_EXISTS, domain=domain)

                elif key == 'apis.user.userNameOrPasswordInvalid':
                    raise APIError(ErrorCode.BAD_USERNAME_OR_PASSWORD,
                                   username=username, domain=domain)
            else:
                raise APIError(ErrorCode.UNKNOWN_ERROR,
                               http_status_code=resp.status_code,
                               username=username, domain=domain)

        user_uuid, org_uuid, token = None, None, None
        try:
            r = json.loads(resp.content.decode('utf8'))
            user_uuid, org_uuid, token = r['userId'], r['orgId'], r['token']
        except:
            raise APIError(ErrorCode.UNKNOWN_ERROR, username=username, domain=domain)

        user = UserYxt.user(user_uuid)
        if not user:
            raise APIError(ErrorCode.NO_SUCH_USER, user_uuid=user_uuid, log_level='warning')

        org = OrgYxt.org(org_uuid)
        if not org:
            raise APIError(ErrorCode.NO_SUCH_ORG, org_uuid=org_uuid)

        return org, user, token

    def validate_token_yxt(self, token):
        headers = {'Source': 511, 'Token': token}
        validate_token_url = settings.YXT_VALIDATE_TOKEN_URL
        resp = None
        try:
            resp = requests.get(validate_token_url, timeout=10, headers=headers)
        except requests.exceptions.Timeout:
            raise APIError(
                ErrorCode.INVALID_TOKEN,
                token=token, exception='timeout'
            )

        if resp.status_code != requests.status_codes.codes.ok:
            raise APIError(ErrorCode.INVALID_TOKEN,
                           http_status_code=resp.status_code,
                           token=token)

        user_uuid, org_uuid = None, None
        try:
            r = json.loads(resp.content.decode('utf8'))
            user_uuid, org_uuid = r['userId'], r['orgId']
        except:
            raise APIError(ErrorCode.INVALID_TOKEN, token=token)

        user = UserYxt.user(user_uuid)
        if not user:
            raise APIError(ErrorCode.NO_SUCH_USER, user_uuid=user_uuid, log_level='warning')

        org = OrgYxt.org(org_uuid)
        if not org:
            raise APIError(ErrorCode.NO_SUCH_ORG, org_uuid=org_uuid)

        return org, user

    def create(self, request):
        org, user, token = None, None, request.DATA.get('token')
        home_url = settings.YXT_HOMEPAGE
        psw = None

        if token:
            org, user = self.validate_token_yxt(request.DATA['token'])
        else:
            psw = request.DATA.get('password')
            if not psw:
                e_psw = request.DATA.get('encrypted_password')
                if not e_psw:
                    raise APIError(ErrorCode.BAD_PASSWORD, log_level='warning')
                psw = RsaUtils().rsa_decode(e_psw)

            org, user, token = self.login_yxt(
                request.DATA['username'],
                psw,
                request.DATA['domain'])

        response = SessionViewSet._create_by_user(request, user)
        if psw:
            response.data['data']['encrypted_password'] = RsaUtils().rsa_encode(psw)

        response.data['data']['token'] = token
        response.data['data']['domain'] = request.DATA['domain']
        response.data['data']['homepage'] = '%s?t=%s&d=%s' \
                                            % (home_url, token,
                                               request.DATA['domain'])

        log.info('response data: %s', response.data)

        return self._set_cookie(response, settings.SESSION_COOKIE_AGE)

    def _set_cookie(self, response, cookie_age=-86400):
        response.set_cookie(
            'yxt_token',
            response.data['data']['token'],
            max_age=cookie_age,
            expires=cookie_date(cookie_age + current_timestamp()),
            domain=settings.SESSION_COOKIE_DOMAIN,
            httponly=True
        )
        # response.set_cookie(
        #     'domainName',
        #     response.data['data']['domain'],
        #     max_age=cookie_age,
        #     expires=cookie_date(cookie_age + current_timestamp()),
        #     domain=settings.YXT_SESSION_COOKIE_DOMAIN,
        #     httponly=True
        # )
        return response

    def pub_key(self, request):
        return Response({
            'errcode': ErrorCode.OK,
            'data': {"public_key": RsaUtils().rsa_public}
        })


class YxtImportViewSet(ViewSet):
    def valid_parasm(self, request, params):
        for key in params:
            if key not in request.DATA:
                raise APIError(ErrorCode.BAD_REQUEST_PARAMS, key=key)

    def create_update_org(self, request):
        params = ['uuid', 'intro', 'name', 'avatar']
        self.valid_parasm(request, params)

        imp = ImportOrg()
        data = imp.normalize_data(request.DATA)
        try:
            imp.import_by_data(data)
        except ImportMissingError as e:
            log.error('import missing[%s]' % e)
            return Response({'errcode': ErrorCode.BAD_REQUEST_PARAMS, 'data': str(e)})
        except Exception as e1:
            log.error('%s error, %s' % (self.__class__.__name__, e1))
            log.exception(e1)
            return Response({'errcode': ErrorCode.UNKNOWN_ERROR, 'data': str(e1)})

        return Response({
            'errcode': ErrorCode.OK,
            'data': dict(**request.DATA)
        })

    def delete_org(self, request):
        params = ['uuid', ]
        self.valid_parasm(request, params)

        imp = ImportOrg()
        data = imp.normalize_data(request.DATA)
        try:
            imp.delete_by_data(data)
        except ImportMissingError as e:
            log.error('import missing[%s]' % e)
            return Response({'errcode': ErrorCode.BAD_REQUEST_PARAMS, 'data': str(e)})
        except Exception as e1:
            log.error('%s error, %s' % (self.__class__.__name__, e1))
            log.exception(e1)
            return Response({'errcode': ErrorCode.UNKNOWN_ERROR, 'data': str(e1)})

        return Response({
            'errcode': ErrorCode.OK,
            'data': dict(**request.DATA)
        })

    def create_update_department(self, request):
        params = ['parent_uuid', 'uuid', 'creator_uuid', 'name', 'org_uuid']
        self.valid_parasm(request, params)

        imp = ImportDepartment()
        data = imp.normalize_data(request.DATA)
        try:
            imp.import_by_data(data)
        except ImportMissingError as e:
            log.error('import missing[%s]' % e)
            return Response({'errcode': ErrorCode.BAD_REQUEST_PARAMS, 'data': str(e)})
        except Exception as e1:
            log.error('%s error, %s' % (self.__class__.__name__, e1))
            log.exception(e1)
            return Response({'errcode': ErrorCode.UNKNOWN_ERROR, 'data': str(e1)})

        return Response({
            'errcode': ErrorCode.OK,
            'data': dict(**request.DATA)
        })

    def delete_department(self, request):
        params = ['uuid', 'org_uuid']
        self.valid_parasm(request, params)

        imp = ImportDepartment()
        data = imp.normalize_data(request.DATA)
        try:
            imp.delete_by_data(data)
        except ImportMissingError as e:
            log.error('import missing[%s]' % e)
            return Response({'errcode': ErrorCode.BAD_REQUEST_PARAMS, 'data': str(e)})
        except Exception as e1:
            log.error('%s error, %s' % (self.__class__.__name__, e1))
            log.exception(e1)
            return Response({'errcode': ErrorCode.UNKNOWN_ERROR, 'data': str(e1)})

        return Response({
            'errcode': ErrorCode.OK,
            'data': dict(**request.DATA)
        })

    @read_from_readwrite_main
    def create_update_user(self, request):
        params = ['username', 'user_uuid', 'intro', 'name',
                  'department_uuid', 'position', 'gender',
                  'org_uuid', 'phone', 'avatar', 'status']
        self.valid_parasm(request, params)

        try:
            imp = ImportUser()
            data = imp.normalize_data(request.DATA)
            data['uuid'] = request.DATA['user_uuid']
            imp.import_by_data(data)

            imp = ImportUserOrg()
            data = imp.normalize_data(request.DATA)
            # data['status'] = 1
            imp.import_by_data(data)

            if request.DATA['position'] and request.DATA['status']:
                imp = ImportUserPosition()
                data = imp.normalize_data(request.DATA)
                imp.import_by_data(data)

            if request.DATA['department_uuid'] and request.DATA['status']:
                imp = ImportUserDepartment()
                data = imp.normalize_data(request.DATA)
                imp.import_by_data(data)

        except ImportMissingError as e:
            log.error('import missing[%s]' % e)
            return Response({'errcode': ErrorCode.BAD_REQUEST_PARAMS, 'data': str(e)})
        except Exception as e1:
            log.error('%s error, %s' % (self.__class__.__name__, e1))
            log.exception(e1)
            return Response({'errcode': ErrorCode.UNKNOWN_ERROR, 'data': str(e1)})

        return Response({
            'errcode': ErrorCode.OK,
            'data': dict(**request.DATA)
        })

    def delete_user_department(self, request):
        params = ['user_uuid', 'department_uuid', 'org_uuid', ]
        self.valid_parasm(request, params)

        try:
            imp = ImportUserDepartment()
            data = imp.normalize_data(request.DATA)
            imp.delete_by_data(data)
        except ImportMissingError as e:
            log.error('import missing[%s]' % e)
            return Response({'errcode': ErrorCode.BAD_REQUEST_PARAMS, 'data': str(e)})
        except Exception as e1:
            log.error('%s error, %s' % (self.__class__.__name__, e1))
            log.exception(e1)
            return Response({'errcode': ErrorCode.UNKNOWN_ERROR, 'data': str(e1)})

        return Response({
            'errcode': ErrorCode.OK,
            'data': dict(**request.DATA)
        })
