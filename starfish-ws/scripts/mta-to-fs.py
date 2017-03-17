#!/usr/bin/env python

import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'
os.environ['PYTHON_EGG_CACHE'] = '/tmp'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES

import uuid

from log import config_logging
config_logging(filename='/mnt1/logs/starfish-mta-to-fs.log')

import logging
log = logging.getLogger(__name__)


def main():
    log.info('got new mail...')

    filename = '%s/%s' % (settings.TMP_MAIL_DIR, uuid.uuid4())
    with open(filename, 'w') as f:
        for line in sys.stdin:
            f.write(line)
    os.chmod(filename, 0o777)

    log.info('save mail to %s done.', filename)
    sys.exit(0)

if __name__ == '__main__':
    main()
