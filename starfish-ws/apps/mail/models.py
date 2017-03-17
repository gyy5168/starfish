import json
import hashlib
from django.conf import settings
from django.db import models
from django.core.files.storage import FileSystemStorage

from jsonfield import JSONCharField

from apps.org.models import WorkMail

from common import models as _models
from common.utils import shard_id, detect_mime_type

import logging
log = logging.getLogger(__name__)


class MailMessageId(_models.BaseOrgModel):
    message_id = models.CharField(max_length=128)
    hash = models.BinaryField(db_index=True)

    @classmethod
    def get_or_create(cls, message_id, using):
        hash = cls.hash_message_id(message_id)
        obj = cls.objects.using(using).get_or_none(hash=hash)
        if obj:
            return obj, False
        else:
            obj = cls(message_id=message_id, hash=hash)
            obj.save(using=using)
            return obj, True

    @classmethod
    def hash_list(cls, message_ids):
        return [cls.hash_message_id(i) for i in message_ids]

    @classmethod
    def hash_message_id(cls, message_id):
        return hashlib.md5(message_id.encode('utf8')).digest()

    class Meta:
        db_table = 'mail_message_id'


class MailMetadata(_models.BaseOrgModel, _models.FileModelsMixin):
    identity = models.ForeignKey(MailMessageId, db_constraint=False)
    references = models.ManyToManyField('self', related_name='referred', symmetrical=False)
    meta = JSONCharField(max_length=4096 * 16)
    filepath = models.CharField(max_length=128)
    date = models.PositiveIntegerField()

    fs = FileSystemStorage(location=settings.FS_ROOT)

    @classmethod
    def load(cls, mail_ids, org_id):
        _mail_metadata = MailMetadata.objects \
            .using(shard_id(org_id)) \
            .filter(id__in=mail_ids)
        mail_metadata = dict([(v.id, v) for v in _mail_metadata])

        _mail_contents = MailContent.objects \
            .using(shard_id(org_id)) \
            .filter(mail_id__in=mail_ids)
        mail_contents = {}
        for v in _mail_contents:
            if v.mail_id not in mail_contents:
                mail_contents[v.mail_id] = []

            _v = v.to_dict()
            del _v['mail_id']

            mail_contents[v.mail_id].append(_v)

        _mail_attachments = MailAttachment.objects \
            .using(shard_id(org_id)) \
            .filter(mail_id__in=mail_ids)
        mail_attachments = {}
        for v in _mail_attachments:
            if v.mail_id not in mail_attachments:
                mail_attachments[v.mail_id] = []

            _v = v.to_dict()
            del _v['mail_id']

            mail_attachments[v.mail_id].append(_v)

        for mail_id in mail_ids:
            if mail_id not in mail_contents:
                mail_contents[mail_id] = []

            if mail_id not in mail_attachments:
                mail_attachments[mail_id] = []

        return (mail_metadata, mail_contents, mail_attachments)

    @property
    def message_id(self):
        return self.identity.message_id

    @classmethod
    def batch_get_refs_mail_ids(cls, org_id, mail_ids):
        return cls.references.through.objects\
            .using(shard_id(org_id))\
            .filter(from_mailmetadata_id__in=mail_ids) \
            .values_list('to_mailmetadata_id', flat=True) \
            .distinct()

    def message_has_sent(self, sent=None):
        if sent is None:
            return hasattr(self, '_message_has_sent') and self._message_has_sent

        self._message_has_sent = sent

    def has_owner(self, user_id):
        return UserMail.objects\
            .using(self.org_id)\
            .filter(user_id=user_id, mail_id=self.id)\
            .exists()

        # addr_list = set(
        #     itertools.chain(
        #         self.meta['to'], self.meta['cc'],
        #         self.meta['others'], [self.meta['from']]
        #     )
        # )
        # for addr in addr_list:
        #     r = WorkMail.find(addr)
        #     if not r:
        #         continue
        #
        #     if r.owner_type == WorkMail.TYPE_ORG_MEMBER:
        #         if user.id == r.owner:
        #             return True
        #
        #     if r.owner_type == WorkMail.TYPE_DEPARTMENT:
        #         if user.in_department(org_id(r._state.db), r.owner):
        #             return True
        #
        #     if r.owner_type == WorkMail.TYPE_DISCUSSION_GROUP:
        #         if user.in_discussion_group(org_id(r._state.db), r.owner):
        #             return True
        #
        # return False

    def get_refs_message_ids(self):
        if not hasattr(self, '_refs_message_ids_cache'):
            self._refs_message_ids_cache = \
                list(self.references.all().values_list('identity__message_id', flat=True))
        return self._refs_message_ids_cache

    def get_refs_hashs(self):
        if not hasattr(self, '_refs_hashs_cache'):
            self._refs_hashs_cache = \
                list(self.references.all().values_list('identity__hash', flat=True))
        return self._refs_hashs_cache

    def to_dict(self):
        r = super(MailMetadata, self).to_dict()
        r['meta'] = json.loads(r['meta'])

        if 'others' in r['meta']:
            del r['meta']['others']

        return r

    class Meta:
        db_table = 'mail_metadata'


class MailContent(_models.BaseOrgModel):
    CONTENT_TYPE_TEXT_PLAIN = 0
    CONTENT_TYPE_TEXT_HTML = 1

    mail_id = _models.PositiveBigIntegerField(db_index=True)
    content_type = models.PositiveSmallIntegerField()
    content = models.TextField()

    @staticmethod
    def as_content_type(s):
        if s.lower() == 'text/plain':
            return MailContent.CONTENT_TYPE_TEXT_PLAIN

        if s.lower() == 'text/html':
            return MailContent.CONTENT_TYPE_TEXT_HTML

        raise ValueError('invalid content type: %s' % s)

    class Meta:
        db_table = 'mail_content'


class MailAttachment(_models.BaseOrgModel, _models.FileModelsMixin):
    mail_id = _models.PositiveBigIntegerField(db_index=True)
    filename = models.CharField(max_length=2048)
    filesize = models.PositiveIntegerField()
    filepath = models.CharField(max_length=128)
    extra = JSONCharField(max_length=4096 * 16)

    fs = FileSystemStorage(location=settings.FS_ROOT)

    def save(self, *args, **kwargs):
        self.extra = {
            'mimetype': detect_mime_type(MailAttachment.full_path(self.filepath))
        }
        return super(MailAttachment, self).save(*args, **kwargs)

    def to_dict(self):
        r = super(MailAttachment, self).to_dict()

        del r['extra']
        r['mimetype'] = self.extra['mimetype']

        return r

    class Meta:
        db_table = 'mail_attachment'


class Direction(object):
    (INCOMING,
     OUTGOING,
     BOTH) = (1, 2, 3)


class ActionType(object):
    (NEW_SUBJECT,
     REPLY,
     FORWARD) = (1, 2, 4)


class UserMail(_models.BaseOrgModel):
    user_id = _models.PositiveBigIntegerField(db_index=True)
    mail_id = _models.PositiveBigIntegerField(db_index=True)
    subject_id = _models.PositiveBigIntegerField(db_index=True)
    direction = models.PositiveSmallIntegerField(db_index=True)
    is_read = models.PositiveSmallIntegerField(db_index=True)

    @classmethod
    def save_skip_self_outgoing(self, metadata, **kwargs):
        r = UserMail.objects \
            .using(metadata._state.db) \
            .filter(user_id=kwargs['user_id']) \
            .filter(mail_id=kwargs['mail_id']) \
            .filter(direction=Direction.OUTGOING)
        if not r:
            um = UserMail(**kwargs)
            um._metadata = metadata
            um.save(using=metadata._state.db)

    class Meta:
        db_table = 'mail_user_mail'


class UserSubject(_models.BaseOrgModel):
    user_id = _models.PositiveBigIntegerField(db_index=True)
    subject_id = _models.PositiveBigIntegerField(db_index=True)
    last_mail_id = _models.PositiveBigIntegerField(db_index=True)
    direction = models.PositiveSmallIntegerField(db_index=True)
    is_read = models.PositiveSmallIntegerField(db_index=True)

    def to_dict(self):
        r = super(UserSubject, self).to_dict()
        m = MailMetadata.objects.using(self.org_id).getx(id=self.subject_id)
        if m:
            r['subject'] = m.meta['subject']
            r['from'] = m.meta['from']
            r['from_detail'] = m.meta['from_detail']
            r['subject_attachments'] = MailAttachment.objects\
                .using(self.org_id)\
                .filter(mail_id=m.id)\
                .count()
        return r

    class Meta:
        db_table = 'mail_user_mail_subject'
