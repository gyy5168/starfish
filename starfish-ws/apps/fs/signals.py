from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.account.models import User
from apps.acl.models import UserRole
from apps.fs.models import FileRole, FileUserPermission, File
from apps.org.models import UserDepartment, UserDiscussionGroup, UserOrg, Org
from common.const import PresetFileRole


def adjust_file_user_permission_add_role(role, user_id):
        fup, created = FileUserPermission\
            .objects.using(role.org_id)\
            .get_or_create(file_id=role.file_id, user_id=user_id,
                           defaults={"perm": role.perm_val})
        fup.roles.add(role)

        if not created:  # handle the scenario multi-roles for a file cover the same user
            fup.set_perm_by_roles()


def adjust_file_user_permission_delete_role(role, user_id):
    fup = FileUserPermission\
        .objects.using(role.org_id)\
        .get_or_none(file_id=role.file_id, user_id=user_id)

    if not fup:
        return

    fup.roles.remove(role)
    fup.set_perm_by_roles()


@receiver(post_save, sender=FileRole)
def adjust_file_user_permission_on_saved(sender, instance, **kwargs):
    user_ids = instance.get_user_ids()
    for user_id in user_ids:
        adjust_file_user_permission_add_role(instance, user_id)


@receiver(post_delete, sender=FileRole)
def adjust_file_user_permission_on_deleted(sender, instance, **kwargs):
    user_ids = instance.get_user_ids()
    for user_id in user_ids:
        adjust_file_user_permission_delete_role(instance, user_id)


@receiver((post_save, post_delete), sender=File)
def delete_file_roles_after_file_deleted(sender, instance, **kwargs):
    if kwargs['signal'] == post_delete or (kwargs['signal'] == post_save and instance.is_deleted):
        FileRole.objects.using(kwargs['using']).filter(file=instance).delete()


@receiver((post_save, post_delete), sender=UserDepartment)
def add_file_user_permission_on_user_department_changed(sender, instance, **kwargs):
    if kwargs['signal'] == post_save and not kwargs['created']:
        return

    roles = FileRole.objects\
        .using(kwargs['using'])\
        .filter(owner=instance.group_id, owner_type=FileRole.TYPE_DEPARTMENT)

    for r in roles:
        if kwargs['signal'] == post_save:
            adjust_file_user_permission_add_role(r, instance.user_id)
        if kwargs['signal'] == post_delete:
            adjust_file_user_permission_delete_role(r, instance.user_id)


@receiver((post_save, post_delete), sender=UserDiscussionGroup)
def add_file_user_permission_on_user_discussgroup_changed(sender, instance, **kwargs):
    roles = FileRole.objects\
        .using(kwargs['using'])\
        .filter(owner=instance.group_id, owner_type=FileRole.TYPE_DISCUSSION_GROUP)

    if kwargs['signal'] == post_save:
        is_add = instance.is_left == 0
    elif kwargs['signal'] == post_delete:
        is_add = False

    for r in roles:
        if is_add:
            adjust_file_user_permission_add_role(r, instance.user_id)
        else:
            adjust_file_user_permission_delete_role(r, instance.user_id)


@receiver(post_save, sender=UserOrg)
def adjust_file_role_on_member_leave_org(sender, instance, **kwargs):
    if instance.is_left:
        org_id = instance.org_id
        controller_perm = PresetFileRole.perm_by_role(PresetFileRole.CONTROLLER)

        roles = FileRole.objects\
            .using(org_id)\
            .filter(owner=instance.user_id, owner_type=FileRole.TYPE_ORG_MEMBER)

        file_ids = roles.filter(perm=controller_perm).values_list("file_id", flat=True)
        if file_ids.exists():
            admins = UserRole.user_list(org_id)
            if admins:
                admin_id = admins[0]
            else:
                admin_id = Org.objects.getx(id=org_id).creator

            admin = User.objects.getx(id=admin_id)
            for f in File.objects.using(org_id).filter(id__in=file_ids):
                FileRole.set_by_preset(f,
                                       admin.id, FileRole.TYPE_ORG_MEMBER,
                                       admin.name, PresetFileRole.CONTROLLER)
        roles.delete()
