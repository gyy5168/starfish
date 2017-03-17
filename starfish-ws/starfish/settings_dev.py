# Django settings for starfish project.

DEBUG = True
TEMPLATE_DEBUG = DEBUG

from common.utils import db_name, shard_id

_db_conf = {
    'ENGINE': 'django.db.backends.postgresql_psycopg2',
    'USER': 'mos',
    'PASSWORD': 'mos517nrm',
    'HOST': 'localhost',
    'PORT': '5432',
}

DATABASES = {
    'default': {
        'ENGINE': _db_conf['ENGINE'],
        'NAME': db_name(),
        'USER': _db_conf['USER'],
        'PASSWORD': _db_conf['PASSWORD'],
        'HOST': _db_conf['HOST'],
        'PORT': _db_conf['PORT'],
    }
}

MAX_ORG_ID = 20
for i in range(1, MAX_ORG_ID):
    DATABASES[shard_id(i)] = {
        'ENGINE': _db_conf['ENGINE'],
        'NAME': db_name(i),
        'USER': _db_conf['USER'],
        'PASSWORD': _db_conf['PASSWORD'],
        'HOST': _db_conf['HOST'],
        'PORT': _db_conf['PORT'],
    }
READ_ONLY_MAIN_DB = 'default'
READ_WRITE_MAIN_DB = 'default'
DATABASE_ROUTERS = ['common.router.ReadWriteRouter', ]

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'common.middleware.OrgIdCheckMiddleware',
    'common.middleware.SessionMiddleware',
    'common.middleware.AutoSignInMiddleware',
    'common.middleware.CurrentUserMiddleware',
    'common.middleware.ParametersConverterMiddleware',
    'common.middleware.BasicACLMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'common.middleware.GlobalRequestMiddleware',
    'common.middleware.DisableCSRFMiddleware',
    'common.middleware.UserACLMiddleware',
    'common.middleware.ProjectACLMiddleware',
    'common.middleware.FormatResponseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': u"[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s",
            'datefmt': "%d/%b/%Y %H:%M:%S"
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'null': {
            'level': 'INFO',
            'class': 'django.utils.log.NullHandler',
        },
        'logfile': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': "starfish-ws-prod.log",
            'formatter': 'standard',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'standard'
        },
    },
    'loggers': {
        '': {
            'handlers': ['logfile'],
            'propagate': True,
            'level': 'DEBUG',
        },
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}
YXT_LOGIN_URL = 'http://apitest009.yunxuetang.cn:8080/qidaimapi/v1/users/tokens'
YXT_VALIDATE_TOKEN_URL = 'http://api.qida.yunxuetang.cn/v1/userinfo'
YXT_UPDATE_USER_URL = 'http://lecaiapi.yunxuetang.cn:8080/qidaimapi/v1/users/%s'
SESSION_ENGINE = 'common.session'
SESSION_COOKIE_AGE = 30 * 86400
SESSION_COOKIE_DOMAIN = '123.57.59.182'

SENDFILE_ROOT = '/tmp/'

FS_ROOT = '/tmp'

TMP_MAIL_DIR = '/tmp/exim-mail'

API_ENDPOINT = 'https://api.starfish.im'

MAXWELL_MASTER_ENDPOINT = (
    'tcp://in-005-bj:2012',
)
MAIL_CONFIG = {
    "attachment_limit": 35*1024*1024,  # 35M
    "body_size_limit": 50*1024*1024,   # 50M
}
KAFKA_URL = 'localhost:9092'
BFS_HOSTS = ['']

EXTERNAL_CONTACT_AVATAR_URL_PREFIX = 'https://api.starfish.im/v1/external_contact-avatars'
USER_AVATAR_URL_PREFIX = 'https://api.starfish.im/v1/user-avatars'
ORG_AVATAR_URL_PREFIX = 'https://api.starfish.im/v1/org-avatars'
DISCUSSION_GROUP_AVATAR_URL_PREFIX = 'https://api.starfish.im/v1/discussion-group-avatars'
DEPARTMENT_AVATAR_URL_PREFIX = 'https://api.starfish.im/v1/department-avatars'
MULTIMEDIA_CHAT_ATTACHMENT_URL_PREFIX = 'https://api.starfish.im/v1'

ALLOWED_HOSTS = ['*']

SMS_SWITCH = True

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'KEY_PREFIX': 'dev',
        'LOCATION': [
            'localhost:11211',
        ]
    }
}

ELASTICSEARCH = {
    "hosts": ['in-005-bj:9200']
}
