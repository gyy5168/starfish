from django.db import models
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from jsonfield import JSONCharField

from apps.message.models import DestType, SrcType

from common import models as _models
from common.utils import to_org_id, current_timestamp


class BaseChat(_models.BaseOrgModel):
    src_id = _models.PositiveBigIntegerField()
    src_type = models.PositiveSmallIntegerField()

    dest_id = _models.PositiveBigIntegerField()
    dest_type = models.PositiveSmallIntegerField()

    date_added = models.PositiveIntegerField()

    class Meta:
        abstract = True

    def has_owner(self, user):
        if self.dest_type == DestType.ORG_MEMBER:
            if self.src_type == SrcType.ORG_MEMBER:
                return user.id in (self.src_id, self.dest_id)

        if self.dest_type == DestType.DISCUSSION_GROUP:
            if self.src_type == SrcType.ORG_MEMBER:
                if user.id == self.src_id:
                    return True

            in_group = user.in_discussion_group(to_org_id(self._state.db), self.dest_id)
            if in_group:
                return self.date_added >= in_group.date_joined

        if self.dest_type == DestType.DEPARTMENT:
            if self.src_type == SrcType.ORG_MEMBER:
                if user.id == self.src_id:
                    return True

            in_group = user.in_department(to_org_id(self._state.db), self.dest_id)
            if in_group:
                return True

        return False

    def save(self, *args, **kwargs):
        if not self.pk and not self.date_added:
            self.date_added = current_timestamp()

        super(BaseChat, self).save(*args, **kwargs)


class TextChat(BaseChat):
    content = models.CharField(max_length=1024 * 10)

    class Meta:
        db_table = 'chat_text'


class MultimediaChat(BaseChat, _models.FileModelsMixin):
    fs = FileSystemStorage(location=settings.FS_ROOT)

    meta = JSONCharField(max_length=4096 * 16)
    filepath = models.CharField(max_length=128)

    def to_dict(self):
        ret = self.meta
        ret.update(super(MultimediaChat, self).to_dict())

        ret['url'] = '%s/orgs/%s/chats/%s/attachment' % \
            (settings.MULTIMEDIA_CHAT_ATTACHMENT_URL_PREFIX, to_org_id(self._state.db), self.id)

        del ret['meta']

        return ret

    class Meta:
        db_table = 'chat_multimedia'
