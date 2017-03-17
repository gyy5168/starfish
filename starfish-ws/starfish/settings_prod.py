# Django settings for starfish project.

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# 4.5s
MAX_QUERY_EXECUTION_TIME = 4500

import defines
import utils
from common.utils import db_name, shard_id

_db_conf = utils.parse_postgres_url(defines.get_db_conf())

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': db_name(),
        'USER': _db_conf['user'],
        'PASSWORD': _db_conf['password'],
        'HOST': _db_conf['host'],
        'PORT': 5433,
    }
}

MAX_ORG_ID = 750

for i in range(1, MAX_ORG_ID):
    DATABASES[shard_id(i)] = {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': db_name(i),
        'USER': _db_conf['user'],
        'PASSWORD': _db_conf['password'],
        'HOST': _db_conf['host'],
        'PORT': _db_conf['port'],
    }

READ_ONLY_MAIN_DB = 'default_readonly'
READ_WRITE_MAIN_DB = 'default'
# DATABASE_ROUTERS = ['common.router.ReadWriteRouter', ]

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'common.middleware.OrgIdCheckMiddleware',
    'common.middleware.OAuth2TokenMiddleware',
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
            'filename': "/mnt1/logs/starfish-ws-prod.log",
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

SESSION_ENGINE = 'common.session'
SESSION_COOKIE_AGE = 30 * 86400
SESSION_COOKIE_DOMAIN = 'starfish.im'

SENDFILE_ROOT = '/mnt/mfs/starfish-ws/'

FS_ROOT = '/mnt/mfs/starfish-ws'

TMP_MAIL_DIR = '/mnt/mfs/exim-mail'

API_ENDPOINT = 'https://api.starfish.im'

MAXWELL_MASTER_ENDPOINT = (
    'tcp://in-101-bj:2012', 'tcp://in-102-bj:2012', 'tcp://in-105-bj:2012'
)
MAIL_CONFIG = {
    "attachment_limit": 35*1024*1024,  # 35M
    "body_size_limit": 50*1024*1024,  # 50M
}
KAFKA_URL = defines.get_kafka_conf()

ZK_HOSTS = defines.ZK_HOSTS

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
        'KEY_PREFIX': '',
        'LOCATION': [
            'in-102-bj:11211',
            'in-101-bj:11211',
            'in-105-bj:11211',
        ]
    }
}

ELASTICSEARCH = {
    "hosts": defines.ELASTICSEARCH_HOSTS,
}

VERSION_ADMIN_PHONES = (
    '18551628467',   # zenglu
    '86403399451',   # liyuzhe
    '20150908123',   # zhangyang
    '13718874790',   # 张柳航
)

LANDBRIDGE_SPEC = {
    'cluster_size': 1,
    'shard': {
        0: {
            'queue_partition': 0,
            'rest_url': 'http://10.172.197.12:8080'
         }
    }
}
