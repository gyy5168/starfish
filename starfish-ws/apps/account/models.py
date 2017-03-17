import hashlib
import logging
import random
import string
import requests
from decimal import Decimal

from common import models as _models
from common import starfish_crypt as crypt
from common.avatar_tool import TextImage, image_to_data
from common.const import Const, ErrorCode, Gender
from common.exceptions import APIError
from common.models import AutoCleanMixin
from common.utils import (
    TargetObject, all_orgs, current_timestamp, shard_id, get_client_ip)
from django.conf import settings
from django.core.cache import cache as memcache
from django.core.files.storage import FileSystemStorage
from django.db import models
from django.utils.crypto import get_random_string
from geo import Geo, GeoError

log = logging.getLogger(__name__)


class User(_models.BaseModel):
    FAKE_DELETE_FIELDS = ('phone',)

    (ACCOUNT_TYPE_STARFISH, ACCOUNT_TYPE_WECHAT) = range(2)

    FAKE_DISTANCE = -1

    DEFAULT_AVATAR = '%s/member_info_default_icon1.png' % settings.FS_ROOT

    phone = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=32)
    password = models.CharField(max_length=128)
    avatar = models.CharField(max_length=128)
    intro = models.CharField(max_length=1024)
    gender = models.PositiveSmallIntegerField(default=Gender.GENDER_UNKNOWN)
    latitude = models.DecimalField(max_digits=13, decimal_places=10, default=Decimal('0.0'))
    longitude = models.DecimalField(max_digits=13, decimal_places=10, default=Decimal('0.0'))
    account_type = models.PositiveSmallIntegerField(default=ACCOUNT_TYPE_STARFISH)
    summary_update_at = models.PositiveIntegerField(default=0, db_index=True)
    order_field = models.IntegerField(default=0, db_index=True)

    @classmethod
    def find_by_phone(cls, phone):
        users = User.objects.filter(phone=phone).order_by('id')
        if users.exists():
            return users[0]

    @property
    def avatar_url(self):
        if self.avatar.lower().startswith('http'):
            return self.avatar

        if UserMaxwellEndpoint.find(self.id) == settings.MAXWELL_MASTER_STARFISH:
            prefix = settings.USER_AVATAR_URL_PREFIX_STARFISH
        else:
            prefix = settings.USER_AVATAR_URL_PREFIX_YXT

        return '%s/%s/%s' % (prefix, self.id, self.avatar)

    @property
    def is_summary_updated(self):
        keys = ('phone', 'name', 'intro', 'gender', 'avatar')
        return bool(set(self.changed_fields) & set(keys))

    def save(self, *args, **kwargs):
        if not self.phone:
            raise ValueError('missing phone')

        self.gender = int(self.gender)

        if self.is_summary_updated:
            self.summary_update_at = current_timestamp()

        super(User, self).save(*args, **kwargs)

    def download_and_update_avatar(self):
        if self.avatar.lower().startswith('http'):
            try:
                r = requests.get(self.avatar, stream=True)
                if r.status_code != 200:
                    self.avatar = ''

                self.avatar = UserAvatar.save_file2(r.raw.read())
            except Exception as e:
                log.warning('download_and_update_avatar error: %s, %s' % (self.id, e))

            return self.avatar

    def auth(self, password):
        return crypt.crypt(password, self.password[:19]) == self.password

    def is_authenticated(self):
        return True

    def in_same_org_with(self, user_id):
        from apps.org.models import UserOrg

        orgs1 = UserOrg.objects \
            .filter(user_id=user_id) \
            .values_list('org_id', flat=True)
        orgs2 = UserOrg.objects \
            .filter(user_id=self.id) \
            .values_list('org_id', flat=True)

        return (set(orgs1) & set(orgs2))

    def is_admin(self, org_id):
        from apps.org.models import Org
        o = Org.objects.get_or_none(id=org_id)
        if not o:
            return False

        if o.creator == self.id:
            return True

        from apps.acl.models import Role, UserRole
        return UserRole.has(
            self.id,
            Role.role_id(org_id, Role.ADMIN_ROLE_NAME),
            org_id)

    def all_admin_orgs(self):
        from apps.org.models import UserOrg, Org
        org_ids = list(UserOrg.objects.filter(user_id=self.id).values_list('org_id', flat=True))
        admin_org_ids = list(
            all_orgs().filter(id__in=org_ids, creator=self.id).values_list('id', flat=True)
        )

        from apps.acl.models import Role, UserRole
        for org_id in all_orgs().filter(id__in=org_ids).values_list('id', flat=True):
            if UserRole.has(self.id, Role.role_id(org_id, Role.ADMIN_ROLE_NAME), org_id):
                admin_org_ids.append(org_id)

        return Org.objects.filter(id__in=set(admin_org_ids))

    @classmethod
    def last_modified(cls, request, user_id):
        user_ids = [user_id] if isinstance(user_id, int) \
            else [int(i) for i in user_id.split(',') if i]
        r = cls.objects.filter(id__in=user_ids).order_by('-summary_update_at')
        if not r:
            return current_timestamp()

        return r[0].summary_update_at

    def default_avatar(self):
        txt_image = TextImage()
        if self.gender == Gender.GENDER_FEMALE:
            color_type = 'warm'
        elif self.gender == Gender.GENDER_MALE:
            color_type = 'cold'
        else:
            color_type = None
        im = txt_image\
            .create(self.name,
                    extract_rule=TextImage.EXTRACT_CN_LAST,
                    width=400, height=400,
                    bg_color_type=color_type,
                    bg_color_sand=int(self.phone[-1], 16))

        return UserAvatar.generate_file(image_to_data(im))
        # return 'member_info_default_icon%s.png' % random.randint(1, 4)

    @classmethod
    def wechat_account(cls, openid):
        r = WechatAccount.objects.get_or_none(openid=openid)
        if r and r.starfish_id:
            return User.objects.get_or_none(id=r.starfish_id)

        return None

    @classmethod
    def from_wechat_userinfo_and_phone(cls, userinfo, phone):
        r = User.objects.get_or_none(phone=phone)
        if r:
            r.account_type = cls.ACCOUNT_TYPE_WECHAT
            r.save()
        else:
            r = User(
                phone=phone,
                name=userinfo['nickname'].encode('latin-1').decode('utf8'),
                password='',
                avatar='',
                intro='',
                gender=cls._gender(userinfo['sex']),
                account_type=cls.ACCOUNT_TYPE_WECHAT
            )
            r.save()

        return r

    @classmethod
    def _gender(cls, wechat_gender):
        wechat_gender = int(wechat_gender)
        if wechat_gender == 1:
            return Gender.GENDER_MALE

        if wechat_gender == 2:
            return Gender.GENDER_FEMALE

        return Gender.GENDER_UNKNOWN

    @classmethod
    def encrypt_password(cls, pwd):
        return crypt.crypt(pwd, crypt.mksalt(method=crypt.METHOD_SHA512))

    def in_org(self, org_id):
        from apps.org.models import UserOrg
        r = UserOrg.objects.getx(user_id=self.id, org_id=org_id)
        if r and not r.is_left:
            return r

    def in_discussion_group(self, org_id, group_id):
        if not self.in_org(org_id):
            return

        from apps.org.models import DiscussionGroup

        d = DiscussionGroup.objects.using(org_id).getx(id=group_id, is_disbanded=0)
        if not d:
            return

        from apps.org.models import UserDiscussionGroup

        ug = UserDiscussionGroup.objects \
            .using(org_id) \
            .getx(group_id=group_id, user_id=self.id)
        if not ug:
            return

        if not ug.is_left:
            return ug

    def in_department(self, org_id, group_id, direct_in=0):
        if not self.in_org(org_id):
            return

        from apps.org.models import UserDepartment
        qs = UserDepartment.objects.using(org_id)\
            .filter(group_id=group_id, user_id=self.id)
        if direct_in:
            qs = qs.filter(direct_in=1)
        return qs.exists()

    def orgs(self):
        from apps.org.models import UserOrg

        return UserOrg.objects.filter(user_id=self.id, is_left=0)

    def work_mail(self, org_id):
        from apps.org.models import WorkMail
        r = WorkMail.objects \
            .using(shard_id(org_id)) \
            .get_or_none(
                owner=self.id,
                owner_type=WorkMail.TYPE_ORG_MEMBER,
                is_set=1)
        if not r:
            raise APIError(ErrorCode.YOU_HAVE_NO_EMAIL_ADDRESS, org_id=org_id, user_id=self.id)
        return r.address

    def to_dict(self):
        exclude = ['password', 'latitude', 'longitude',
                   'account_type', 'summary_update_at',
                   'avatar']
        ret = super(User, self).to_dict([], exclude)

        ret.update(avatar_url=self.avatar_url)
        if self.is_fake('phone'):
            ret.update(phone='')
        else:
            ret.update(phone=self.phone)

        return ret

    @property
    def location(self):
        try:
            return Geo().latitude_longitude_to_address(self.latitude, self.longitude)[
                'short_formatted_address']
        except GeoError:
            return ''
        except Exception:
            # log.error('location error for user: %s, %s' % (self.id, e))
            return ''

    @classmethod
    def build_summary_list(
            cls, user_ids, org_id, _position=True,
            _departments=False, _departments_info=False):
        from apps.org.models import Org, UserPosition, Department, UserDepartment

        ret = []
        org = Org.objects.getx(id=org_id)
        if not org:
            raise ValueError('invalid org id:%s' % org_id)

        if _position:
            positions = dict(
                (i.user_id, i.position) for i in
                UserPosition.objects.using(org_id)
                .filter(user_id__in=user_ids)
            )

        if _departments:
            user_departments = {uid: [] for uid in user_ids}
            department_ids = set([])
            for user_id, group_id in UserDepartment.objects.using(org_id) \
                    .filter(user_id__in=user_ids, direct_in=1) \
                    .values_list("user_id", "group_id"):
                user_departments[user_id].append(group_id)
                department_ids.add(group_id)

            department_names = dict(
                (group_id, name) for group_id, name in
                Department.objects.using(org_id)
                .filter(id__in=department_ids, is_disbanded=0)
                .values_list('id', 'name'))

        for user_id in user_ids:
            r = dict(id=user_id)

            if _position:
                r.update(position=positions.get(user_id, ''))

            if _departments:
                r.update(departments=[department_names[group_id]
                                      for group_id in user_departments[user_id]
                                      if group_id in department_names])
            if _departments_info:
                _t = TargetObject()
                r.update(
                    departments_info=[_t.obj_info(Department, group_id, org_id) for group_id in
                                      user_departments[user_id]]
                )

            ret.append(r)

        return ret

    class Meta:
        db_table = 'uc_user'
        ordering = ('order_field',)


class WechatAccount(_models.BaseModel):
    FAKE_DELETE_FIELDS = ('openid',)

    starfish_id = _models.PositiveBigIntegerField(db_index=True)
    openid = models.CharField(max_length=128, unique=True)
    access_token = models.CharField(max_length=256)
    refresh_token = models.CharField(max_length=256)

    class Meta:
        db_table = 'uc_3rd_account_wechat'


class UserAvatar(_models.FileModelsMixin):
    fs = FileSystemStorage(location=settings.FS_ROOT)


class TokenType(Const):
    VALIDATE_PHONE = 0
    RESET_PASSWORD_BY_PHONE = 1


class ValidateToken(_models.SimpleBaseModel, AutoCleanMixin):
    auto_clean_setting = ('date_added', 3600*24*30)

    VALID_TOKEN_TYPES = (
        TokenType.VALIDATE_PHONE, )

    TOKEN_EXPIRE_TIME = {
        TokenType.VALIDATE_PHONE: 30 * 60,
    }

    target = models.CharField(max_length=128)
    type = models.PositiveSmallIntegerField()
    token = models.CharField(max_length=128)
    date_added = models.PositiveIntegerField()

    def is_expired(self):
        expire_time = self.TOKEN_EXPIRE_TIME[self.type]
        return self.date_added + expire_time < current_timestamp()

    @classmethod
    def get_or_create(cls, target, type_):
        if type_ not in cls.VALID_TOKEN_TYPES:
            raise ValueError('invalid user token type_')

        o = cls.objects \
            .filter(type=type_, target=target) \
            .order_by('-id')[:1]
        if o and not o[0].is_expired():
            return o[0]

        r = cls(
            target=target,
            type=type_,
            token=random.randint(100000, 999999),
            date_added=current_timestamp()
        )
        r.save()

        return r

    @classmethod
    def check_token(cls, token, target, _type):
        r = ValidateToken.objects \
            .filter(type=_type) \
            .filter(token=token, target=target)

        if r.count() != 1:
            return ErrorCode.INVALID_TOKEN

        if r[0].is_expired():
            return ErrorCode.TOKEN_EXPIRED

        return None

    class Meta:
        db_table = 'core_validate_token'
        index_together = [['target', 'type']]


class UserToken(_models.SimpleBaseModel, AutoCleanMixin):
    auto_clean_setting = ('date_added', 3600*24*30)

    VALID_TOKEN_TYPES = (
        TokenType.RESET_PASSWORD_BY_PHONE,)

    TOKEN_EXPIRE_TIME = {
        TokenType.RESET_PASSWORD_BY_PHONE: 30 * 60,
    }

    user_id = _models.PositiveBigIntegerField()
    type = models.PositiveSmallIntegerField()
    token = models.CharField(max_length=128)
    date_added = models.PositiveIntegerField()

    def is_expired(self):
        expire_time = self.TOKEN_EXPIRE_TIME[self.type]
        return self.date_added + expire_time < current_timestamp()

    @classmethod
    def get_or_create(cls, user_id, type_):
        if type_ not in cls.VALID_TOKEN_TYPES:
            raise ValueError('invalid user token type_')

        o = cls.objects \
            .filter(user_id=user_id, type=type_) \
            .order_by('-id')[:1]
        if o and not o[0].is_expired():
            return o[0]

        r = cls(
            user_id=user_id,
            type=type_,
            token=random.randint(100000, 999999),
            date_added=current_timestamp()
        )
        r.save()

        return r

    @classmethod
    def check_token(cls, token, _type):
        r = UserToken.objects \
            .filter(type=_type, token=token)

        if r.count() != 1:
            return ErrorCode.INVALID_TOKEN

        if r[0].is_expired():
            return ErrorCode.TOKEN_EXPIRED

        return None

    class Meta:
        db_table = 'uc_user_token'
        index_together = [['user_id', 'type']]


class TokenSerial(_models.SimpleBaseModel):
    SERIAL_LENGTH = 8
    VALID_KEY_CHARS = string.ascii_lowercase + string.digits

    user_id = _models.PositiveBigIntegerField()
    serial = models.CharField(max_length=8, unique=True)

    @classmethod
    def create(cls, user_id):
        exp = None
        for i in range(10):
            try:
                r = TokenSerial(
                    user_id=user_id,
                    serial=get_random_string(cls.SERIAL_LENGTH, cls.VALID_KEY_CHARS)
                )
                r.save()

                return r
            except Exception as e:
                exp = e
                pass

        raise exp

    class Meta:
        db_table = 'core_token_serial'


class UserAgent(_models.SimpleBaseModel):
    user_id = _models.PositiveBigIntegerField()
    agent_key = models.CharField(max_length=32)

    class Meta:
        db_table = 'uc_user_agent'
        unique_together = ('agent_key', 'user_id', )


class UserRememberToken(_models.SimpleBaseModel, AutoCleanMixin):
    auto_clean_setting = ('update_at', 3600*24*30*2)

    TOKEN_AGE = 86400
    TOKEN_LENGTH = 16
    VALID_KEY_CHARS = string.ascii_lowercase + string.digits

    serial = _models.PositiveBigIntegerField(db_index=True)
    agent_key = models.CharField(max_length=32, db_index=True)
    last_token = models.CharField(max_length=16)
    token = models.CharField(max_length=16)
    update_at = models.PositiveIntegerField()

    def save(self, *args, **kwargs):
        self.update_at = current_timestamp()
        super(UserRememberToken, self).save(*args, **kwargs)

    @classmethod
    def gen_token(cls):
        return get_random_string(cls.TOKEN_LENGTH, cls.VALID_KEY_CHARS)

    class Meta:
        db_table = 'uc_user_rem_token'


class UserDevice(_models.BaseModel):
    user_id = _models.PositiveBigIntegerField(db_index=True)
    device_token = models.CharField(max_length=128)
    device_token_hash = models.CharField(max_length=8, db_index=True)
    date_added = models.PositiveIntegerField()

    def save(self, *args, **kwargs):
        if not self.date_added:
            self.date_added = current_timestamp()

        self.device_token_hash = UserDevice.hash_device_token(self.device_token)

        super(UserDevice, self).save(*args, **kwargs)

    @classmethod
    def hash_device_token(cls, device_token):
        return hashlib.md5(device_token.encode('utf8')).hexdigest()[:8]

    @classmethod
    def find_by_device_token(cls, device_token):
        return cls.objects \
            .filter(device_token_hash=cls.hash_device_token(device_token)) \
            .filter(device_token=device_token)

    class Meta:
        db_table = 'uc_user_device'


class SIPAccount(_models.SimpleBaseModel):
    VALID_PWD_CHARS = string.ascii_lowercase + string.digits + string.ascii_uppercase
    PWD_LENGTH = 64

    user_id = _models.PositiveBigIntegerField(unique=True)
    username = models.CharField(max_length=128)
    password = models.CharField(max_length=64)
    update_at = models.PositiveIntegerField()

    @classmethod
    def get_or_create(cls, user):
        defaults = {
            'username': '%s' % user.id,
            'password': get_random_string(cls.PWD_LENGTH, cls.VALID_PWD_CHARS)
        }

        r, _ = cls.objects.get_or_create(
            user_id=user.id,
            defaults=defaults
        )

        return r

    def save(self, *args, **kwargs):
        self.update_at = current_timestamp()
        super(SIPAccount, self).save(*args, **kwargs)

    class Meta:
        db_table = 'uc_sip_account'


class UserMaxwellEndpoint(_models.SimpleBaseModel):
    user_id = _models.PositiveBigIntegerField(unique=True)
    endpoint = models.PositiveIntegerField(default=settings.MAXWELL_MASTER_STARFISH)

    @classmethod
    def find(cls, user_id):
        o = cls.objects.getx(user_id=user_id)
        if o:
            return o.endpoint
        else:
            from yxt.models import UserYxt
            if UserYxt.objects.get_or_none(user_id=user_id):
                endpoint = settings.MAXWELL_MASTER_YXT
            else:
                endpoint = settings.MAXWELL_MASTER_STARFISH

            o = cls.objects.get_or_create(user_id=user_id, defaults={'endpoint': endpoint})[0]
            return o.endpoint

    class Meta:
        db_table = 'uc_user_maxwell_endpoint'


class ValidateCode(_models.SimpleBaseModel):
    TIMEOUT = 30 * 60
    MAX_POOL_COUNT = 300
    CACHE_POOL = []

    code = models.CharField(max_length=8)
    avatar = models.CharField(max_length=128)
    date_added = models.PositiveIntegerField()

    @classmethod
    def client_uid(cls, request):
        s = '%s:%s' % (get_client_ip(request), request.META.get('HTTP_USER_AGENT', ''))
        return hashlib.md5(s.encode('utf8')).hexdigest()

    @classmethod
    def full_cache_key(cls, client_uid):
        return 'ValidateCode_%s' % client_uid

    @classmethod
    def fetch_one(cls, request):
        if not cls.CACHE_POOL:
            cls.CACHE_POOL = list(cls.objects.all().values_list('id', flat=True))

        if len(cls.CACHE_POOL) < cls.MAX_POOL_COUNT:
            obj = cls.create_one()
            cls.CACHE_POOL.append(obj.id)
        else:
            index = random.randint(0, len(cls.CACHE_POOL)-1)
            obj = cls.objects.getx(id=cls.CACHE_POOL[index])

        if not obj or not obj.avatar:
            raise RuntimeError('bad ValidateCode')

        memcache.set(cls.full_cache_key(cls.client_uid(request)), obj.id, cls.TIMEOUT)

        return obj

    @classmethod
    def is_valid(cls, request, code):
        cache_key = cls.full_cache_key(cls.client_uid(request))
        pk = memcache.get(cache_key)
        if not pk:
            return False
        # only one chance to validate for each code, not matter it is valid or not
        memcache.delete(cache_key)

        obj = cls.objects.getx(id=pk)
        return obj and obj.code.lower() == code.lower()

    @classmethod
    def create_one(cls):
        from common.validate_code import create_validate_code
        code_img, chars = create_validate_code()
        file_path = ValidateCodeAvatar.generate_file(image_to_data(code_img))
        obj = cls.objects.create(
            code=chars,
            avatar=file_path,
            date_added=current_timestamp()
        )

        return obj

    class Meta:
        db_table = 'core_validate_code'


class ValidateCodeAvatar(_models.FileModelsMixin):
    fs = FileSystemStorage(location=settings.FS_ROOT)
