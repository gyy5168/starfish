from datetime import datetime
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.account.models import User
from common.globals import get_thread_attr, get_current_request
from yxt.models import UserYxt
from yxt.utils import send_update


def format_time(dt):
    return datetime.strftime(dt, '%Y/%m/%d %H:%M')


@receiver(post_save, sender=User)
def send_rmq_on_user_updated(sender, instance, **kwargs):
    if get_thread_attr('skip_signal_of_import'):  # updated by yxt MQ
        return

    if not hasattr(settings, 'RABBITMQ_PUBLISH'):  # not yxt environment
        return

    request = get_current_request()  # not http request, or cookie is missing
    if not request or 'yxt_token' not in request.COOKIES:
        return

    u = instance
    if not set(u.changed_fields) & set(['name', 'intro', 'gender', 'phone']):
        return

    ux = UserYxt.objects.get_or_none(user_id=u.id)
    if not ux:
        return

    send_update(instance.id, request.COOKIES['yxt_token'])

    # data = {'ID': ux.uuid, 'STATUS': int(not u.is_deleted),
    #         'CREATEDATE': format_time(u.create_time), 'UPDATEDATE': format_time(u.update_time),
    #         'MOBILE': u.phone, 'USERNAME': u.name, 'HEADPICTUREURL': u.avatar_url,
    #         'PERSONALSIGN': u.intro, 'SEX': u.gender}

