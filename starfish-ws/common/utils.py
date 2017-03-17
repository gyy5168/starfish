import glob
import json
import logging
import math
import operator
import os
import re
import signal
import time
from datetime import datetime, timedelta
from random import choice

import requests

import magic
from common import Singleton
from common.avatar_tool import TextImage
from common.const import DateTimeFormat, DestType, ErrorCode, PeerType, SrcType
from django.conf import settings
from django.db.models import get_model
from django.http import HttpResponse, HttpResponseNotFound
from django.utils.decorators import classonlymethod
from django.views.generic import View
from PIL import Image
from sendfile import sendfile
from starfish import is_org_model

log = logging.getLogger(__name__)


def ensure_dir_exists(filename):
    directory = os.path.dirname(filename)
    if not os.path.exists(directory):
        try:
            os.makedirs(directory)
        except OSError:
            pass


def print_enum(cls, f):
    x = {}
    for k, v in list(cls.__dict__.items()):
        if not f(k):
            continue
        x[k] = v

    for k, v in sorted(iter(x.items()), key=operator.itemgetter(1)):
        print('%s = %s' % (k, v))


def to_str(unicode_or_str, charset='utf8'):
    if isinstance(unicode_or_str, str):
        return unicode_or_str

    return unicode_or_str.encode(charset)


def first_day_of_week(_day=None):
    day = _day or datetime.today()
    day_of_week = day.weekday()

    to_beginning_of_week = timedelta(days=day_of_week)
    return day - to_beginning_of_week


def last_day_of_week(_day=None):
    day = _day or datetime.today()
    day_of_week = day.weekday()

    to_end_of_week = timedelta(days=6 - day_of_week)
    return day + to_end_of_week


def unlink_many(pattern):
    for i in glob.glob(pattern):
        try:
            os.unlink(i)
        except OSError:
            pass


def find_first_gap(l):
    '''
    l = sorted list
    input: [1, 2, 5, 7]
    output: 3
    '''
    if not l:
        return None

    start = l[0]
    for i in l:
        if i == start:
            start += 1
            continue
        else:
            return start

    return None


class ThumbnailGenerator(object):
    (TYPE_RATIO, TYPE_CROP) = list(range(2))

    def generate(self, im, size, type_=TYPE_RATIO):
        if type_ == self.TYPE_RATIO:
            new_size = calc_thumbnail_size(
                im.size[0], im.size[1], size[0], size[1])
            im.thumbnail(new_size, Image.ANTIALIAS)
            return im

        if type_ == self.TYPE_CROP:
            ratio = 1. * size[0] / size[1]
            (width, height) = im.size
            if width > height * ratio:
                # crop the image on the left and right side
                new_width = int(height * ratio)
                left = width / 2 - new_width / 2
                right = left + new_width
                # keep the height of the image
                top = 0
                bottom = height
            elif width < height * ratio:
                # crop the image on the top and bottom
                new_height = int(width * ratio)
                top = height / 2 - new_height / 2
                bottom = top + new_height
                # keep the width of the impage
                left = 0
                right = width

            if width != height * ratio:
                im = im.crop((int(left), int(top), int(right), int(bottom)))

            return im.resize((size[0], size[1]), Image.ANTIALIAS)


def calc_thumbnail_size(width, height, max_width, max_height):
    if width < max_width and height < max_height:
        return (width, height)

    ratio = min(max_width * 1.0 / width, max_height * 1.0 / height)
    return (int(ratio * width), int(ratio * height))


def is_valid_shard_id(shard_id):
    return shard_id and shard_id in settings.DATABASES


def shard_id(org_id=0):
    if not org_id:
        return 'default'

    return 'starfish-org-%s' % org_id


def to_org_id(shard_id):
    if shard_id == 'default':
        return 0

    return int(shard_id.split('-')[-1])


def db_name(org_id=0):
    if not org_id:
        return 'starfish_prod_main'

    return 'starfish_prod_org_%08d' % int(org_id)


def chunks(l, n):
    for i in range(0, len(l), n):
        yield l[i:i + n]


def current_timestamp():
    return int(time.time())


def is_phone_number(v):
    return re.match('^\+?[\d ]+$', v)


def is_valid_email_local_part(v):
    return re.match('^[a-zA-Z0-9_\.]+$', v)


def normalize_phone_number(v, append=True):
    if append:
        if v[0] != '+':
            v = '+86' + v

    return v.replace(' ', '')


def format_phone_number(v):
    try:
        import phonenumbers
        x = phonenumbers.parse(v, 'CN')
        return phonenumbers.format_number(x, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
    except:
        pass

    return ''


def is_mobile_brower(agent):
    import httpagentparser
    r = httpagentparser.detect(agent)
    if not r['platform']['name']:
        r['platform']['name'] = ''

    return r['platform']['name'].lower() in ('ios', 'android')


_TAG_RE = re.compile(r'<[^>]+>')


def remove_tags(text):
    return _TAG_RE.sub('', text)


def remove_special_tags(s, tags):
    for t in tags:
        s = re.subn(r'<(%s).*?</\1>(?s)' % t, '', s)[0]
    return s


def detect_mime_type(path):
    import magic
    return magic.from_file(path, mime=True).decode('utf8')


def check_bfs_file_permission(user_id, org_id, bfs_file):
    from apps.bfs.models import BfsFile
    from common.exceptions import APIError
    if not BfsFile.is_created_by(bfs_file.id, user_id, org_id):
        raise APIError(ErrorCode.PERMISSION_DENIED,
                       org_id=org_id, user_id=user_id, bfs_file=bfs_file.id)


def to_local_tz(dt):
    if isinstance(dt, datetime):
        from dateutil.tz import tzlocal
        if dt.tzinfo and dt.tzinfo != tzlocal():
            dt = dt.astimezone(tzlocal())
    return dt


def date_to_str(dt):
    try:
        return datetime.strftime(dt, DateTimeFormat.DATE)
    except:
        pass


def str_to_date(s):
    try:
        return datetime.strptime(s, DateTimeFormat.DATE).date()
    except:
        pass


def time_to_str(dt):
    try:
        return datetime.strftime(to_local_tz(dt), DateTimeFormat.DATETIME)
    except:
        pass


def str_to_time(s):
    try:
        return datetime.strptime(s, DateTimeFormat.DATEtime)
    except:
        pass


def dt_to_timestamp(dt):
    try:
        return int(time.mktime(to_local_tz(dt).timetuple()))
    except:
        pass


# TODO refactor this
class AttachmentView(View):

    @classonlymethod
    def as_view(cls, starfish_api_view_role=None, **initkwargs):
        starfish_api_perms = {}
        if starfish_api_view_role:
            starfish_api_perms.update(get=starfish_api_view_role,
                                      head=starfish_api_view_role)

        view = super(AttachmentView, cls).as_view(**initkwargs)
        view.starfish_api_perms = starfish_api_perms
        return view

    def _build_json_response(self, errcode):
        data = {
            'error': {
                'code': errcode,
                'msg': ErrorCode.get_error_message(errcode)}
            }
        return HttpResponse(json.dumps(data), content_type='application/json')

    def _build_attachment_response(self, request, filename, filepath):
        mimetype = None
        try:
            mimetype = magic.from_file(filepath, mime=True).decode('utf8')
        except IOError:
            log.info('detect mimetype error, file=%s', filepath)
            return HttpResponseNotFound('not found.')

        if self._should_resize(request, mimetype):
            return self._resize_image(request, filename, filepath, mimetype)

        return self._build_attachment_response0(request, filename, filepath, mimetype)

    def _should_resize(self, request, mimetype):
        if mimetype not in ('image/jpeg', 'image/png'):
            return False

        if 'height' not in request.GET or 'width' not in request.GET:
            return False

        if hasattr(request, '_resize_disabled') and request._resize_disabled:
            return False

        return True

    def _resize_image(self, request, filename, filepath, mimetype):
        from django.conf import settings

        size = (int(request.GET['width']), int(request.GET['height']))
        if size not in settings.IMAGE_RESIZE_MIN_SIZE:
            return self._build_json_response(errcode=ErrorCode.BAD_IMAGE_SIZE)

        resized_image_suffix = '%s.png' % 'X'.join([str(x) for x in size])
        resized_image_path = '%s_%s' % \
            (filepath, resized_image_suffix)

        if not os.path.isfile(resized_image_path):
            im = Image.open(filepath)
            new_im = ThumbnailGenerator().generate(im, size)
            new_im.save(resized_image_path)

        return self._build_attachment_response0(
            request,
            resized_image_suffix,
            resized_image_path,
            mimetype)

    def _build_attachment_response0(self, request, filename, filepath, mimetype):
        response = None
        if 'attachment' in request.GET:
            response = sendfile(
                request, filepath, attachment_filename=filename,
                attachment=True, mimetype=mimetype)
        else:
            response = sendfile(request, filepath, mimetype=mimetype)

        # add auto signin response and cookies
        if hasattr(request, '_auto_signin_extra'):
            response.cookies = request._auto_signin_cookies

        return response


class BaseAvatar(AttachmentView):
    DUMMY_AVATAR_NAME = 'a.png'

    def _get(self, request, avatar, model, default_avatar):
        if not avatar:
            return self._build_attachment_response(
                request, self.DUMMY_AVATAR_NAME, default_avatar)

        return self._build_attachment_response(
            request, self.DUMMY_AVATAR_NAME, model.full_path(avatar))


class GroupAvatarGenerator(object, metaclass=Singleton):
    # 计算结果参考这里：
    # http://hydra.nat.uni-magdeburg.de/packing/cci/

    MAX_NUM_OF_SINGLE_AVATAR = 5

    MIN_BOX_SIZE = 11

    BORDER_SIZE = 2

    def __init__(self):
        self.border_image = Image.open(
            '%s/../apps/org/files/avatar_border.png'
            % os.path.dirname(os.path.abspath(__file__)))

        self.mask_images = (
            (15, Image.open(
                '%s/../apps/org/files/avatar_mask_15.png' %
                os.path.dirname(os.path.abspath(__file__)))),
            (30, Image.open(
                '%s/../apps/org/files/avatar_mask_30.png' %
                os.path.dirname(os.path.abspath(__file__)))),
            (100, Image.open(
                '%s/../apps/org/files/avatar_mask_100.png' %
                os.path.dirname(os.path.abspath(__file__)))),
            (200, Image.open(
                '%s/../apps/org/files/avatar_mask_200.png' %
                os.path.dirname(os.path.abspath(__file__)))),
        )

    def generate(self, image_files, box_size, name=''):
        if not image_files:
            if name:
                return TextImage().create(name, extract_rule=TextImage.EXTRACT_CN_FIRST,
                                          width=box_size, height=box_size)
            else:
                return Image.new('RGBA', (box_size, box_size), 'white')

        num_boxes = min(len(image_files), self.MAX_NUM_OF_SINGLE_AVATAR)
        for i in reversed(range(1, num_boxes + 1)):
            boxes = getattr(self, '_calc_boxes%s' % i)(box_size, self._gap(box_size))
            if self._box_size(boxes[0]) > self.MIN_BOX_SIZE:
                break

        return self._generate_final(image_files[:len(boxes)], box_size, boxes)

    def _gap(self, box_size):
        return math.ceil(box_size / 50)

    def _box_size(self, box):
        return box[2] - box[0]

    def _calc_boxes1(self, box_size, gap):
        r = box_size / 4
        return (
            (box_size / 2 - r,
             box_size / 2 - r,
             box_size / 2 + r,
             box_size / 2 + r),
        )

    def _calc_boxes2(self, box_size, gap):
        r = box_size / 4 - gap
        return (
            (box_size / 2 - 1.707 * r - gap,
             box_size / 2 - 1.707 * r,
             box_size / 2 + 0.293 * r - gap,
             box_size / 2 + 0.293 * r),
            (box_size / 2 - 0.293 * r + gap,
             box_size / 2 - 0.293 * r,
             box_size / 2 + 1.707 * r + gap,
             box_size / 2 + 1.707 * r),
        )

    def _calc_boxes3(self, box_size, gap):
        r = box_size / 2.0 * 0.464 - gap
        return (
            ((box_size - 2 * r) / 2,
             gap,
             (box_size + 2 * r) / 2,
             2 * r + gap),
            (box_size / 2 - 2 * r - gap,
             math.sqrt(3) * r + gap * 2,
             box_size / 2 - gap,
             math.sqrt(3) * r + 2 * r + gap * 2),
            (box_size / 2 + gap,
             math.sqrt(3) * r + gap * 2,
             box_size / 2 + 2 * r + gap,
             math.sqrt(3) * r + 2 * r + gap * 2),
        )

    def _calc_boxes4(self, box_size, gap):
        r = box_size / 2.0 * 0.414 - gap
        return (
            (box_size / 2 - 2 * r - gap,
             box_size / 2 - 2 * r - gap,
             box_size / 2 - gap,
             box_size / 2 - gap),
            (box_size / 2 + gap,
             box_size / 2 - 2 * r,
             box_size / 2 + 2 * r + gap,
             box_size / 2),
            (box_size / 2 - 2 * r,
             box_size / 2 + gap,
             box_size / 2,
             box_size / 2 + 2 * r + gap),
            (box_size / 2 + gap,
             box_size / 2 + gap,
             box_size / 2 + 2 * r + gap,
             box_size / 2 + 2 * r + gap),
        )

    def _calc_boxes5(self, box_size, gap):
        r = box_size / 2 * 0.37 - gap
        _r = box_size / 2 - r
        return (
            (box_size / 2 - r,
             gap,
             box_size / 2 + r,
             r * 2 + gap),
            (box_size / 2 - _r * math.sin(math.pi * 72 / 180) - r + gap,
             box_size / 2 - _r * math.cos(math.pi * 72 / 180) - r,
             box_size / 2 - _r * math.sin(math.pi * 72 / 180) + r + gap,
             box_size / 2 - _r * math.cos(math.pi * 72 / 180) + r),
            (box_size / 2 + _r * math.sin(math.pi * 72 / 180) - r - gap * 2,
             box_size / 2 - _r * math.cos(math.pi * 72 / 180) - r,
             box_size / 2 + _r * math.sin(math.pi * 72 / 180) + r - gap * 2,
             box_size / 2 - _r * math.cos(math.pi * 72 / 180) + r),
            (box_size / 2 - _r * math.sin(math.pi * 36 / 180) - r + gap,
             box_size / 2 + _r * math.cos(math.pi * 36 / 180) - r - gap * 2,
             box_size / 2 - _r * math.sin(math.pi * 36 / 180) + r + gap,
             box_size / 2 + _r * math.cos(math.pi * 36 / 180) + r - gap * 2),
            (box_size / 2 + _r * math.sin(math.pi * 36 / 180) - r - gap,
             box_size / 2 + _r * math.cos(math.pi * 36 / 180) - r - gap * 2,
             box_size / 2 + _r * math.sin(math.pi * 36 / 180) + r - gap,
             box_size / 2 + _r * math.cos(math.pi * 36 / 180) + r - gap * 2),
        )

    def _generate_mask(self, box_size, box):
        mask = Image.new('L', (box_size, box_size), 'black')

        ellipse_size = (box[2] - box[0], box[3] - box[1])
        ellipse = self._select_mask_image(ellipse_size[0]).convert('L').resize(ellipse_size)

        mask.paste(ellipse, box)
        return mask

    def _select_mask_image(self, size):
        for s, mask in self.mask_images:
            if s > size:
                return mask

        return self.mask_images[-1][1]

    def _generate_ellipse_avatar(self, box_size, origin_avatar, box):
        im = Image.new('RGBA', (box_size, box_size))
        im.paste(
            ThumbnailGenerator().generate(
                origin_avatar,
                (box[2] - box[0], box[3] - box[1]),
                type_=ThumbnailGenerator.TYPE_CROP), box)

        mask = self._generate_mask(box_size, box)
        im.putalpha(mask)

        return im

    def _generate_final(self, image_files, box_size, boxes):
        im = None
        for i, box in enumerate(boxes):
            box = tuple([self._calc_size(k) for k in box])
            ellipse_avatar = self._generate_ellipse_avatar(
                box_size,
                Image.open(image_files[i]),
                box)
            if not im:
                im = ellipse_avatar
            else:
                im = Image.alpha_composite(im, ellipse_avatar)

        # add border
        im = Image.alpha_composite(self._gen_border(box_size), im)

        # transparent to white
        pixdata = im.load()
        for y in range(im.size[1]):
            for x in range(im.size[0]):
                if pixdata[x, y][3] < 255:
                    pixdata[x, y] = (255, 255, 255, 255)

        return im

    def _gen_border(self, box_size):
        return self.border_image.resize((box_size, box_size))

    def _in_ellipse(self, box_size, xy):
        r = int((box_size - self.BORDER_SIZE * 4) / 2.0)
        return (xy[0] - r - self.BORDER_SIZE) ** 2 + (xy[1] - r - self.BORDER_SIZE) ** 2 < r ** 2

    def _calc_size(self, s):
        return int(math.floor(s))


class WechatUtil(object):
    class Error(RuntimeError):
        pass

    def fetch_userinfo_by_token(self, refresh_token):
        from django.conf import settings

        r = requests.get(
            settings.WECHAT_REFRESH_TOKEN_URL.format(refresh_token=refresh_token))
        if r.status_code != requests.codes.ok:
            raise self.Error(r.reason)

        tokens = json.loads(r.text)

        r = requests.get(
            settings.WECHAT_USERINFO_URL.format(
                access_token=tokens['access_token'],
                openid=tokens['openid']))
        if r.status_code != requests.codes.ok:
            raise self.Error(r.reason)

        return (tokens, json.loads(r.text))


def setattr_if_changed(obj, **kwargs):
    '''use to check value before set and save() to db'''
    is_changed = False
    for attr, val in kwargs.items():
        if val != getattr(obj, attr):
            setattr(obj, attr, val)
#             print('set %s=%s' % (attr, val))
            is_changed = True
    return is_changed


def parse_endpoint(endpoint):
    match = re.search('(?P<protocol>.*)://(?P<host>.*):(?P<port>\d+)', endpoint)
    return (match.group('protocol'), match.group('host'), int(match.group('port')))


def make_key(key, key_prefix, version):
    from common.cache import GlobalCacheSettings
    return ':'.join([str(GlobalCacheSettings.prefix), key_prefix, str(version), key])


def check_domain_mx_records(domain):
    import dns.resolver

    try:
        answers = dns.resolver.query(domain, 'MX')
    except dns.resolver.NXDOMAIN:
        return False
    except Exception as e:
        log.error('check_domain_mx_records: error %s' % e)
        return False

    for rdata in answers:
        if rdata.exchange.to_text() not in settings.SMTP_MX_RECORDS:
            return False

    return True


def openImage(path, mimetype=None):
    if not mimetype:
        mimetype = detect_mime_type(path)

    if mimetype == 'image/vnd.adobe.photoshop':
        from psd_tools import PSDImage

        return PSDImage.load(path).as_PIL()

    return Image.open(path)


class Timer(object):
    def is_start(self, key=None):
        return len(getattr(self, '_timer_timestamps', {}).get(key, [])) == 2

    def timer_start(self, *keys):
        if not hasattr(self, '_timer_timestamps'):
            self._timer_timestamps = {}
        now = time.time()
        for key in keys or [None]:
            # save in list: [start_time, catch_time]
            self._timer_timestamps[key] = [now, now]
        return self

    def timer_catch(self, key=None):
        if not self.is_start(key):
            raise RuntimeError('call Timer().timer_start(%s) first.' % key)
        now = time.time()
        last_catch_time = self._timer_timestamps[key][1]
        self._timer_timestamps[key][1] = now
        return now - last_catch_time

    def timer_stop(self, key=None):
        if not self.is_start(key):
            raise RuntimeError('call Timer().timer_start(%s) first.' % key)
        return time.time() - self._timer_timestamps.pop(key)[0]

    @classmethod
    def timer_run(cls, func, *args, **kwargs):
        start = time.time()
        return func(*args, **kwargs), time.time() - start


def list_ids(ids, sep=','):
    '''
    input ids can be an int id, or string separated by sep(default is ,)
    return a list of ids
    '''
    if isinstance(ids, int):
        return [ids]
    else:
        return [int(i) for i in ids.split(sep) if i]


def calc_pinyin(txt):
    '''
        return an integer value in range [0, 0x7a7a7a7a]
        0x7a is the ascii value of character 'z'
        the max return value is less than 2^31-1 (+2147483647, the limit of integer in postgresql)
    '''
    import pinyin
    res = 0
    if txt:
        i = 3
        for c in pinyin.get_initial(txt.lower()).split(' '):
            if i < 0:
                break
            if ('a' <= c <= 'z') or ('0' <= c <= '9'):
                res += (ord(c) << (i * 8))
            i -= 1
    return res


class TargetObject(object, metaclass=Singleton):

    DEFINES = {
        "src_type": {SrcType.ORG_MEMBER: 'account.User',
                     SrcType.EXTERNAL_CONTACT: 'org.ExternalContact',
                     SrcType.GENERATED_CONTACT: 'org.GeneratedContact'
                     },

        "dest_type": {DestType.ORG_MEMBER: 'account.User',
                      DestType.ORG: 'org.Org',
                      DestType.DISCUSSION_GROUP: 'org.DiscussionGroup',
                      DestType.DEPARTMENT: 'org.Department'
                      },

        "peer_type": {PeerType.ORG_MEMBER: 'account.User',
                      PeerType.EXTERNAL_CONTACT: 'org.ExternalContact',
                      PeerType.GENERATED_CONTACT: 'org.GeneratedContact',
                      PeerType.DEPARTMENT: 'org.Department',
                      PeerType.DISCUSSION_GROUP: 'org.DiscussionGroup'}

    }

    PRE_DEFINE_FIELDS = {
        'avatar_url': 'avatar_url',
        'name': 'name'
    }

    def __init__(self):
        self.valid_models = {}
        for i in self.DEFINES.values():
            for app_model in i.values():
                if app_model in self.valid_models:
                    continue
                app, model_name = app_model.split('.')
                m = get_model(app, model_name)
                self.valid_models[app_model] = m
                self.valid_models[model_name] = m

    def update(self, db, **kwargs):
        for type_k in self.DEFINES:
            type_v = kwargs.get(type_k)
            if type_v is None:
                continue

            _prefix = type_k.split('_')[0]
            id_k = '%s_id' % _prefix
            id_v = kwargs.get(id_k)  # id_v = kwargs.pop(id_k)

            app_model_def = self.DEFINES[type_k].get(type_v)
            if app_model_def is None:
                kwargs[_prefix] = dict(id=id_v)
            else:
                data = self.obj_info(app_model_def, id_v, db)
                if data:
                    kwargs[_prefix] = data

        return kwargs

    def obj_info(self, model, pk, db=None):
        '''model can be a Model type,
        or string of model name,
        or string of app_label.model_name
        '''
        ret = {'id': pk}
        if isinstance(model, str):
            model = self.valid_models.get(model)
            if not model:
                return ret

        if is_org_model(model):
            obj = model.objects.using(db).getx(id=pk)
        else:
            obj = model.objects.getx(id=pk)

        if obj:
            for k, v in self.PRE_DEFINE_FIELDS.items():
                if hasattr(obj, v):
                    ret[k] = getattr(obj, v)
        return ret


class ProcessExister(object):
    def __init__(self, callback, *signals):
        self.is_running = True
        self.callback = callback

        for sig in signals:
            signal.signal(sig, self.__exit)

    def __exit(self, signum, frame):
        self.is_running = False
        try:
            self.callback(signum, frame)
        except TypeError:
            self.callback()


def json_dumps(obj, **kwargs):
    return json.dumps(obj, **kwargs)


def json_loads(s, **kwargs):
    return json.loads(s, **kwargs)


def all_orgs():
    from yxt.models import OrgYxt
    from apps.org.models import Org
    yxt_org_ids = list(OrgYxt.objects.values_list('org_id', flat=True))
    if not settings.IS_YXT_ENV:
        return Org.objects.exclude(id__in=yxt_org_ids)
    else:
        return Org.objects.filter(id__in=yxt_org_ids)


def valid_org(org_id):
    from yxt.models import OrgYxt
    if not settings.IS_YXT_ENV:
        return OrgYxt.objects.getx(org_id=org_id) is None
    else:
        return OrgYxt.objects.getx(org_id=org_id) is not None


def bfs_host(is_yxt_env=False):
    hosts = settings.BFS_HOSTS
    if is_yxt_env and hasattr(settings, 'BFS_HOSTS_YXT'):
        hosts = settings.BFS_HOSTS_YXT

    return choice(hosts)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class Landbridge(object):
    @classmethod
    def send_request(cls, user_id, url, params=None):
        if not params:
            return requests.get('%s%s' % (cls._url_prefix(user_id), url))

        return requests.get('%s%s' % (cls._url_prefix(user_id), url), params=params)

    @classmethod
    def _get_shard_spec_for(cls, user_id):
        spec = settings.LANDBRIDGE_SPEC
        cluster_size = spec.get('cluster_size')
        index = user_id % cluster_size
        return spec.get('shard').get(index)

    @classmethod
    def _url_prefix(cls, user_id):
        spec = cls._get_shard_spec_for(user_id)
        return spec.get('rest_url')


def timeit(f):
    def timed(*args, **kw):
        ts = time.time()
        result = f(*args, **kw)
        te = time.time()

        log.info('func:%r args:[%r, %r] took: %2.4f sec', f.__name__, args, kw, te - ts)
        return result

    return timed
