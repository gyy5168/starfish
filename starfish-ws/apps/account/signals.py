from datetime import datetime, timedelta
from django.db.models.signals import post_save, pre_delete, pre_save
from django.dispatch.dispatcher import receiver

from apps.account.models import User, UserRememberToken, TokenSerial, UserAvatar
from apps.message.models import Message
from apps.org.models import ExternalInvitation, UserOrg, Invitation

from common.const import DestType, ErrorCode
from common.exceptions import APIError
from common.message_queue import SystemMessage
from common.utils import calc_pinyin


@receiver(pre_save, sender=User)
def prevent_regist_same_phone_user(sender, instance, **kwargs):
    if hasattr(instance, 'id'):
        return
    if User.objects.filter(phone=instance.phone).exists():
        raise APIError(error_code=ErrorCode.DUPLICATE_PHONE_NUMBER)


@receiver(pre_save, sender=User)
def re_generate_user_avatar_and_order_field(sender, instance, **kwargs):
    if not instance.avatar:
        instance.avatar = instance.default_avatar()

    instance.order_field = calc_pinyin(instance.name)

    if instance.get_field_diff('name') and UserAvatar.is_generated(instance.avatar):
        instance.avatar = instance.default_avatar()


@receiver(post_save, sender=User)
def send_message_on_user_updated(sender, instance, **kwargs):
    if kwargs['created']:
        return

    if not instance.is_summary_updated:
        return

    body = {
        'user': instance.to_dict(),
    }

    SystemMessage(Message.TYPE_USER_UPDATED, body)\
        .send(dest_id=instance.id, dest_type=DestType.USER_ORG)


@receiver(post_save, sender=User)
def add_invitation_if_needed(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    limit = datetime.now() - timedelta(days=ExternalInvitation.VALID_DAYS)
    e_invitations = ExternalInvitation.objects\
        .filter(account=instance.phone,
                create_time__gt=limit,
                invitation_type=ExternalInvitation.INVITATION_TYPE_NORMAL)

    for ei in e_invitations:
        if UserOrg.objects.get_or_none(user_id=instance.id, org_id=ei.org_id, is_left=0):
            continue

        Invitation(who=ei.admin, whom=instance.id, org_id=ei.org_id).save()


@receiver(pre_delete, sender=User)
def leave_all_orgs_on_user_deleted(sender, instance, **kwargs):
    for uo in UserOrg.objects.filter(user_id=instance.id, is_left=0):
        uo.is_left = 1
        uo.save()


@receiver(pre_delete, sender=UserRememberToken)
def clean_realated_before_rem_token_deleted(sender, instance, **kwargs):
    TokenSerial.objects.filter(id=instance.serial).delete()
    # UserAgent.objects.filter(agent_key=instance.agent_key).delete()
