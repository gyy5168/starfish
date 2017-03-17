# Django settings for starfish project.

DEBUG = True
TEMPLATE_DEBUG = DEBUG

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': 'starfish_main',
    },
}

MAX_ORGS_NUM = 4
for i in range(1, MAX_ORGS_NUM):
    DATABASES['starfish-org-%s' % i] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': 'starfish_org_%s' % i,
    }

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'common.middleware.SessionMiddleware',
    'common.middleware.CurrentUserMiddleware',
    'common.middleware.ParametersConverterMiddleware',
    'common.middleware.BasicACLMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    # user defined middleware
    'common.middleware.DisableCSRFMiddleware',
    'common.middleware.UserACLMiddleware',
    'common.middleware.ProjectACLMiddleware',
    'common.middleware.FormatResponseMiddleware',
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
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
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': "starfish-ws-unittest.log",
            'maxBytes': 500000,
            'backupCount': 2,
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

SENDFILE_ROOT = '/tmp/'

TMP_MAIL_DIR = '/opt/mos/exim-mail'

import getpass

FS_ROOT = '/tmp/%s' % getpass.getuser()

API_ENDPOINT = 'http://dev.starfish.im:12345'

MAIL_CONFIG = {
    "attachment_limit": 5*1024*1024,  # 5M
    "body_size_limit": 5*1024*1024,  # 5M
}

MAXWELL_MASTER_ENDPOINT = (
    'tcp://in-005-bj:2012',
)

EXTERNAL_CONTACT_AVATAR_URL_PREFIX = 'https://api.starfish.im/v1/external_contact-avatars'
USER_AVATAR_URL_PREFIX = 'https://devapi.starfish.im:12345/v1/user-avatars'
ORG_AVATAR_URL_PREFIX = 'https://devapi.starfish.im:12345/v1/org-avatars'
DISCUSSION_GROUP_AVATAR_URL_PREFIX = 'https://devapi.starfish.im:12345/v1/discussion-group-avatars'
DEPARTMENT_AVATAR_URL_PREFIX = 'https://devapi.starfish.im:12345/v1/department-avatars'
MULTIMEDIA_CHAT_ATTACHMENT_URL_PREFIX = 'https://api.starfish.im/v1'

SMS_SWITCH = False
MESSAGE_TO_MAXWELL_SWITCH = False

KAFKA_URL = 'in-006-bj:9092'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'KEY_FUNCTION': 'common.utils.make_key',
        'KEY_PREFIX': 'unittest',
        'TIMEOUT': 60,
        'LOCATION': [
            '127.0.0.1:11211',
        ]
    }
}

ELASTICSEARCH = {
    "hosts": ['']
}

LANDBRIDGE_SPEC = {
    'cluster_size': 1,
    'shard': {
        0: {
            'queue_partition': 0,
            'rest_url': 'http://in-006-bj:8080'
         }
    }
}
