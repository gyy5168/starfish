# Django settings for starfish project.

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# 4.5s
MAX_QUERY_EXECUTION_TIME = 4500

import defines
from common.utils import db_name, shard_id

_db_conf = {
    'dbname': 'postgres',
    'host': 'in-007-bj',
    'password': 'mos517nrm',
    'port': 5432,
    'user': 'mos'
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': db_name(),
        'USER': _db_conf['user'],
        'PASSWORD': _db_conf['password'],
        'HOST': _db_conf['host'],
        'PORT': _db_conf['port'],
    }
}

MAX_ORG_ID = 50

for i in range(1, MAX_ORG_ID):
    DATABASES[shard_id(i)] = {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': db_name(i),
        'USER': _db_conf['user'],
        'PASSWORD': _db_conf['password'],
        'HOST': _db_conf['host'],
        'PORT': _db_conf['port'],
    }

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
    'debug_toolbar',
)

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
    'debug_toolbar.middleware.DebugToolbarMiddleware',
)

DEBUG_TOOLBAR_PATCH_SETTINGS = False

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

SENDFILE_ROOT = '/mnt1/starfish-ws/'

FS_ROOT = '/mnt1/starfish-ws'

TMP_MAIL_DIR = '/mnt1/exim-mail'

API_ENDPOINT = 'https://dev.starfish.im'

API_URL = 'https://dev.starfish.im/v1'

MAXWELL_MASTER_ENDPOINT = (
    'tcp://in-006-bj:2012',
)
MAIL_CONFIG = {
    "attachment_limit": 35*1024*1024,  # 35M
    "body_size_limit": 50*1024*1024,  # 50M
}
KAFKA_URL = 'in-006-bj:9092'
BFS_HOSTS = ['123.56.134.133']

ZK_HOSTS = defines.ZK_HOSTS_TEST

AVATAR_DOMAIN = 'dev.starfish.im'

EXTERNAL_CONTACT_AVATAR_URL_PREFIX = 'https://{domain}/v1/external_contact-avatars'.format(domain=AVATAR_DOMAIN)
USER_AVATAR_URL_PREFIX = 'https://{domain}/v1/user-avatars'.format(domain=AVATAR_DOMAIN)
USER_AVATAR_URL_PREFIX_STARFISH = 'https://{domain}/v1/user-avatars'.format(domain=AVATAR_DOMAIN)
ORG_AVATAR_URL_PREFIX = 'https://{domain}/v1/org-avatars'.format(domain=AVATAR_DOMAIN)
ORG_AVATAR_URL_PREFIX_STARFISH = 'https://{domain}/v1/org-avatars'.format(domain=AVATAR_DOMAIN)
DISCUSSION_GROUP_AVATAR_URL_PREFIX = 'https://{domain}/v1/discussion-group-avatars'.format(domain=AVATAR_DOMAIN)
DEPARTMENT_AVATAR_URL_PREFIX = 'https://{domain}/v1/department-avatars'.format(domain=AVATAR_DOMAIN)
MULTIMEDIA_CHAT_ATTACHMENT_URL_PREFIX = 'https://{domain}/v1'.format(domain=AVATAR_DOMAIN)

ALLOWED_HOSTS = ['*']

SMS_SWITCH = True

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'KEY_PREFIX': '',
        'LOCATION': [
            'in-007-bj:11211',
        ]
    }
}

ELASTICSEARCH = {
    "hosts": ['in-005-bj:9200']
}

LANDBRIDGE_SPEC = {
    'cluster_size': 1,
    'shard': {
        0: {
            'queue_partition': 0,
            'rest_url': 'http://127.0.0.1:8080'
         }
    }

}
