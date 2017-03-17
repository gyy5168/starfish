import binascii
import csv
import json
import logging
import urllib
from datetime import datetime

from apps.account.models import User
from apps.org.models import Department, Org, UserOrg, UserPosition
from common import Singleton
from common.const import Gender
from common.globals import set_thread_attr
from common.utils import current_timestamp, setattr_if_changed, shard_id
from Crypto.Cipher import PKCS1_OAEP
from Crypto.PublicKey import RSA
from django.conf import settings
from yxt.models import DepartmentYxt, OrgYxt, UserYxt

log = logging.getLogger(__name__)


class ImportMissingError(Exception):
    def __init__(self, desc, uuid):
        self.desc = desc
        self.uuid = uuid

    def __str__(self):
        return 'ImportMissingError extra: %s, %s' % (self.desc, self.uuid)


class UserInOrgMixin(object):
    def user_in_org(self, user_id, org_id):
        if not UserOrg.objects.filter(user_id=user_id, org_id=org_id, is_left=0).exists():
            raise ImportMissingError(self.__class__.__name__, '%s: %s' % (org_id, user_id))


class BaseImport(object):
    TITLE = []

    def __init__(self, org_id=None, org_uuid=None):
        self.is_batch = False
        self.org_id = None
        self.org_uuid = None
        self.set_org_id(org_id, org_uuid)

        self.all_data = []
        set_thread_attr('skip_signal_of_import', 1)

    def set_org_id(self, org_id=None, org_uuid=None):
        if org_id:
            if self.org_id == org_id:
                return
            self.org_id = org_id
            org_yxt = OrgYxt.objects.get_or_none(org_id=org_id)
            if not org_yxt:
                raise ImportMissingError('Org id', self.org_id)
            self.org_uuid = org_yxt.uuid
        elif org_uuid:
            if self.org_uuid == org_uuid:
                return
            org_yxt = OrgYxt.objects.get_or_none(uuid=org_uuid)
            if not org_yxt:
                raise ImportMissingError('Org uuid', self.org_uuid)
            self.org_id = org_yxt.org_id
            self.org_uuid = org_uuid
        # else:
        #     raise ValueError('org_id or org_uuid are both None')

    def get_str(self, data):
        return data.strip()

    def get_int(self, data):
        if data.strip():
            return int(data)

    def get_dt(self, data):
        try:
            return datetime.strptime(data, '%Y/%m/%d %H:%M')
        except:
            pass

    def check_title(self, row):
        assert len(row) == len(self.TITLE)
        for i, j in zip(self.TITLE, row):
            assert i.strip() == j.strip()

    def delete_by_data(self, data):
        pass

    def import_by_data(self, data):
        self.all_data.append(data)

    def finalize(self):
        pass

    def run(self, file_path):
        self.is_batch = True
        with open(file_path, 'r', encoding='gbk') as csvfile:
            spamreader = csv.reader(csvfile)
            for i, row in enumerate(spamreader):
                log.info('line: %s' % i)
                if i == 0:
                    self.check_title(row)
                else:
                    try:
                        self.import_by_data(self.get_data(row))
                    except Exception as e1:
                        log.error('%s error, %s' % (self.__class__.__name__, e1))
                        log.exception(e1)

            self.finalize()

    def get_data(self, row):
        data = {}
        r = iter(row)
        for key, type in self.DEFINES:
            if type == int:
                data[key] = self.get_int(next(r))
            elif type == str:
                data[key] = self.get_str(next(r))
            elif type == datetime:
                data[key] = self.get_dt(next(r))

        return data

    def build_data(self, data):
        res = {}
        for t, d in zip(self.TITLE, self.DEFINES):
            if t:
                res[d[0]] = data.get(t, None)
            else:  # seq
                res[d[0]] = current_timestamp()
        return res

    def normalize_data(self, data):
        ret_data = {}
        for key, t in self.DEFINES:
            if t is int:
                _default = 0
            elif t is str:
                _default = ''
            else:
                _default = None
            ret_data[key] = data.get(key, _default) or _default

        return ret_data

    def validate_data(self, data):
        pass


class ImportUser(BaseImport):
    TITLE = ['', 'ID', 'STATUS', 'CREATEDATE', 'UPDATEDATE', 'MOBILE', 'USERNAME', 'CNNAME',
             'PASSWORD', 'HEADPICTUREURL', 'PERSONALSIGN', 'SEX']
    DEFINES = [('seq', int), ('uuid', str), ('status', int),
               ('create_time', datetime), ('update_time', datetime),
               ('phone', str), ('username', str), ('name', str), ('psw', str),
               ('avatar', str), ('intro', str), ('gender', int)
               ]

    def delete_by_data(self, data):
        ux = UserYxt.objects.get_or_none(uuid=data['uuid'])
        if ux:
            u = User.objects.get_or_none(id=ux.user_id)
            if u:  # and not data['status']:
                u.delete()
            ux.delete()

    def import_by_data(self, data):
        u = None
        ux = UserYxt.objects.get_or_none(uuid=data['uuid'])
        if ux:
            if setattr_if_changed(ux, username=data['username']):
                ux.save()

            u = User.objects.get_or_none(id=ux.user_id)
            if u and setattr_if_changed(u, phone=data['phone'] or User.fake_identity(),
                                        name=data['name'],
                                        avatar=data['avatar'],
                                        intro=data['intro'],
                                        gender=data['gender']):
                                        # is_deleted=int(not data['status'])):
                u.download_and_update_avatar()
                u.save()
        else:
            kwargs = {
                'name': data['name'],
                'password': User.encrypt_password(''),
                'phone': data['phone'] or User.fake_identity(),
                'gender': data['gender'],
                'intro': data['intro'],
                'avatar': data['avatar'],
                # 'is_deleted': int(not data['status'])
            }
            u = User(**kwargs)
            u.download_and_update_avatar()
            u.save()
            UserYxt.objects.create(user_id=u.id, uuid=data['uuid'], username=data['username'])
            log.info('import_user[%s], create user %s, %s' % (data['seq'], data['uuid'], u.id))

        # if u and not data['status']:
        #     for uo in UserOrg.objects.filter(user_id=u.id, is_left=0):
        #         uo.is_left = 1
        #         uo.save()


class ImportOrg(BaseImport):
    TITLE = ['', 'ID', 'ISDELETED', 'CREATEDATE', 'UPDATEDATE',
             'CREATEUSERID', 'ORGNAME', 'ORGINTRODUCTION', 'LOGOURL']
    DEFINES = [('seq', int), ('uuid', str), ('is_deleted', int),
               ('create_time', datetime), ('update_time', datetime),
               ('creator_uuid', str), ('name', str), ('intro', str),
               ('avatar', str)]

    def delete_by_data(self, data):
        ox = OrgYxt.objects.get_or_none(uuid=data['uuid'])
        if ox:
            o = Org.objects.get_or_none(id=ox.org_id)
            if o and setattr_if_changed(o, is_deleted=int(data['is_deleted'])):
                o.save()

            UserOrg.objects.filter(org_id=o.id).update(is_left=1)
            ox.delete()

    def import_by_data(self, data):
        # if data['is_deleted']:
        #     log.info('import_org[%s], skip org %s' % (data['seq'], data['uuid']))
        #     return

        ux = UserYxt.objects.get_or_none(uuid=data['creator_uuid'])
        if ux:
            creator_id = ux.user_id
        else:
            creator_id = UserYxt.objects.all().order_by('user_id')[0].user_id

        ox = OrgYxt.objects.get_or_none(uuid=data['uuid'])
        if ox:
            o = Org.objects.get_or_none(id=ox.org_id)
            if o and setattr_if_changed(o, creator=creator_id, name=data['name'],
                                        avatar=data['avatar'], intro=data['intro'],
                                        is_deleted=data['is_deleted']):
                o.download_and_update_avatar()
                o.save()
        else:
            kwargs = {
                'name': data['name'],
                'creator': creator_id,
                'intro': data['intro'],
                'avatar': data['avatar'],
                'is_deleted': data['is_deleted']
            }
            o = Org(**kwargs)
            o.download_and_update_avatar()
            o.save()

            OrgYxt.objects.create(org_id=o.id, uuid=data['uuid'])
            log.info('import_org[%s], create org %s, %s' % (data['seq'], data['uuid'], o.id))


class ImportUserOrg(BaseImport):
    TITLE = ['', 'USERID', 'ORGID', 'STATUS']
    DEFINES = [('seq', int), ('user_uuid', str), ('org_uuid', str), ('status', int)]

    def validate_data(self, data):
        ux = UserYxt.objects.get_or_none(uuid=data['user_uuid'])
        ox = OrgYxt.objects.get_or_none(uuid=data['org_uuid'])

        if not ux:
            log.info('import_user_org[%s], missing user_uuid --%s--'
                     % (data['seq'], data['user_uuid']))
            raise ImportMissingError('UserYxt', data['user_uuid'])

        if not ox:
            log.info('import_user_org[%s], missing org_uuid --%s--'
                     % (data['seq'], data['org_uuid']))
            raise ImportMissingError('OrgYxt', data['org_uuid'])

    def delete_by_data(self, data):
        self.import_by_data(data)

    def import_by_data(self, data):
        self.validate_data(data)

        ux = UserYxt.objects.get_or_none(uuid=data['user_uuid'])
        ox = OrgYxt.objects.get_or_none(uuid=data['org_uuid'])
        u = User.objects.get_or_none(id=ux.user_id)
        if not u:
            log.info('import_user_org[%s], user is deleted %s: %s'
                     % (data['seq'], ux.user_id, data['user_uuid']))
            return

        uo, created = UserOrg.objects\
            .get_or_create(user_id=ux.user_id, org_id=ox.org_id,
                           defaults={'is_left': int(not data['status'])})

        if not created and setattr_if_changed(uo, is_left=int(not data['status'])):
            uo.save()

        log.info('import_user_org[%s], create user_org %s, %s, %s'
                 % (data['seq'], data['user_uuid'], data['org_uuid'], uo.id))


class ImportUserPosition(BaseImport, UserInOrgMixin):
    TITLE = ['', 'USERID', 'CURRENTPOSITIONNAME', 'ORGID']
    DEFINES = [('seq', int), ('user_uuid', str), ('position', str), ('org_uuid', str)]

    def validate_data(self, data):
        self.set_org_id(org_uuid=data['org_uuid'])
        assert self.org_id

        ux = UserYxt.objects.get_or_none(uuid=data['user_uuid'])
        if not ux:
            log.info('import_user_position[%s], missing user_uuid %s'
                     % (data['seq'], data['user_uuid']))
            raise ImportMissingError('UserYxt', data['user_uuid'])

    def delete_by_data(self, data):
        self.set_org_id(org_uuid=data['org_uuid'])

        ux = UserYxt.objects.get_or_none(uuid=data['user_uuid'])
        if ux:
            up = UserPosition.objects.using(self.org_id).get_or_none(user_id=ux.user_id)
            if up:
                up.delete()

    def import_by_data(self, data):
        self.validate_data(data)

        ux = UserYxt.objects.get_or_none(uuid=data['user_uuid'])

        self.user_in_org(ux.user_id, self.org_id)

        up, created = UserPosition.objects.using(self.org_id)\
            .get_or_create(user_id=ux.user_id,
                           defaults={'position': data['position']})

        if not created and setattr_if_changed(up, position=data['position']):
            up.save()

        log.info('import_user_position[%s], create user_position %s, %s'
                 % (data['seq'], data['user_uuid'], up.id))


class ImportDepartment(BaseImport, UserInOrgMixin):
    TITLE = ['', 'ID', 'CREATEDATE', 'UPDATEDATE', 'PARENTID', 'CREATEUSERID', 'OUNAME', 'ORGID']
    DEFINES = [('seq', int), ('uuid', str),
               ('create_time', datetime), ('update_time', datetime),
               ('parent_uuid', str), ('creator_uuid', str), ('name', str),
               ('org_uuid', str)
               ]

    def validate_data(self, data):
        self.set_org_id(org_uuid=data['org_uuid'])

        if data['parent_uuid'] == self.org_uuid:
            parent = Org.objects.getx(id=self.org_id).default_department
        else:
            parent_id = DepartmentYxt.objects\
                .using(self.org_id)\
                .get_or_none(uuid=data['parent_uuid']).department_id
            parent = Department.objects.using(self.org_id).get_or_none(id=parent_id)

        if not parent:
            raise ImportMissingError('Parent Department', data['parent_uuid'])

    def delete_by_data(self, data):
        self.set_org_id(org_uuid=data['org_uuid'])

        dx = DepartmentYxt.objects.using(self.org_id).get_or_none(uuid=data['uuid'])
        if dx:
            d = Department.objects.using(self.org_id).get_or_none(id=dx.department_id)
            if d:
                d.is_disbanded = 1
                d.save()
                # d.delete()

            # dx.delete()

    def import_by_data(self, data):
        if self.is_batch:
            super(ImportDepartment, self).import_by_data(data)
        else:
            self.validate_data(data)
            self._create_obj(data)

    def finalize(self):
        all_data_dict = {}
        for data in self.all_data:
            org_uuid = data['org_uuid']
            if org_uuid not in all_data_dict:
                all_data_dict[org_uuid] = []

            all_data_dict[org_uuid].append(data)

        for org_uuid, all_data in all_data_dict.items():
            self.set_org_id(org_uuid=org_uuid)
            self._finalize0(all_data)

    def _finalize0(self, all_data):
        assert self.org_id
        ox = OrgYxt.objects.get_or_none(org_id=self.org_id)
        assert ox

        tree = {}
        for data in all_data:
            parent_uuid = data['parent_uuid']
            if parent_uuid not in tree:
                tree[parent_uuid] = []
            tree[parent_uuid].append(data)

        assert ox.uuid in tree

        created_uuid_list = []

        # create fake root
        for data in tree[ox.uuid]:
            uuid = self._create_obj(data)
            if uuid:
                created_uuid_list.append(uuid)

        while created_uuid_list:
            parent_uuid = created_uuid_list.pop(0)

            for data in tree.get(parent_uuid, []):
                uuid = self._create_obj(data)
                if uuid:
                    created_uuid_list.append(uuid)

    def _create_obj(self, data):
        try:
            self.validate_data(data)
            self.set_org_id(org_uuid=data['org_uuid'])

            type = Department.TYPE_NORMAL
            org = Org.objects.getx(id=self.org_id)

            ux = UserYxt.objects.get_or_none(uuid=data['creator_uuid'])
            if not ux:
                log.info('import_department[%s], missing user_uuid %s'
                         % (data['seq'], data['creator_uuid']))

                creator_id = org.creator
            else:
                creator_id = ux.user_id

            if data['parent_uuid'] == self.org_uuid:
                parent = org.default_department
            else:
                parent_id = DepartmentYxt.objects\
                    .using(self.org_id)\
                    .get_or_none(uuid=data['parent_uuid']).department_id
                parent = Department.objects.using(self.org_id).get_or_none(id=parent_id)

            dx = DepartmentYxt.objects.using(self.org_id).get_or_none(uuid=data['uuid'])
            if dx:
                d = Department.objects.using(self.org_id).get_or_none(id=dx.department_id)
                if d and setattr_if_changed(d, type=type, name=data['name'],
                                            parent=parent, creator=creator_id):
                    d.save()
                return data['uuid']
            else:
                kwargs = {
                    'name': data['name'],
                    'creator': creator_id,
                    'parent': parent,
                    'avatar': '',
                    'type': type
                }
                d = Department(**kwargs)
                d.save(using=shard_id(self.org_id))
                DepartmentYxt.objects.using(self.org_id).create(department_id=d.id,
                                                                uuid=data['uuid'])
                log.info('import_department[%s], create department %s, %s'
                         % (data['seq'], data['uuid'], d.id))

                return data['uuid']

        except Exception as e:
            log.error('import_department error, %s' % e)
            log.exception(e)


class ImportUserDepartment(BaseImport, UserInOrgMixin):
    TITLE = ['', 'USERID', 'DEPARTMENTID', 'ORGID']
    DEFINES = [('seq', int), ('user_uuid', str), ('department_uuid', str), ('org_uuid', str)]

    def validate_data(self, data):
        self.set_org_id(org_uuid=data['org_uuid'])
        assert self.org_id

        ux = UserYxt.objects.get_or_none(uuid=data['user_uuid'])
        if not ux:
            log.info('import_user_department[%s], missing user_uuid --%s--'
                     % (data['seq'], data['user_uuid']))
            raise ImportMissingError('UserYxt', data['user_uuid'])

        self.user_in_org(ux.user_id, self.org_id)

        dx = DepartmentYxt.objects.using(self.org_id).get_or_none(uuid=data['department_uuid'])
        if not dx:
            log.info('import_user_department[%s], missing department_uuid --%s--'
                     % (data['seq'], data['department_uuid']))
            raise ImportMissingError('DepartmentYxt', data['department_uuid'])

        d = Department.objects.using(self.org_id).get_or_none(id=dx.department_id)
        if not d:
            log.info('import_user_department[%s], missing department_id %s'
                     % (data['seq'], dx.department_id))
            raise ImportMissingError('DepartmentYxt', data['department_uuid'])

    def delete_by_data(self, data):
        self.set_org_id(org_uuid=data['org_uuid'])

        ux = UserYxt.objects.get_or_none(uuid=data['user_uuid'])
        dx = DepartmentYxt.objects.using(self.org_id).get_or_none(uuid=data['department_uuid'])
        if ux and dx:
            d = Department.objects.using(self.org_id).get_or_none(id=dx.department_id)
            if d:
                d.remove_direct_in_v2(ux.user_id)

    def import_by_data(self, data):
        if self.is_batch:
            super(ImportUserDepartment, self).import_by_data(data)
        else:
            self.validate_data(data)
            self._create_obj(data)

    def finalize(self):
        #  all_data_dict = {org_uuid:{user_uuid:[department_uuid,...]}}
        all_data_dict = {}
        for d in self.all_data:
            org_uuid, user_uuid, department_uuid = \
                d['org_uuid'], d['user_uuid'], d['department_uuid']

            if org_uuid not in all_data_dict:
                all_data_dict[org_uuid] = {}

            if user_uuid not in all_data_dict[org_uuid]:
                all_data_dict[org_uuid][user_uuid] = []

            all_data_dict[org_uuid][user_uuid].append(department_uuid)

        for org_uuid, all_user_dict in all_data_dict.items():
            self.set_org_id(org_uuid=org_uuid)
            assert self.org_id

            default_department = Org.objects.get(id=self.org_id).default_department
            for user_uuid, all_department_uuids in all_user_dict.items():
                ux = UserYxt.objects.get_or_none(uuid=user_uuid)
                if not ux:
                    log.info('import_user_department, missing user_uuid %s' % (user_uuid))
                    continue

                u = User.objects.get_or_none(id=ux.user_id)
                if not u:
                    log.info('import_user_department, user is deleted %s: %s'
                             % (ux.user_id, ux.uuid))
                    continue

                dps = DepartmentYxt.objects.using(self.org_id)\
                    .filter(uuid__in=all_department_uuids)\
                    .values_list('department_id', flat=True)

                group_ids = list(dps) or [default_department.id]
                Department.update_user_departments(self.org_id, ux.user_id, group_ids)

    def _create_obj(self, data):
        self.validate_data(data)

        ux = UserYxt.objects.get_or_none(uuid=data['user_uuid'])
        dx = DepartmentYxt.objects.using(self.org_id).get_or_none(uuid=data['department_uuid'])
        d = Department.objects.using(self.org_id).get_or_none(id=dx.department_id)

        Department.update_user_departments(self.org_id, ux.user_id, [d.id])

        log.info('import_user_department[%s], create user_department %s, %s'
                 % (data['seq'], data['user_uuid'], data['department_uuid']))


class RsaUtils(object, metaclass=Singleton):
    PUB_KEY = 'yxt/rsa/keys.pub'
    PRI_KEY = 'yxt/rsa/keys.pem'

    def __init__(self):
        with open(self.PUB_KEY) as f:
            self.rsa_public = f.read()

        with open(self.PRI_KEY) as f:
            self.rsa_private = f.read()

    def rsa_encode(self, plain_txt):
        '''plain_txt: string
           output: a hexstring encoded by pub-key'''
        pub_key = RSA.importKey(self.rsa_public)
        x = PKCS1_OAEP.new(pub_key).encrypt(plain_txt.encode('utf-8'))
        return binascii.hexlify(x).decode('utf-8')

    def rsa_decode(self, encoded_txt):
        '''encoded_txt: a hexstring
           output: raw string decoded by pri-key'''
        pri_key = RSA.importKey(self.rsa_private)
        x = binascii.unhexlify(encoded_txt)
        return PKCS1_OAEP.new(pri_key).decrypt(x).decode('utf-8')


def send_update(user_id, token):
    return
    u = User.objects.get_or_none(id=user_id)
    org_id = 0
    org_uuid = OrgYxt.objects.get_or_none(org_id=org_id).uuid
    user_yxt = UserYxt.objects.get_or_none(user_id=user_id)

    gender = ""
    if u.gender == Gender.GENDER_MALE:
        gender = '男'
    elif u.gender == Gender.GENDER_FEMALE:
        gender = '女'

    data = {
        "orgId": org_uuid,
        "userName": user_yxt.username,
        "mobile": u.phone,
        "fullName": u.name,
        "sex": gender,
        "personalSign": u.intro
    }
    json_bytes = json.dumps(data).encode('utf-8')  # needs to be bytes

    update_url = settings.YXT_UPDATE_USER_URL % user_yxt.uuid
    log.info('update user info to yxt: %s, %s' % (update_url, data))

    req = urllib.request.Request(update_url, data=json_bytes, method='PUT')

    req.add_header('Content-Type', 'application/json; charset=utf-8')
    req.add_header('Content-Length', len(json_bytes))
    req.add_header('Token', token)
    req.add_header('Source', 511)
    with urllib.request.urlopen(req) as response:
        pass

    log_txt = 'send_update to yxt: user_id:%s, user_uuid: %s,  data: %s, response: %s(%s)'\
              % (user_id, user_yxt.uuid, data, response.status, response.reason)

    if response.status != 204:
        log.error(log_txt)
    else:
        log.info(log_txt)
