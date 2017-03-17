import logging

from apps.account.models import User
from apps.message.models import Message, MessageContent, UserMessage
from apps.org.models import (Department, DiscussionGroup,
                             DiscussionGroupAvatar,
                             ExternalContact, GroupAvatarCache, Invitation,
                             MemberOrgApp, Org, OrgApp, OrgDomain,
                             UserDepartment, UserDiscussionGroup, UserOrg,
                             UserPosition, WorkMail)
from common.const import DestType, ErrorCode, SrcType, PeerType
from common.exceptions import APIError
from common.globals import get_current_user, get_current_user_id
from common.message_queue import SystemMessage
from common.utils import (calc_pinyin, current_timestamp, setattr_if_changed,
                          shard_id, to_org_id, unlink_many)
from django.conf import settings
from django.db.models.signals import (post_delete, post_save, pre_delete,
                                      pre_save)
from django.dispatch.dispatcher import receiver

log = logging.getLogger(__name__)


@receiver(post_save, sender=Org)
def add_org_creator_in_org(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    UserOrg(
        user_id=instance.creator,
        org_id=instance.id).save()


@receiver(post_save, sender=Org)
def add_org_creator_as_admin(sender, instance, **kwargs):
    if not kwargs['created']:
        return
    from apps.acl.models import UserRole, Role
    Role.objects.using(instance.id)\
        .get_or_create(id=Role.RESERVED_ROLE_END + 1, name=Role.ADMIN_ROLE_NAME, is_system=1)
    UserRole.add(instance.creator, instance.id)


@receiver(post_save, sender=UserOrg)
def save_message_on_org_member_updated(sender, instance, **kwargs):
    _type = Message.TYPE_ORG_MEMBER_JOINED if instance.is_left == 0 \
        else Message.TYPE_ORG_MEMBER_LEFT

    content = {
        'user': User.objects.getx(id=instance.user_id).to_dict(),
        'org': Org.objects.getx(id=instance.org_id).to_dict(),
    }
    SystemMessage(_type, content).send(dest_id=instance.org_id,
                                       dest_type=DestType.ORG)

    SystemMessage(_type, content).send(dest_id=instance.user_id,
                                       dest_type=DestType.ORG_MEMBER)

    log.info(
        'save_message_on_org_member_updated, user=%s, org=%s, is_left=%s',
        instance.user_id, instance.org_id, instance.is_left
    )


@receiver(post_save, sender=UserOrg)
def adjust_user_for_default_department(sender, instance, **kwargs):
    if settings.IS_YXT_ENV:
        return

    o = Org.objects.get_or_none(id=instance.org_id)
    if o is None:
        return
    try:
        d = o.default_department
        if not instance.is_left:  # join org
            d.add_direct_in_v2(instance.user_id)
    except Exception as e:
        log.exception(e)


@receiver(post_save, sender=UserOrg)
def delete_user_from_discussion_group(sender, instance, **kwargs):
    if instance.is_left:
        r = UserDiscussionGroup.objects \
            .using(shard_id(instance.org_id)) \
            .filter(user_id=instance.user_id) \
            .filter(is_left=0)
        for i in r:
            i.is_left = 1
            i.save()


@receiver(post_save, sender=UserOrg)
def delete_user_from_department(sender, instance, **kwargs):
    if instance.is_left:
        r = UserDepartment.objects \
            .using(instance.org_id) \
            .filter(user_id=instance.user_id)
        for i in r:
            i.delete()


@receiver(post_save, sender=Invitation)
def save_message_on_invitation_saved(sender, instance, **kwargs):
    if hasattr(instance, '_do_not_notify'):
        return

    if kwargs['created']:
        message = Message(
            src_type=SrcType.ORG_MEMBER,
            src_id=instance.who,
            dest_type=DestType.ORG_MEMBER,
            dest_id=instance.whom,
            type=Message.TYPE_INVITATION_CREATED,
            content_type=Message.CONTENT_TYPE_RESOURCE,
            content=instance.id,
            resource_id=instance.id,
        )
    else:
        content = MessageContent(
            content={'invitation': instance.to_dict()}
        )
        content.save(using=instance._state.db)

        message = Message(
            src_type=SrcType.ORG_MEMBER,
            src_id=instance.whom,
            dest_type=DestType.ORG_MEMBER,
            dest_id=instance.who,
            type=Message.TYPE_INVITATION_UPDATED,
            content=content.id,
            resource_id=instance.id,
        )
        message._snapshot = content.content

    message.save(using=instance._state.db)

    UserMessage(
        user_id=message.dest_id, peer_id=message.src_id, peer_type=PeerType.ORG_MEMBER,
        message_id=message.id, status=Message.STATUS_NULL,
    ).save()


@receiver(post_save, sender=Invitation)
def add_user_in_org_after_invited(sender, instance, **kwargs):
    if kwargs['created']:
        return

    if instance.status != Invitation.STATUS_CONFIRM:
        return

    org = Org.objects.get_or_none(id=instance.org_id)
    if not org:
        raise RuntimeError('no such org')

    o, created = UserOrg.objects \
        .get_or_create(
            user_id=instance.whom,
            org_id=instance.org_id,
            defaults={'is_left': 0})

    if not created and o.is_left:
        o.is_left = 0
        o.save()


@receiver(post_save, sender=Org)
def save_message_on_org_created(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    content = {'org': instance.to_dict()}
    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.ORG_MEMBER,
        dest_id=instance.creator,
        type=Message.TYPE_ORG_CREATED,
        resource_id=instance.id,
    )

    message.sendout(content)


@receiver(post_save, sender=Org)
def save_message_on_org_updated(sender, instance, **kwargs):
    if kwargs['created']:
        return

    content = {'org': instance.to_dict()}

    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.ORG,
        dest_id=instance.id,
        type=Message.TYPE_ORG_UPDATED,
        resource_id=instance.id,
    )

    message.sendout(content)


@receiver(post_save, sender=DiscussionGroup)
def save_message_on_discussion_group_created(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    data = {'group': instance.to_dict()}
    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.ORG_MEMBER,
        dest_id=instance.creator,
        type=Message.TYPE_DISCUSSION_GROUP_CREATED,
        resource_id=instance.id,
    )
    message.sendout(data, kwargs['using'])


@receiver(post_save, sender=DiscussionGroup)
def add_members_on_discussion_group_created(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    members = set()
    if hasattr(instance, '_members'):
        members = set(instance._members)

    members.add(instance.creator)

    for i, user_id in enumerate(members):
        v = UserDiscussionGroup(
            user_id=user_id,
            group_id=instance.id,
            date_joined=current_timestamp()
        )
        v._do_not_send_message = True
        v.save(using=instance._state.db)

    operator = get_current_user()
    data = {
        'users': list(members),
        'group': instance.to_dict(),
        'operator': operator.to_dict() if operator else {}
    }
    SystemMessage(Message.TYPE_DISCUSSION_GROUP_MEMBER_JOINED, data, instance.org_id) \
        .send(dest_id=instance.id, dest_type=DestType.DISCUSSION_GROUP)


@receiver(post_save, sender=DiscussionGroup)
def save_message_on_discussion_group_updated_or_deleted(sender, instance, **kwargs):
    if kwargs['created']:
        return

    content = {'group': instance.to_dict()}
    _type, _write_db = (Message.TYPE_DISCUSSION_GROUP_DISBANDED, True) if instance.is_disbanded \
        else (Message.TYPE_DISCUSSION_GROUP_UPDATED, False)

    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.DISCUSSION_GROUP,
        dest_id=instance.id,
        type=_type,
        resource_id=instance.id,
    )

    message.sendout(content, kwargs['using'], write_db=_write_db)


@receiver(post_save, sender=UserDiscussionGroup)
def send_message_on_discussion_group_member_join(sender, instance, **kwargs):
    if instance.is_left:
        return

    if hasattr(instance, '_do_not_send_message'):
        return

    group = DiscussionGroup.objects.using(kwargs['using']).getx(id=instance.group_id)
    if not group or group.is_disbanded:
        return

    operator = get_current_user()
    data = {
        'users': [instance.user_id],
        'group': group.to_dict(),
        'operator': operator.to_dict() if operator else {}
    }
    SystemMessage(Message.TYPE_DISCUSSION_GROUP_MEMBER_JOINED, data, instance.org_id)\
        .send(dest_id=instance.group_id, dest_type=DestType.DISCUSSION_GROUP)


@receiver(post_save, sender=UserDiscussionGroup)
def save_message_on_discussion_group_member_left(sender, instance, **kwargs):
    if not instance.is_left:
        return
    group = DiscussionGroup.objects.using(kwargs['using']).getx(id=instance.group_id)
    if not group or group.is_disbanded:
        return

    operator = get_current_user()
    data = {
        'users': [instance.user_id],
        'group': group.to_dict(),
        'operator': operator.to_dict() if operator else {},
    }

    message = Message(
        src_type=SrcType.SYSTEM,
        src_id=0,
        dest_type=DestType.DISCUSSION_GROUP,
        dest_id=instance.group_id,
        type=Message.TYPE_DISCUSSION_GROUP_MEMBER_LEFT,
    )
    message.sendout(data, kwargs['using'], write_db=True)


@receiver(pre_save, sender=Department)
def add_parent_for_department(sender, instance, **kwargs):
    if instance.type == Department.TYPE_NORMAL and instance.parent_id is None:
        # in pre_save instance.org_id could be None
        instance.parent = Org.objects.getx(id=to_org_id(kwargs['using'])).default_department


@receiver((pre_save, pre_delete), sender=Department)
def check_before_delete_department(sender, instance, **kwargs):
    if (kwargs['signal'] == pre_save and instance.is_disbanded) or kwargs['signal'] == pre_delete:
        if Department.user_ids(to_org_id(kwargs['using']), instance.id, direct_in=1) \
                or instance.children.exists() or instance.type != Department.TYPE_NORMAL:
            raise APIError(ErrorCode.CAN_NOT_DELETE_DEPARTMENT, group_id=instance.id)


@receiver(post_save, sender=Department)
def adjust_department_avatar_on_name_chaged(sender, instance, **kwargs):
    if kwargs['created']:
        return

    if instance.get_field_diff('name'):
        GroupAvatarCache(instance.org_id).delete()


@receiver(post_save, sender=Department)
def save_message_on_department_created(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    content = {'department': instance.to_dict()}
    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.ORG,
        dest_id=to_org_id(instance._state.db),
        type=Message.TYPE_DEPARTMENT_CREATED,
        resource_id=instance.id,
    )
    message.sendout(content, kwargs['using'])


@receiver(post_save, sender=Department)
def save_message_on_department_updated_or_deleted(sender, instance, **kwargs):
    if kwargs['created']:
        return

    content = {'department': instance.to_dict()}
    _type, _write_db = (Message.TYPE_DEPARTMENT_DISBANDED, True) if instance.is_disbanded \
        else (Message.TYPE_DEPARTMENT_UPDATED, False)

    message = Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.creator,
        dest_type=DestType.ORG,
        dest_id=instance.org_id,
        type=_type,
        resource_id=instance.id,
    )
    message.sendout(content, kwargs['using'], write_db=_write_db)


@receiver(post_save, sender=UserDepartment)
def save_message_on_department_member_joined(sender, instance, **kwargs):
    # TODO 废弃
    if hasattr(instance, '_quiet'):
        return

    if not instance.direct_in:  # only send message on join direct in department
        return

    department = Department.objects.using(kwargs['using']).getx(id=instance.group_id)
    if not department or department.is_disbanded:
        return

    operator = get_current_user()
    content = {
        'users': [instance.user_id],
        'department': department.to_dict(),
        'operator': operator.to_dict() if operator else {},
        'parents': [v.id for v in department.all_parents()],
    }

    message = Message(
        src_type=SrcType.SYSTEM,
        src_id=0,
        dest_type=DestType.ORG,
        dest_id=instance.org_id,
        type=Message.TYPE_DEPARTMENT_MEMBER_JOINED,
    )

    message.sendout(content, kwargs['using'])


@receiver(post_delete, sender=UserDepartment)
def save_message_on_department_member_left(sender, instance, **kwargs):
    # TODO 废弃
    if hasattr(instance, '_quiet'):
        return

    if not instance.direct_in:  # only send message on left direct in department
        return

    department = Department.objects.using(kwargs['using']).getx(id=instance.group_id)
    if not department or department.is_disbanded:
        return

    operator = get_current_user()

    content = {
        'users': [instance.user_id],
        'department': department.to_dict(),
        'operator': operator.to_dict() if operator else {},
        'parents': [v.id for v in department.all_parents()],
    }

    message = Message(
        src_type=SrcType.SYSTEM,
        src_id=0,
        dest_type=DestType.ORG,
        dest_id=instance.org_id,
        type=Message.TYPE_DEPARTMENT_MEMBER_LEFT,
    )
    message.sendout(content, kwargs['using'], write_db=True)


@receiver(post_save, sender=UserDiscussionGroup)
def clear_group_avatar_cache_on_discussion_group_member_updated(sender, instance, **kwargs):
    GroupAvatarCache(to_org_id(instance._state.db)).delete()


@receiver(post_save, sender=User)
def clear_group_avatar_cache_on_user_avatar_updated(sender, instance, **kwargs):
    if not instance.get_field_diff('avatar'):
        return

    for i in UserOrg.objects \
            .filter(user_id=instance.id) \
            .filter(is_left=0) \
            .values_list('org_id', flat=True):
        GroupAvatarCache(i).delete()


@receiver(post_save, sender=UserDiscussionGroup)
def update_user_discussion_group_last_modified_cache(sender, instance, **kwargs):
    UserDiscussionGroup.update_last_modified(
        to_org_id(instance._state.db), 'user', instance.user_id
    )
    UserDiscussionGroup.update_last_modified(
        to_org_id(instance._state.db), 'group', instance.group_id
    )


@receiver(post_save, sender=DiscussionGroup)
def update_user_discussion_group_last_modified_cache_on_group_deleted(sender, instance, **kwargs):
    for user_id in UserDiscussionGroup.user_ids(instance.org_id, instance.id):
        UserDiscussionGroup.update_last_modified(instance.org_id, 'user', user_id)

    UserDiscussionGroup.update_last_modified(instance.org_id, 'group', instance.id)


@receiver(post_save, sender=UserDiscussionGroup)
def remove_discussion_group_avatar(sender, instance, **kwargs):
    pattern = DiscussionGroupAvatar.full_path(
        'discussion-group-avatars/%s/%s_*.png' %
        (to_org_id(instance._state.db), instance.group_id))
    unlink_many(pattern)


@receiver(pre_save, sender=WorkMail)
def adjust_domain_id_before_save_work_mail(sender, instance, **kwargs):
    if not instance.domain_id:
        o = Org.objects.getx(id=to_org_id(kwargs['using']))
        instance.domain_id = o.default_domain.id


@receiver(post_save, sender=OrgDomain)
def set_default_domain_after_changed(sender, instance, **kwargs):
    if instance.is_default:
        OrgDomain.objects\
            .filter(is_default=1, org_id=instance.org_id)\
            .exclude(id=instance.id)\
            .update(is_default=0)


@receiver(pre_delete, sender=OrgDomain)
def update_work_mail_before_org_domain_delete(sender, instance, **kwargs):
    if instance.is_default:
        raise ValueError('can not delete default domain(%s) of org(%s)'
                         % (instance.id, instance.org_id))
    org = instance.org
    WorkMail.objects\
        .using(org.id)\
        .filter(domain_id=instance.id)\
        .update(domain_id=org.default_domain.id)


@receiver(pre_save, sender=ExternalContact)
def check_phone_number_before_save(sender, instance, **kwargs):
    from common.utils import format_phone_number
    if instance.phone and not format_phone_number(instance.phone):
        raise APIError(ErrorCode.INVALID_PHONE_NUMBER, phone=instance.phone)


@receiver(post_save, sender=WorkMail)
def send_workmail_update_message(sender, instance, **kwargs):
    if instance.is_fake('local_part'):
        return

    local_part_diff = instance.get_field_diff('local_part')
    domain_id_diff = instance.get_field_diff('domain_id')
    if local_part_diff is None and domain_id_diff is None:
        return

    if instance.owner_type == WorkMail.TYPE_ORG_MEMBER:
        content = {
            'member': User.build_summary_list([instance.owner], instance.org_id)[0],
            'org_id': instance.org_id
        }
        Message(
            src_type=SrcType.ORG_MEMBER,
            src_id=get_current_user_id(),
            dest_type=DestType.ORG,
            dest_id=instance.org_id,
            type=Message.TYPE_ORG_MEMBER_UPDATED,
            resource_id=instance.owner,
        ).sendout(content, kwargs['using'])

    elif instance.owner_type == WorkMail.TYPE_DISCUSSION_GROUP:
        group = DiscussionGroup.objects.using(instance.org_id).getx(id=instance.owner)
        save_message_on_discussion_group_updated_or_deleted(DiscussionGroup, group,
                                                            created=False, using=kwargs['using'])
    elif instance.owner_type == WorkMail.TYPE_DEPARTMENT:
        group = Department.objects.using(instance.org_id).getx(id=instance.owner)
        save_message_on_department_updated_or_deleted(Department, group,
                                                      created=False, using=kwargs['using'])


@receiver(post_save, sender=UserPosition)
def send_member_updated_message_on_user_position(sender, instance, **kwargs):
    content = {
        'member': User.build_summary_list([instance.user_id], instance.org_id)[0],
        'org_id': instance.org_id
    }
    Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=get_current_user_id(),
        dest_type=DestType.ORG,
        dest_id=instance.org_id,
        type=Message.TYPE_ORG_MEMBER_UPDATED,
        resource_id=instance.id,
    ).sendout(content, kwargs['using'])


@receiver(post_save, sender=OrgApp)
def delete_all_navigation_on_org_app_uninstalled(sender, instance, **kwargs):
    if instance.is_install == 0:
        for m in MemberOrgApp.objects.using(instance.org_id).filter(app=instance.app, is_navi=1):
            m.is_navi = 0
            m.save()


@receiver(post_save, sender=OrgApp)
def save_message_on_org_app_updated(sender, instance, **kwargs):
    from apps.org.serializers import OrgAppSerializer
    data = OrgAppSerializer(instance).data
    content = dict(org_id=instance.org_id, **data)
    type = Message.TYPE_ORG_APP_INSTALLED if instance.is_install \
        else Message.TYPE_ORG_APP_UNINSTALLED
    Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=get_current_user_id(),
        dest_type=DestType.ORG,
        dest_id=instance.org_id,
        type=type,
    ).sendout(content, kwargs['using'])


@receiver(post_save, sender=MemberOrgApp)
def save_message_on_member_navigation_app_updated(sender, instance, **kwargs):
    content = {
        'app': instance.app,
        'user_id': instance.user_id
    }
    type = Message.TYPE_ORG_MEMBER_NAVIGATION_APP_INSTALLED if instance.is_navi \
        else Message.TYPE_ORG_MEMBER_NAVIGATION_APP_UNINSTALLED

    Message(
        src_type=SrcType.ORG_MEMBER,
        src_id=instance.user_id,
        dest_type=DestType.ORG_MEMBER,
        dest_id=instance.user_id,
        type=type,
    ).sendout(content, kwargs['using'])


@receiver(post_save)
def name_bind_for_org_and_default_department(sender, instance, **kwargs):
    skip_attr = '_name_bind_for_org_and_default_department'
    if getattr(instance, skip_attr, None):
        setattr(instance, skip_attr, None)
        return

    if sender == Org and instance.get_field_diff('name'):
        d = instance.default_department
        if setattr_if_changed(d, name=instance.name):
            setattr(d, skip_attr, instance.name)
            d.save()
    elif sender == Department \
            and instance.type == Department.TYPE_DEFAULT_ALL \
            and instance.get_field_diff('name'):
        o = Org.objects.get_or_none(id=instance.org_id)
        if setattr_if_changed(o, name=instance.name):
            setattr(o, skip_attr, instance.name)
            o.save()


@receiver(pre_save)
def reset_order_field(sender, instance, **kwargs):
    if sender in [Department, DiscussionGroup, Org]:
        instance.order_field = calc_pinyin(instance.name)
