from collections import deque
import hashlib
import random
from bitfield import BitField
from django.db.models import get_model
import magic

from datetime import datetime

from django.conf import settings
from django.db import models
from django.core.files.storage import FileSystemStorage
from common import models as _models
from common.const import FilePermission, PresetFileRole
from common.utils import current_timestamp, setattr_if_changed, TargetObject


class File(_models.BaseOrgModel, _models.FileModelsMixin):
    FAKE_DELETE_FIELDS = ('name',)

    EMAIL_ATTACHMENT_DIRNAME = '邮件附件'
    TASK_ATTACHMENT_DIRNAME = '任务附件'

    creator = _models.PositiveBigIntegerField(db_index=True)
    name = models.CharField(max_length=128, db_index=True)
    parent = _models.PositiveBigIntegerField(default=0)
    is_file = models.PositiveSmallIntegerField(db_index=True)
    size = models.PositiveIntegerField(default=0)
    filepath = models.CharField(max_length=128, default='')
    date_updated = models.PositiveIntegerField()
    is_system = models.PositiveSmallIntegerField(default=0)

    fs = FileSystemStorage(location=settings.FS_ROOT)

    def save(self, *args, **kwargs):
        if not self.name:
            raise ValueError('name is empty')

        self.date_updated = current_timestamp()
        super(File, self).save(*args, **kwargs)

    def has_owner(self, user):
        return True

    def suggested_name(self):
        now = datetime.strftime(datetime.now(), '%Y-%m-%d.%H.%M.%S')
        suffix = '%s-%s' % (now, random.randint(10000, 99999))

        if '.' in self.name:
            a, b = self.name.rsplit('.', 1)
            new_name = '%s_%s.%s' % (a, suffix, b)
        else:
            new_name = '%s_%s' % (self.name, suffix)

        return '%s%s' % (self.path(), new_name)

    def to_dict(self):
        r = super(File, self).to_dict(exclude=['is_system'])

        if self.is_file:
            mimetype = str(
                magic.from_file(File.full_path(self.filepath), mime=True), 'utf8')
            r['mimetype'] = mimetype

        r.update({
            'fullpath': self.fullpath(),
            'dir_is_empty': self.dir_is_empty(),
            'contain_dirs': self.contain_dirs(),
        })
        return r

    def dir_is_empty(self):
        r = self.is_file or \
            not File.objects \
            .using(self._state.db) \
            .filter(parent=self.id)
        return 1 if r else 0

    def contain_dirs(self):
        if self.is_file:
            return 0
        if self.children.filter(is_file=0).exists():
            return 1
        else:
            return 0

    def fullpath(self):
        return '%s%s' % (self.path(), self.name)

    def path(self):
        r, parent = [], self.parent
        while parent:
            f = File.objects \
                .using(self.org_id) \
                .getx(id=parent)
            r.insert(0, f.name)
            parent = f.parent

        if not r:
            return '/'

        return '/%s/' % '/'.join(r)

    def parents(self):
        _all = []
        parent_id = self.parent
        while parent_id:
            f = File.objects.using(self.org_id).getx(id=parent_id)
            if not f:
                break
            _all.append(f)
            parent_id = f.parent
        return _all

    @property
    def children(self):
        if not self.is_file:
            return File.objects.using(self.org_id).filter(parent=self.id)
        else:
            return File.objects.using(self.org_id).none()

    @classmethod
    def find(cls, org_id, parent, name):
        return File.objects.using(org_id).getx(parent=parent, name=name)

    @classmethod
    def get_by_share_id(cls, share_id):
        org_id, pk = share_id.split('-')[:2]
        f = cls.objects.using(org_id).getx(id=pk)
        if f and f.share_id == share_id:
            return f

    @property
    def share_id(self):
        hash = hashlib.md5(self.path().encode('utf8')).digest()
        return '%s-%s-%s' % (self.org_id, self.id, hash)

    def remove(self, recurse=True):
        self.delete()

        if self.is_file or not recurse:
            return

        qs = File.objects.using(self.org_id)

        dir_ids_list, dir_ids_queue = [], deque([self.id])
        while dir_ids_queue:
            fid = dir_ids_queue.popleft()
            dir_ids_queue.extend(
                qs.filter(parent=fid, is_file=0).values_list('id', flat=True)
            )
            dir_ids_list.append(fid)

        # It is not necessary to rename children files/folders,
        # so do not call delete() which will cause rename files automatically.
        qs.filter(parent__in=dir_ids_list).update(is_deleted=1)

    def user_perm(self, user_id):
        ups = self.permitted.filter(user_id=user_id)
        return ups[0].perm_val if ups.exists() else 0

    def is_permitted(self, user_id, perm):
        return bool(self.user_perm(user_id) & perm)

    @classmethod
    def permitted_files(cls, org_id, user_id, **kwargs):
        '''default return all files with permission read
         supports: as_role, perm, perm_name to filter files of given role or perm
         '''
        files = cls.objects.using(org_id).filter(permitted__user_id=user_id)

        role = kwargs.get('as_role')
        if role is not None:
            files = files.filter(
                permitted__perm=PresetFileRole.perm_by_role(role)
            ).distinct()

        perm, perm_name = kwargs.get('perm'), kwargs.get('perm_name')
        if perm or perm_name:
            files = files.filter(
                permitted__perm=FileRole.perm_bit(perm_name=perm_name, perm=perm)
            ).distinct()

        parent = kwargs.get('parent')
        if parent is not None:
            files = files.filter(parent=parent)

        return files

    class Meta:
        db_table = 'fs_file'
        unique_together = ('parent', 'name')


class PermissionMixin(object):
    PERMISSION_FLAGS = FilePermission.definition()

    @classmethod
    def perm_bit(cls, perm_name=None, perm=None):
        perm_name = perm_name or FilePermission.perm_name(perm)
        if not perm_name:
            raise RuntimeError('unknown permission: perm name: %s, perm: %s' % (perm_name, perm))
        return getattr(cls.perm, perm_name.upper())

    @property
    def perm_val(self):
        return int(self.perm)


class FileRole(_models.SimpleBaseOrgModel, PermissionMixin):
    TYPE_ORG_MEMBER = 0
    TYPE_DEPARTMENT = 1
    TYPE_DISCUSSION_GROUP = 2

    name = models.CharField(max_length=128, db_index=True)
    owner = _models.PositiveBigIntegerField()
    owner_type = models.PositiveSmallIntegerField()
    file = models.ForeignKey(File, db_constraint=False, related_name='roles')
    perm = BitField(flags=PermissionMixin.PERMISSION_FLAGS, default=FilePermission.VIEW)

    @classmethod
    def set_by_preset(cls, file, owner, owner_type, name, role=PresetFileRole.NONE):
        return cls.set_by_perm(file, owner, owner_type, name,
                               PresetFileRole.perm_by_role(role))

    @classmethod
    def set_by_perm(cls, file, owner, owner_type, name, perm=0):
        if perm:
            fr, created = cls.objects.using(file.org_id)\
                .get_or_create(file=file, owner=owner, owner_type=owner_type,
                               defaults={"perm": perm, "name": name})
            if not created and setattr_if_changed(fr, perm=perm, name=name):
                fr.save()
        else:
            cls.objects.using(file.org_id)\
                .filter(file=file, owner=owner, owner_type=owner_type).delete()

        # change parent dir's permisions will no affect children's. designed by juzi
        # if not file.is_file:
        #     for c in file.children:
        #         cls.set_by_perm(c, owner, owner_type, perm)

    @property
    def owner_model(self):
        if self.owner_type == self.TYPE_ORG_MEMBER:
            return get_model('account', 'User')
        elif self.owner_type == self.TYPE_DISCUSSION_GROUP:
            return get_model('org', 'DiscussionGroup')
        elif self.owner_type == self.TYPE_DEPARTMENT:
            return get_model('org', 'Department')

    def to_dict(self):
        r = super(FileRole, self).to_dict(exclude=['perm'])
        r['role'] = PresetFileRole.role_by_perm(self.perm_val)
        r['owner_info'] = TargetObject().obj_info(self.owner_model, self.owner, self._state.db)
        return r

    def get_owner(self):
        if self.owner_type == self.TYPE_ORG_MEMBER:
            from apps.account.models import User
            return User.objects.getx(id=self.owner)
        elif self.owner_type == self.TYPE_DISCUSSION_GROUP:
            from apps.org.models import DiscussionGroup
            return DiscussionGroup.objects.using(self.org_id).getx(id=self.owner)
        elif self.owner_type == self.TYPE_DEPARTMENT:
            from apps.org.models import Department
            return Department.objects.using(self.org_id).getx(id=self.owner)

    def get_user_ids(self):
        user_id_list = []
        org_id, owner, owner_type = self.org_id, self.owner, self.owner_type
        if owner_type == FileRole.TYPE_ORG_MEMBER:
            user_id_list.append(owner)
        elif owner_type == FileRole.TYPE_DEPARTMENT:
            from apps.org.models import Department
            user_id_list += Department.user_ids(org_id, owner)
        elif owner_type == FileRole.TYPE_DISCUSSION_GROUP:
            from apps.org.models import UserDiscussionGroup
            user_id_list += UserDiscussionGroup.user_ids(org_id, owner)
        return user_id_list

    class Meta:
        db_table = 'fs_file_role'
        unique_together = ('file', 'owner', 'owner_type')


class FileUserPermission(_models.SimpleBaseOrgModel, PermissionMixin):
    roles = models.ManyToManyField(FileRole, db_constraint=False)
    file = models.ForeignKey(File, db_constraint=False, related_name='permitted')
    user_id = _models.PositiveBigIntegerField()
    perm = BitField(flags=PermissionMixin.PERMISSION_FLAGS, default=FilePermission.VIEW)

    def set_perm_by_roles(self):
        perm = 0
        for r in self.roles.values_list('perm', flat=True):
            perm |= r

        if perm is 0:
            self.delete()
        elif setattr_if_changed(self, perm=perm):
            self.save()

    class Meta:
        db_table = 'fs_file_user_permission'
        unique_together = ('file', 'user_id')


class FileExistsError(RuntimeError):
    pass


class BadTargetError(RuntimeError):
    pass
