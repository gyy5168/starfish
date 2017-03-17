from rest_framework.response import Response

from django.db.models import Q
from django.conf import settings

from apps.bfs.models import BfsFile
from apps.mail.models import (
    MailMetadata, MailContent, MailAttachment, UserMail, UserSubject)
from apps.mail import utils
from apps.org.models import ExternalContact, WorkMail
from common.exceptions import APIError

from common.validate_email import validate_email
from common.const import ErrorCode
from common.utils import shard_id, AttachmentView, check_bfs_file_permission, list_ids, \
    TargetObject
from common.viewset import ViewSet

import logging
log = logging.getLogger(__name__)


class MailViewSet(ViewSet):
    PAGE_SIZE = 10

    def create_send_async(self, request, org_id):
        has_attachment_permission, attachments = \
            self._check_attachments_permission(request, org_id)
        if not has_attachment_permission:
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        has_reply_to_permission, reply_to_mail = self._check_reply_to_permission(request, org_id)
        if not has_reply_to_permission:
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        storage = utils.MailStorageForRequest(
            org_id, request.current_user, request.DATA, attachments, reply_to_mail)

        if self.mail_body_limit and storage.calc_mail_size() > self.mail_body_limit:
            raise APIError(ErrorCode.MAIL_BODY_SIZE_EXCEED_LIMIT)
        else:
            storage.save().send()

        user_mails = UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(mail_id=storage.mail_meta().id)

        ret = self._build_mail_detail_list(org_id, user_mails[:1])[0]
        subjects = UserSubject.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(last_mail_id__gte=ret['mail_id'])
        ret['subject'] = self._build_mail_detail_list_for_subjects(org_id, subjects[:1])[0]

        return Response({'errcode': ErrorCode.OK, 'data': ret})

    def retrieve(self, request, org_id, mail_id):
        user_mails = UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid, mail_id=mail_id)

        if not user_mails:
            return Response({'errcode': ErrorCode.NO_SUCH_EMAIL})

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_mail_detail_list(org_id, user_mails)[0]})

    def list_mails(self, request, org_id, subject_id):
        qs = UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(Q(subject_id=subject_id) | Q(mail_id=subject_id))

        start = int(request.GET.get('start', 0))
        if start:
            qs = qs.filter(mail_id__gt=start)

        ps = int(request.GET.get('ps', self.PAGE_SIZE))
        user_mails = qs.order_by('id')[:ps]

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_mail_detail_list(org_id, user_mails)})

    def list_contacts(self, request, org_id):
        ret = ExternalContact.objects.using(shard_id(org_id)).all()
        ret = [v.email for v in ret if validate_email(v.email)]
        return Response({'errcode': ErrorCode.OK, 'data': ret})

    def destroy_mail(self, request, org_id, mail_id):
        user_mails = UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid, mail_id=mail_id)

        if not user_mails:
            return Response({'errcode': ErrorCode.NO_SUCH_EMAIL})
        user_mails[0].delete()

        return Response({'errcode': ErrorCode.OK})

    def subject_detail(self, request, org_id, subject_id):
        um = UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(mail_id=subject_id)
        if um.exists():
                return Response({'errcode': ErrorCode.OK,
                                 'data': self._build_mail_detail_list(org_id, um)[0]})
        else:
            raise APIError(ErrorCode.NO_SUCH_EMAIL,
                           subject_id=subject_id, user_id=request.current_uid)

    def destroy_subject(self, request, org_id, subject_id):
        if not subject_id:
            raise ValueError()

        UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(Q(mail_id=subject_id) | Q(subject_id=subject_id))\
            .delete()

        UserSubject.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(subject_id=subject_id)\
            .delete()

        return Response({'errcode': ErrorCode.OK})

    def partial_update_subject(self, request, org_id, subject_id):
        UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(Q(mail_id=subject_id) | Q(subject_id=subject_id)) \
            .update(is_read=1)

        UserSubject.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(subject_id=subject_id) \
            .update(is_read=1)

        return Response({'errcode': ErrorCode.OK})

    def partial_update(self, request, org_id, mail_id):
        user_mails = UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid) \
            .filter(mail_id__in=list_ids(mail_id))

        if not user_mails:
            return Response({'errcode': ErrorCode.NO_SUCH_EMAIL})

        is_read = int(request.DATA['is_read'])
        if is_read not in (0, 1):
            raise ValueError('invalid args')

        for um in user_mails:
            um.is_read = is_read
            um.save(using=shard_id(org_id))

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_mail_detail_list(org_id, user_mails)[0]})

    def list_subjects(self, request, org_id, user_id):
        # 根据 mail id 查看 subject
        if 'mail_id' in request.GET:
            return self._list_mails0(request, org_id, request.GET['mail_id'])

        qs = UserSubject.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=user_id)

        seq = int(request.GET.get('seq', 0))
        if seq:
            qs = qs.filter(last_mail_id__lt=seq)

        ps = int(request.GET.get('ps', self.PAGE_SIZE))
        subjects = qs.order_by('-last_mail_id')[:ps]

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._build_mail_detail_list_for_subjects(org_id, subjects)})

    def _list_mails0(self, request, org_id, mail_id):
        r = UserMail.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=request.current_uid, mail_id=mail_id)
        if not r:
            return Response({'errcode': ErrorCode.NO_SUCH_EMAIL})

        subject_id = r[0].subject_id if r[0].subject_id else r[0].mail_id

        return self.list_mails(request, org_id, subject_id)

    def _build_mail_detail_list(self, org_id, user_mails):
        mail_metadata, mail_contents, mail_attachments = \
            MailMetadata.load([i.mail_id for i in user_mails], org_id)

        ret = []
        for v in user_mails:
            _v = v.to_dict()

            self._build_mail_detail(
                _v, mail_metadata[v.mail_id],
                mail_contents[v.mail_id], mail_attachments[v.mail_id])

            _v['id'] = v.mail_id
            _v['subject_id'] = v.mail_id if not v.subject_id else v.subject_id

            ret.append(_v)

        return ret

    def _build_mail_detail_list_for_subjects(self, org_id, subjects):
        last_mail_ids = [i.last_mail_id for i in subjects]

        mail_metadata, mail_contents, mail_attachments = \
            MailMetadata.load(last_mail_ids, org_id)

        ret = []
        for v in subjects:
            _v = v.to_dict()

            self._build_mail_detail(
                _v, mail_metadata[v.last_mail_id],
                mail_contents[v.last_mail_id], mail_attachments[v.last_mail_id])

            _v.update({
                'seq': v.last_mail_id,
                'id': v.subject_id,
            })

            ret.append(_v)

        return ret

    def _build_mail_detail(self, v, mail_metadata, mail_contents, mail_attachments):
        r = {
            'meta': mail_metadata.meta,
            'date': mail_metadata.date,
            'content': self._build_mail_content(mail_contents),
            'attachments': mail_attachments
        }
        v.update(r)

        _t = TargetObject()
        for i in ['to', 'cc']:
            l = []
            for addr in r['meta'].get(i, []):
                res = {}
                wm = WorkMail.find(addr)
                if wm:
                    res = _t.obj_info(wm.owner_model, wm.owner, wm._state.db)
                    res['owner_type'] = wm.owner_type
                l.append(res)
            r['meta']['%s_info' % i] = l

        if 'others' in v['meta']:
            del v['meta']['others']

    def _build_mail_content(self, contents):
        multipart = 0
        for c in contents:
            if c['content_type'] == MailContent.CONTENT_TYPE_TEXT_PLAIN:
                multipart |= 1

            if c['content_type'] == MailContent.CONTENT_TYPE_TEXT_HTML:
                multipart |= 2

        if multipart == (1 | 2):
            return ''.join([
                v['content'] for v in contents
                if v['content_type'] == MailContent.CONTENT_TYPE_TEXT_HTML])

        return '\n'.join([v['content'] for v in contents])

    def _check_reply_to_permission(self, request, org_id):
        if 'reply_to' not in request.DATA or not request.DATA['reply_to']:
            return True, None

        reply_to_mail_id = request.DATA['reply_to']
        mail_metadata = MailMetadata.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=reply_to_mail_id)
        if not mail_metadata:
            raise ValueError('no such mail message %s:%s' % (org_id, reply_to_mail_id))

        if mail_metadata.has_owner(request.current_user.id):
            return True, mail_metadata

        return False, None

    @property
    def mail_attachement_limit(self):
        if hasattr(settings, 'MAIL_CONFIG'):
            return settings.MAIL_CONFIG.get('attachment_limit')

    @property
    def mail_body_limit(self):
        if hasattr(settings, 'MAIL_CONFIG'):
            return settings.MAIL_CONFIG.get('body_size_limit')

    def _check_attachments_permission(self, request, org_id):
        ret = []
        if 'attachments' not in request.DATA:
            return True, ret

        for a in request.DATA['attachments']:
            has_permission, info = False, None
            if 'bfs_file_id' in a:
                has_permission, info = self._check_bfs_file_permission(
                    request, a['bfs_file_id'], org_id)
            elif 'id' in a:
                has_permission, info = self._check_ref_attachment_permission(
                    request, a['id'], org_id)
            else:
                raise ValueError('invalid args')

            if not has_permission or info is None:
                return False, []
            if self.mail_attachement_limit and info.get('size', 0) > self.mail_attachement_limit:
                raise APIError(ErrorCode.ATTACHMENT_EXCEED_LIMIT,
                               bfs_file_id=a.get('bfs_file_id'),
                               id=a.get('id'),
                               **info)

            ret.append(dict(name=a['name'], **info))

        return True, ret

    def _check_bfs_file_permission(self, request, bfs_file_id, org_id):
        r = BfsFile.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=bfs_file_id, is_missing_chunks=0)

        if not r:
            return False, None

        if check_bfs_file_permission(request.current_uid, org_id, r):
            return False, None

        return True, dict(filepath=r.filepath,
                          size=r.size,
                          fullpath=BfsFile.full_path(r.filepath))

    def _check_ref_attachment_permission(self, request, id_, org_id):
        r = MailAttachment.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=id_)
        if not r:
            return False, None

        r1 = MailMetadata.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=r.mail_id)
        if not r1:
            return False, None

        if not r1.has_owner(request.current_user.id):
            return False, None

        return True, dict(filepath=r.filepath,
                          size=r.filesize,
                          fullpath=MailAttachment.full_path(r.filepath))


class MailAttachmentView(AttachmentView):
    def get(self, request, org_id, mail_id, attachment_id):
        try:
            return self._get(request, org_id, mail_id, attachment_id)
        except Exception as exc:
            log.exception(exc)
            return self._build_json_response(errcode=ErrorCode.UNKNOWN_ERROR)

    def _get(self, request, org_id, mail_id, attachment_id):
        mail_attachment = MailAttachment.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=attachment_id, mail_id=mail_id)

        if not mail_attachment:
            return self._build_json_response(errcode=ErrorCode.NO_SUCH_EMAIL_ATTACHMENT)

        if mail_attachment.mail_id != mail_id:
            raise ValueError('invalid attachment')

        return self._build_attachment_response(
            request,
            mail_attachment.filename,
            MailAttachment.full_path(mail_attachment.filepath))
