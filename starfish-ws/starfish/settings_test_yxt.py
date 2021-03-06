# Django settings for starfish project.

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# 4.5s
MAX_QUERY_EXECUTION_TIME = 4500

from common.utils import db_name, shard_id

_db_conf = {
    'dbname': 'postgres',
    'host': 'in-902-bj',
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
    },
    'default_readonly': {
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

READ_ONLY_MAIN_DB = 'default_readonly'
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
    'yxt.middleware.YxtBlockMiddleware'
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

YXT_LOGIN_URL = 'http://devinner.yunxuetang.com.cn/qidaapi/v1/global/users/tokens'
YXT_VALIDATE_TOKEN_URL = 'http://devinner.yunxuetang.com.cn/qidaapi/v1/userinfo'
YXT_UPDATE_USER_URL = 'http://devinner.yunxuetang.com.cn/qidaapi/v1/users/%s'
YXT_SESSION_COOKIE_DOMAIN = 'yunxuetang.cn'

YXT_HOMEPAGE = 'http://lecai.yunxuetang.cn/myhome'

SESSION_ENGINE = 'common.session'
SESSION_COOKIE_AGE = 30 * 86400
SESSION_COOKIE_DOMAIN = 'yunxuetang.cn'

SENDFILE_ROOT = '/mnt1/starfish-ws/'

FS_ROOT = '/mnt1/starfish-ws'

API_ENDPOINT = 'http://dev-qdim.yunxuetang.cn'

MAXWELL_MASTER_ENDPOINT = (
    'tcp://in-901-bj:2012',
)

KAFKA_URL = 'in-902-bj:9092'

ZK_HOSTS = 'in-901-bj:2181'

EXTERNAL_CONTACT_AVATAR_URL_PREFIX = '%s/v1/external_contact-avatars' % API_ENDPOINT
USER_AVATAR_URL_PREFIX = '%s/v1/user-avatars' % API_ENDPOINT
ORG_AVATAR_URL_PREFIX = '%s/v1/org-avatars' % API_ENDPOINT
DISCUSSION_GROUP_AVATAR_URL_PREFIX = '%s/v1/discussion-group-avatars' % API_ENDPOINT
DEPARTMENT_AVATAR_URL_PREFIX = '%s/v1/department-avatars' % API_ENDPOINT
MULTIMEDIA_CHAT_ATTACHMENT_URL_PREFIX = '%s/v1' % API_ENDPOINT

ALLOWED_HOSTS = ['*']

SMS_SWITCH = True

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'KEY_PREFIX': '',
        'LOCATION': [
            'in-901-bj:11211',
        ]
    }
}

ELASTICSEARCH = {
    "hosts": ['in-901-bj:9200']
}

RABBITMQ_YXT = {"host": 'mq.3rd.yunxuetang.cn', "port": 5672,
                "username": "starfish", "password": "mLjhKmZ4"}

RABBITMQ_PUBLISH = "starfish|uc_user|update"

LANDBRIDGE_SPEC = {
    'cluster_size': 1,
    'shard': {
        0: {
            'queue_partition': 0,
            'rest_url': 'http://in-901-bj:8080'
        }
    }

}

STARFISH_APNS_QUEUE = 'maxwell_apns2'
STARFISH_MESSAGE_QUEUE_NAME = 'new_starfish_message2'
