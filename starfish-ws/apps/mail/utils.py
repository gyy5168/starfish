import json
import re
import os
import time
import random
import email
import uuid
import smtplib
import mimetypes

from datetime import datetime
from dateutil import parser

from email.utils import parseaddr
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import COMMASPACE, CRLF
from email.header import decode_header, Header
from email.base64mime import header_encode
from email import encoders

from django.conf import settings

from apps.account.models import User
from apps.mail.models import MailMetadata, MailContent, MailAttachment, ActionType, MailMessageId
from apps.org.models import WorkMail, GeneratedContact, ExternalContact, OrgDomain

from common.utils import shard_id, to_str, remove_tags, remove_special_tags
from common.message_queue import send_message_to_queue
from common.const import SrcType

import logging
log = logging.getLogger(__name__)


def same_subjects(s1, s2):
    l1, l2 = len(s1), len(s2)
    if l1 == l2:
        return s1 == s2

    if l1 > l2:
        return _same_subjects0(s1, s2)

    return _same_subjects0(s2, s1)


def _same_subjects0(s1, s2):
    if not s1.endswith(s2):
        return False

    return re.match('^(Re: )+$', s1[:len(s2) - 1])


class MailStorage(object):
    def __init__(self, original_mail, action_type=0):
        self.mail_message = email.message_from_string(original_mail)
        self.original_mail = original_mail
        self.action_type = action_type

    def _domain(self, addr):
        if addr:
            return addr.split('@')[1]

    def save(self):
        name, _from = self._parse_email_addr(self.mail_message.get('From', ''))
        if not _from:
            logging.warn('invalid email, empty from address.')
            return {}

        domains, to, cc, others = set([self._domain(_from)]), set(), set(), set()

        self._parse_email_addr_list(
            self.mail_message.get('To', '').split(','), to, domains)

        self._parse_email_addr_list(
            self.mail_message.get('Cc', '').split(','), cc, domains)

        self._parse_email_addr_list(
            self.mail_message.get('Bcc', '').split(','), others, domains)

        self._parse_email_addr_list(
            [self.mail_message.get('Delivered-To', '')], others, domains)

        ret = {}
        for domain in domains:
            org_domain = OrgDomain.objects.getx(name=domain)
            if not org_domain:
                continue

            org = org_domain.org
            identity, created = MailMessageId.get_or_create(
                self.mail_message.get('Message-ID'),
                using=shard_id(org.id)
            )
            if not created:
                continue

            mail_metadata = MailMetadata(
                meta={
                    'action_type': self.action_type,
                    'from': _from,
                    'from_detail': self._build_from_detail(name, _from, org),
                    'to': list(to),
                    'cc': list(cc),
                    'others': list(others),
                    'subject': self._decode_string(self.mail_message.get('Subject')),
                },
                identity=identity,
                filepath=MailMetadata.save_file2(self.original_mail, org.id),
                date=int(time.mktime(
                    parser.parse(
                        fix_date_str(self.mail_message.get('Date'))
                    ).timetuple()
                ))
            )
            mail_metadata._new_subject = self.action_type & ActionType.NEW_SUBJECT
            mail_metadata.save(using=shard_id(org.id))
            mail_metadata.references = self._build_refs(org.id)

            mail_metadata._contents, mail_metadata._attachments = \
                self._save_content(org, mail_metadata)

            ret[domain] = mail_metadata

        return ret

    def _build_from_detail(self, name, _from, org):
        r = WorkMail.find(_from)
        if r and r.org_id == org.id:
            type, value = SrcType.ORG_MEMBER, User.objects.get_or_none(id=r.owner).to_dict()
        else:
            ec = ExternalContact.objects.using(shard_id(org.id)).get_or_none(email=_from)
            if ec:
                type, value = SrcType.EXTERNAL_CONTACT, ec.to_dict()
            else:
                gc = GeneratedContact.create_by_name_and_email(name, _from, org.id)
                type, value = SrcType.GENERATED_CONTACT, gc.to_dict()

        return {'type': type, 'value': value}

    def _parse_email_addr_list(self, list_, set_, domains):
        for m in list_:
            _, addr = self._parse_email_addr(m)
            if not addr:
                continue

            set_.add(addr)
            if not WorkMail.find(addr):
                continue

            domains.add(self._domain(addr))

    def _parse_email_addr(self, addr):
        _name, addr = parseaddr(addr)
        v, charset = decode_header(_name)[0]
        if not charset or not v:
            return (addr, addr)

        name = addr
        try:
            name = v.decode(charset)
        except UnicodeDecodeError:
            pass

        return (name, addr)

    def _build_refs(self, org_id):
        message_ids = []
        if 'In-Reply-To' in self.mail_message:
            message_ids.append(self.mail_message.get('In-Reply-To'))

        if 'References' in self.mail_message:
            message_ids.extend(
                [i.strip() for i in self.mail_message.get('References').split('\n')])

        if not message_ids:
            return []

        message_ids = list(set(message_ids))
        hashs = MailMessageId.hash_list(message_ids)
        mail_ids = MailMetadata.objects.using(org_id) \
            .filter(identity__hash__in=hashs) \
            .values_list('id', flat=True)

        ref_mail_ids = MailMetadata.batch_get_refs_mail_ids(org_id, mail_ids)

        return list(set(list(mail_ids) + list(ref_mail_ids)))

    def _decode_string(self, encoded_string):
        if not re.match('=\?.*\?=', encoded_string):
            return encoded_string

        ret = []
        for s, enc in decode_header(encoded_string):
            if enc:
                s = str(s, enc)
            ret.append(s)

        return ''.join(ret)

    def _save_content(self, org, mail_meta):
        contents, attachments = [], []

        for part in self.mail_message.walk():
            content_type = part.get_content_type()
            if content_type in ['multipart/alternative', 'multipart/mixed']:
                continue
            elif content_type == 'text/plain' or content_type == 'text/html':
                transfer_encode = part.get('Content-Transfer-Encoding')
                if transfer_encode and transfer_encode.lower() in ('quoted-printable', 'base64'):
                    charset = part.get_content_charset() or 'utf-8'
                    content = str(part.get_payload(decode=True), charset, 'replace')
                else:
                    content = part.get_payload(decode=False)

                contents.append(MailContent(
                    mail_id=mail_meta.id,
                    content_type=MailContent.as_content_type(content_type),
                    content=content))
                contents[-1].save(using=shard_id(org.id))
            else:
                attachment = self._parse_attachment(part)
                if not attachment:
                    continue

                file_path = MailAttachment.save_file2(attachment['filedata'], org.id)

                attachments.append(MailAttachment(
                    mail_id=mail_meta.id,
                    filename=attachment['filename'],
                    filesize=len(attachment['filedata']),
                    filepath=file_path))
                attachments[-1].save(using=shard_id(org.id))

        return contents, attachments

    def _parse_attachment(self, message_part):
        content_disposition = message_part.get('Content-Disposition', None)
        if not content_disposition:
            return None

        content_disposition = self._decode_string(content_disposition)

        dispositions = content_disposition.strip().split(';')
        if not dispositions or dispositions[0].lower() != 'attachment':
            return None

        filename = ''
        for param in dispositions[1:]:
            name, value = param.strip().split('=', 1)
            if name == 'filename':
                filename = self._decode_string(value.strip('"'))
                break

        return {
            'filename': filename,
            'filedata': message_part.get_payload(decode=True),
        }


class MailStorageForRequest(object):
    '''save MailMetadata and others from http post request body. '''
    def __init__(self, org_id, from_user, data, attachments=[], reply_to_mail=None):
        self.org_id = org_id
        self.from_user = from_user
        self.attachments = attachments
        self.reply_to_mail = reply_to_mail
        self._from = from_user.work_mail(org_id)
        for key, default in \
                [('to', []), ('cc', []), ('bcc', []),
                 ('subject', ''), ('content', ''), ('action_type', 0)]:
            setattr(self, key, data.get(key, default))
        self.message_id = messageid()
        self.saved_mail_meta = {}

    def mail_meta(self, org_id=None):
        if not org_id:
            org_id = self.org_id
        return self.saved_mail_meta.get(org_id)

    def calc_mail_size(self):
        main_body = build_mail(self._from, self.to, self.cc,
                               self.subject, self.content,
                               self.reply_to_mail, [], self.message_id).as_string()

        size_in_bytes = len(main_body.encode('utf-8'))
        for a in self.attachments:
            size_in_bytes += a['size']*4.0/3

        return size_in_bytes

    def send(self):
        _kwargs = {
            'from': self._from,
            'to': self.to,
            'cc': self.cc,
            'bcc': self.bcc,
            'subject': self.subject,
            'content': self.content,
            'attachments': self.attachments
        }
        if self.reply_to_mail:
            _kwargs.update(
                reply_to={'org_id': self.org_id, 'reply_to_mail': self.reply_to_mail.id}
            )
        _kwargs.update(
            mail_metas={oid: m.id for oid, m in self.saved_mail_meta.items()},
            message_id=self.message_id,
        )
        send_message_to_queue(settings.STARFISH_EMAIL_QUEUE_NAME, json.dumps(_kwargs))
        return self

    def save(self):
        domains = set([self._domain(self._from)])
        mail_map = {}
        for key in ["to", "cc", "bcc"]:
            val = set()
            self._parse_email_addr_list(getattr(self, key), val, domains)
            mail_map[key] = list(val)

        timestamp = int(time.time())
        org_id_list = []
        for domain in domains:
            org_domain = OrgDomain.objects.getx(name=domain)
            if not org_domain:
                continue
            org_id_list.append(org_domain.org_id)

        for org_id in set(org_id_list):
            identity, created = MailMessageId.get_or_create(
                self.message_id,
                using=shard_id(org_id)
            )
            mail_metadata = MailMetadata(
                meta={
                    'action_type': self.action_type,
                    'from': self._from,
                    'from_detail': self._build_from_detail(org_id),
                    'to': mail_map['to'],
                    'cc': mail_map['cc'],
                    'others': mail_map['bcc'],
                    'subject': self.subject,
                },
                filepath='',
                identity=identity,
                date=timestamp
            )
            mail_metadata._new_subject = self.action_type & ActionType.NEW_SUBJECT
            mail_metadata.save(using=shard_id(org_id))
            mail_metadata.references = self._build_refs(org_id)
            mail_metadata._contents, mail_metadata._attachments = \
                self._save_content(org_id, mail_metadata)

            self.saved_mail_meta[org_id] = mail_metadata

        return self

    def _domain(self, addr):
        if addr:
            return addr.split('@')[1]

    def _build_from_detail(self, org_id):
        if self.org_id == org_id:
            info = SrcType.ORG_MEMBER, self.from_user.to_dict()
        else:
            ec = ExternalContact.objects.using(shard_id(org_id)).get_or_none(email=self._from)
            if ec:
                info = SrcType.EXTERNAL_CONTACT, ec.to_dict()
            else:
                gc = GeneratedContact.create_by_name_and_email(self._from, self._from, org_id)
                info = SrcType.GENERATED_CONTACT, gc.to_dict()
        return {'type': info[0], 'value': info[1]}

    def _parse_email_addr_list(self, list_, set_, domains):
        for m in list_:
            _, addr = self._parse_email_addr(m)
            if not addr:
                continue

            set_.add(addr)
            if not WorkMail.find(addr):
                continue

            domains.add(self._domain(addr))

    def _parse_email_addr(self, addr):
        _name, addr = parseaddr(addr)
        v, charset = decode_header(_name)[0]
        if not charset or not v:
            return (addr, addr)

        name = addr
        try:
            name = v.decode(charset)
        except UnicodeDecodeError:
            pass

        return (name, addr)

    def _build_refs(self, org_id):
        if not self.reply_to_mail:
            return []

        hashs = [self.reply_to_mail.identity.hash]
        if same_subjects(self.subject, self.reply_to_mail.meta['subject']):
            hashs.extend(self.reply_to_mail.get_refs_hashs())

        mail_ids = MailMetadata.objects.using(org_id) \
            .filter(identity__hash__in=hashs) \
            .values_list('id', flat=True)
        ref_mail_ids = MailMetadata.batch_get_refs_mail_ids(org_id, mail_ids)

        return list(set(list(mail_ids) + list(ref_mail_ids)))

    def _save_content(self, org_id, mail_meta):
        contents, attachments = [], []

        # save content
        plain = remove_tags(to_str(self.content))
        html = remove_special_tags(to_str(self.content), ('img', 'script'))
        for content, c_type in [(plain, MailContent.CONTENT_TYPE_TEXT_PLAIN),
                                (html, MailContent.CONTENT_TYPE_TEXT_HTML)]:
            mc = MailContent(
                mail_id=mail_meta.id,
                content_type=c_type,
                content=content)
            mc.save(using=shard_id(org_id))
            contents.append(mc)

        # save attachments
        for at in self.attachments:
            ma = MailAttachment(
                mail_id=mail_meta.id,
                filename=at['name'],
                filesize=at['size'],
                filepath=at['filepath'])
            ma.save(using=shard_id(org_id))
            attachments.append(ma)

        return contents, attachments


def messageid():
    """Return a globally unique random string in RFC 2822 Message-ID format

    <datetime.pid.random@host.dom.ain>

    Optional uniq string will be added to strenghten uniqueness if given.
    """
    _datetime = time.strftime('%Y%m%d%H%M%S', time.gmtime())
    pid = os.getpid()
    rand = random.randrange(2**31-1)
    uid = str(uuid.uuid4())

    return '<%s.%s.%s.%s@%s>' % (_datetime, pid, rand, uid, settings.MAIL_MESSAGE_ID_SUFFIX)


def build_mail(
        sender=None, to=[], cc=[], subject='', content='',
        reply_to_mail=None, files=[], message_id=None):
    txt_part = MIMEMultipart('alternative')
    if len(files):
        mail = MIMEMultipart('mixed', _subparts=[txt_part])
    else:
        mail = txt_part

    mail['Subject'] = Header(to_str(subject), 'utf-8')
    mail['From'] = sender
    mail['To'] = COMMASPACE.join(to)
    mail['Cc'] = COMMASPACE.join(cc)
    mail['Message-ID'] = message_id or messageid()
    mail['Date'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if reply_to_mail:
        mail['In-Reply-To'] = reply_to_mail.message_id
        if same_subjects(subject, reply_to_mail.meta['subject']):
            refers = [reply_to_mail.message_id]
            refers.extend(reply_to_mail.get_refs_message_ids())

            mail['References'] = CRLF.join(refers)

    txt_part.attach(
        MIMEText(remove_tags(to_str(content)), 'plain', 'utf8')
    )
    txt_part.attach(
        MIMEText(remove_special_tags(to_str(content), ('img', 'script')), 'html', 'utf8')
    )

    for i in files:
        filename, filepath = i['name'], i['fullpath']
        log.info('attachmen filename: %s', filename)
        ctype, encoding = mimetypes.guess_type(filepath)
        if ctype is None or encoding is not None:
            ctype = 'application/octet-stream'
        maintype, subtype = ctype.split('/', 1)

        part = MIMEBase(maintype, subtype)
        with open(filepath, 'rb') as f:
            part.set_payload(f.read())
        encoders.encode_base64(part)
        # encode head with "RFC 1522"
        # encoded-word: "=?" charset "?" encoding "?" encoded-text "?="
        # example: "=?UTF-8?B?5rWL6K+VLnR4dA==?="
        encoded_filename = header_encode(filename, charset='utf-8')
        # by default, "add_header" use "RFC 2231" encode filename if filename has no-ASCII chars
        # which method causes qq-mail decode failed.
        part.add_header('Content-Disposition', 'attachment', filename=encoded_filename)
        mail.attach(part)

    return mail


def fix_date_str(s):
    return re.sub('\(GMT[+\-:0-9]+\)', '', s).strip()


def build_and_send_mail(**data):
    reply_to_mail = None
    if 'reply_to' in data:
        org_id = data['reply_to'].get('org_id')
        reply_to_mail_id = data['reply_to'].get('reply_to_mail')

        if org_id and reply_to_mail_id:
            reply_to_mail = MailMetadata.objects \
                .using(org_id) \
                .get_or_none(id=reply_to_mail_id)
            if not reply_to_mail:
                raise ValueError('no such mail %s:%s' % (org_id, reply_to_mail_id))

    mail_message = build_mail(
        data['from'],
        data.get('to', []),
        data.get('cc', []),
        data.get('subject', ''),
        data.get('content', ''),
        reply_to_mail,
        data.get('attachments', []),
        data.get('message_id')
    )

    retries = 5
    for i in range(retries):
        try:
            conn = smtplib.SMTP(random.choice(settings.SMTP_HOST))
            conn.login(data['from'], settings.SMPT_FAKE_PWD)
            conn.sendmail(
                data['from'],
                data.get('to', []) + data.get('cc', []) + data.get('bcc', []),
                mail_message.as_string())
            conn.quit()

            break
        except Exception as e:
            log.exception(e)

    return mail_message
