from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.account.models import User
from apps.org.models import UserOrg, UserDiscussionGroup, DiscussionGroup, Department
from apps.search import send_index_cmd


@receiver(post_save)
def create_index_on_object_saved(sender, instance, **kwargs):
    # 创建User时不需要建索引，对应Org加入或离开时才更新。
    if sender == UserOrg:  # user加入/离开组织，为该user在组织内创建/删除索引。
        send_index_cmd(User, instance.user_id, instance.org_id, not instance.is_left)

    elif sender == User:  # 更新User name时，更新索引
        if not kwargs['created'] and instance.get_field_diff('name'):
            for uo in instance.orgs():
                send_index_cmd(User, uo.user_id, uo.org_id)

    elif sender == UserDiscussionGroup:  # user加入/离开讨论组，创建（更新）讨论组索引。
        send_index_cmd(DiscussionGroup, instance.group_id, instance.org_id, True)

    elif sender == DiscussionGroup:  # 创建/删除讨论组，创建/删除讨论组索引
        send_index_cmd(DiscussionGroup, instance.id, instance.org_id, not instance.is_disbanded)

    elif sender == Department:  # 创建/删除部门，创建/删除部门索引
        send_index_cmd(Department, instance.id, instance.org_id, not instance.is_disbanded)


@receiver(post_delete)
def remove_index_on_object_deleted(sender, instance, **kwargs):
    # 删除user时，UserOrg和UserDiscussionGroup都会被删除, 因此不处理sender==User.
    if sender == UserOrg:  # user离开组织，为该user在组织内删除索引。
        send_index_cmd(User, instance.user_id, instance.org_id, False)

    elif sender == UserDiscussionGroup:  # user离开讨论组，更新讨论组索引。
        send_index_cmd(DiscussionGroup, instance.group_id, instance.org_id, True)

    elif sender == DiscussionGroup:  # 删除讨论组，删除讨论组索引
        send_index_cmd(DiscussionGroup, instance.id, instance.org_id, False)

    elif sender == Department:  # 删除部门，删除部门索引
        send_index_cmd(Department, instance.id, instance.org_id, False)
