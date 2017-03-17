import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

import string

# do not remove
from django.conf import settings
settings.DATABASES

from apps.account.models import User, WechatAccount

PHONE_CHARS = string.digits
PHONE_PREFIX_LENGTH = 4


def rename_account(phone, new_phone):
    u = User.objects.get_or_none(phone=phone)
    if not u:
        print('user is none')
        return

    u.phone = new_phone
    u.save()

    WechatAccount.objects \
        .filter(starfish_id=u.id) \
        .update(starfish_id=0)

    print('rename %s to %s done.' % (phone, new_phone))


if __name__ == '__main__':
    rename_account(sys.argv[1], sys.argv[2])
