# Django settings for starfish project.
import logging
import os

from django.conf.global_settings import TEMPLATE_CONTEXT_PROCESSORS as TCP

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# 11s
MAX_QUERY_EXECUTION_TIME = 11000

MAX_ORG_ID = 3

DEFAULT_CHARSET = 'utf-8'

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'Asia/Shanghai'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'zh_CN'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = False

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/var/www/example.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"
STATIC_ROOT = '/opt/mos/codebase/starfish-ws/static'

# URL prefix for static files.
# Example: "http://example.com/static/", "http://static.example.com/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'xs65g!tcydduzyez877)nz$3egahz87h-w4t_@@2f*t2_*be@o'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

ROOT_URLCONF = 'starfish.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'starfish.wsgi.application'

SETTINGS_DIR = os.path.dirname(__file__)
PROJECT_PATH = os.path.join(SETTINGS_DIR, os.pardir)
PROJECT_PATH = os.path.abspath(PROJECT_PATH)

TEMPLATE_DIRS = (
    os.path.join(PROJECT_PATH, 'templates'),
)


TEMPLATE_CONTEXT_PROCESSORS = TCP + (
    'django.core.context_processors.request',
)

INSTALLED_APPS = (
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'oauth2_provider',
    'apps.chat',
    'apps.org',
    'apps.mail',
    'apps.project',
    'apps.i18n',
    'apps.message',
    'apps.version',
    'apps.fs',
    'apps.bfs',
    'apps.acl',
    'apps.application',
    'apps.account',
    'apps.search',
    'apps.misc',
    'apps.oauth2',
    'yxt',
)

OAUTH2_PROVIDER = {
    'SCOPES': {
        'read': '读取你的信息',
        'write': '修改你的信息（包括发送消息）',
    },
}

DEFAULT_SCOPES = ['read', 'write']

AUTH_USER_MODEL = 'account.User'

SMTP_HOST = ['in-100-bj', 'in-101-bj', 'in-105-bj']
SMPT_FAKE_PWD = 'some pwd'

SERVICE_MAIL_CONF = {
    'from': 'service@bitfamily.com',
}

SENDFILE_BACKEND = 'sendfile.backends.nginx'
SENDFILE_URL = '/protected'

MAIN_DOMAIN = 'api.starfish.im'
MAIN_DOMAIN_YXT = 'qdim.yunxuetang.cn'

USER_AVATAR_URL_PREFIX_YXT = 'https://qdim.yunxuetang.cn/v1/user-avatars'
ORG_AVATAR_URL_PREFIX_YXT = 'https://qdim.yunxuetang.cn/v1/org-avatars'
USER_AVATAR_URL_PREFIX_STARFISH = 'https://api.starfish.im/v1/user-avatars'
ORG_AVATAR_URL_PREFIX_STARFISH = 'https://api.starfish.im/v1/org-avatars'

PROJECT_DETAIL_URL_PATTERN = 'https://api.starfish.im/v1/app_url/?app_params=%2Fpages%2Ftask-detail%2Findex.html%3Fproject_id%3D{project_id}%26task_id%3D{task_id}&app={PROJECT_APP_ID}'

PROJECT_APP_ICON = 'https://api.starfish.im/v1/app_icons/task_app_icon.png'
FILE_APP_ICON = 'https://api.starfish.im/v1/app_icons/file_app_icon.png'

API_URL = 'https://%s/v1' % MAIN_DOMAIN
API_URL_YXT = 'https://%s/v1' % MAIN_DOMAIN_YXT

INVITATION_URL = 'http://www.starfish.im/pages/invite/index.html?inviteId={invitation_id}&orgId={org_id}&phone={phone}'

DOWNLOADS_URL_PREFIX = 'https://pkg.starfish.im/downloads'

NOT_FOUND_PAGE = 'https://pkg.starfish.im/not-found'

WECHAT_OPEN_PLATFORM_APP_ID = 'wx1689381406fcc40f'
WECHAT_OPEN_PLATFORM_APP_SECRET = '755d8d89d439171b5a8478db32d1ec5d'

WECHAT_ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code={code}&grant_type=authorization_code' % (
    WECHAT_OPEN_PLATFORM_APP_ID, WECHAT_OPEN_PLATFORM_APP_SECRET
)

WECHAT_REFRESH_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=%s&grant_type=refresh_token&refresh_token={refresh_token}' % (
    WECHAT_OPEN_PLATFORM_APP_ID
)

WECHAT_USERINFO_URL = 'https://api.weixin.qq.com/sns/userinfo?access_token={access_token}&openid={openid}'

SESSION_COOKIE_NAME = 'session_id'

AGENT_AGE = 30 * 86400

STARFISH_TOKEN_QUEUE_NAME = 'new_starfish_token'
STARFISH_WECHAT_BIND_QUEUE_NAME = 'new_starfish_wechat_bind'
STARFISH_MESSAGE_QUEUE_NAME = 'new_starfish_message'
STARFISH_MESSAGE_ORG_QUEUE_NAME = 'new_starfish_org_message'
STARFISH_SAVE_USER_MESSAGE_QUEUE_NAME = 'new_starfish_save_user_message'
STARFISH_OFFLINE_QUEUE_NAME = 'new_starfish_offline'
STARFISH_CONVERSATION_UPDATED_MESSAGE_QUEUE_NAME = 'new_starfish_conversation_updated'
STARFISH_EMAIL_QUEUE_NAME = 'new_starfish_email'
STARFISH_AUTO_CLEAN_TABLES_QUEUE_NAME = 'new_starfish_auto_clean_tables'
STARFISH_INDEX_QUEUE_NAME = 'starfish_index'
STARFISH_ORG_DOMAIN_UPDATED_QUEUE = 'new_starfish_org_domain_updated'
STARFISH_APNS_QUEUE = 'maxwell_apns'

STARFISH_OPERATION_INFO_QUEUE = 'starfish_operation_info_queue'
STARFISH_SAVE_USER_MESSAGE_PROCESSES = (4, 2)  # tuple(fast process count, slow process count)
STARFISH_SAVE_USER_MESSAGE_LIMIT = 100

IMAGE_RESIZE_SPEC = {
    'mobile': (400, 400),
    'mobile_avatar': (200, 200),
    'pc': (400, 400),
}

IMAGE_RESIZE_MIN_SIZE = {
    (400, 400): 80,
    (200, 200): 40,
    (70, 70): 10,
    (90, 90): 10,
    (64, 64): 10,
    (34, 34): 10,
    (32, 32): 10,
}

SMS_GATEWAY_URL = 'https://sms-gateway.starfish.im/messages'
SMS_GATEWAY_SECRET_CODE = 'b0144c503fe928716c73726acfc53ef0'
SMS_GATEWAY_TIMEOUT = 15
SMS_TYPE_TOKEN = 'token'
SMS_TYPE_INVITATION = 'invitation'

OPENSIPS_GATEWAY = 'https://opensips-gateway.starfish.im/subscribers'

MAIL_MESSAGE_ID_SUFFIX = 'starfish.im'

WECHAT_CROP_TOKEN = "CdukYVWy7bcOwTeOeqGuXS9Nxk"
WECHAT_CROP_ENCODING_AES_KEY = "xn8vjJAS4buzk17saOIgR5SwQcwEldSmUCHVH3TpDPt"
WECHAT_CROP_CORP_ID = "wx6cc875eb6aabdb03"

SMTP_MX_RECORDS = ('mx1.starfish.im.', 'mx2.starfish.im.')

BFS_HOSTS_YXT = ['120.132.70.134', '123.59.67.127', '123.59.66.50']
BFS_HOSTS = ['123.56.41.201', '123.57.156.96', '182.92.212.220']

CORS_ORIGIN_ALLOW_ALL = False
CORS_ALLOW_CREDENTIALS = True

CORS_ORIGIN_REGEX_WHITELIST = (
    '^(?:http|https)s?://starfish.im',
    '^(?:http|https)s?://.*\.starfish.im',
    '^(?:http|https)s?://getstarfish.com',
    '^(?:http|https)s?://.*\.getstarfish.com',
    '^(?:http|https)s?://localhost:.*',
    '^(?:http|https)s?://192\.168\..*',
)

CORS_ALLOW_HEADERS = (
    'x-requested-with',
    'content-type',
    'accept',
    'origin',
    'authorization',
    'x-csrftoken',
    'x-session-id',
)

IS_YXT_ENV = False

env = os.environ.get('DJANGO_ENV', None)
valid_envs = (
    'unittest-sqlite3',
    'dev',
    'prod',
    'script',
    'test',
    'script_test',
    'prod_yxt',
    'test_yxt',
    'script_yxt')
if env not in valid_envs:
    raise ValueError('invalid env: %s', env)

if env == 'dev':
    from .settings_dev import *

if env == 'unittest-sqlite3':
    from .settings_unittest_sqlite3 import *

if env == 'prod':
    from .settings_prod import *

if env == 'script':
    from .settings_script import *

if env == 'test':
    from .settings_test import *

if env == 'script_test':
    from .settings_script_test import *

if env == 'prod_yxt':
    from .settings_prod_yxt import *
    IS_YXT_ENV = True

if env == 'test_yxt':
    from .settings_test_yxt import *
    IS_YXT_ENV = True

if env == 'script_yxt':
    from .settings_script_yxt import *
    IS_YXT_ENV = True

os.environ['PGOPTIONS'] = '-c statement_timeout=%s' % MAX_QUERY_EXECUTION_TIME
os.environ['PYTHON_EGG_CACHE'] = '/tmp'

logging._defaultFormatter = logging.Formatter(u"%(message)s")

REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'common.exceptions.final_exception_handler'
}

SEARCH_HIGHLIGHT_TAGS = {
    0: ([""], [""]),
    1: (['<span style="color:#3c99dc;font-size:13px;">'], ['</span>']),
    2: (['<font color="#52a9e7"><i><b>'], ['</b></i></font>'])
}

RABBIT_MQ_CONF = {"host": '123.57.59.182',
                  "port": 5672,
                  "username": "wanglijun",
                  "password": "wanglijun"}

REQUEST_TIME_LIMIT_LEVELS = (200, 500, 800)


# settings for maxwell master endpoints for all deployments #
MAXWELL_MASTER_STARFISH = 1  # maxwell starfish
MAXWELL_MASTER_YXT = 100  # mawell yxt

# set CURRENT_MAXWELL_MASTER by IS_YXT_ENV(DJANGO_ENV==prod_yxt or script_yxt)
CURRENT_MAXWELL_MASTER = MAXWELL_MASTER_STARFISH
if IS_YXT_ENV:
    CURRENT_MAXWELL_MASTER = MAXWELL_MASTER_YXT

ALL_MAXWELL_MASTER_ENDPOINTS = {
    MAXWELL_MASTER_STARFISH:
        ('tcp://en-101-bj:2012', 'tcp://en-102-bj:2012', 'tcp://en-105-bj:2012'),
    MAXWELL_MASTER_YXT:
        ('tcp://en-203-gd:2012', 'tcp://en-204-gd:2012', 'tcp://en-210-gd:2012'),
}

if not IS_YXT_ENV:
    ALL_MAXWELL_MASTER_ENDPOINTS[MAXWELL_MASTER_STARFISH] = MAXWELL_MASTER_ENDPOINT
