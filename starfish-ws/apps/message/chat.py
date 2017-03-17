import re
import json
import os
import math
import html
import audioread
import simpleflake

from django.conf import settings
from django.db.models.base import ModelState

from apps.bfs.models import BfsFile
from apps.chat.models import MultimediaChat, TextChat
from apps.message.models import Message, MessageContent

from common.const import SrcType
from common.utils import (
    shard_id, calc_thumbnail_size, detect_mime_type,
    openImage, check_bfs_file_permission, Landbridge)

import logging
log = logging.getLogger(__name__)


class ChatMessageMixin(object):
    def create_chat_message(self, request, org_id, dest_type, dest_id):
        send_to_self = True
        # re-transfer chat
        if 'id' in request.DATA['body']:
            content = self._create_ref_chat_content(
                request, org_id, dest_type, dest_id, request.DATA['body']['id'])
        # multimedia chat
        elif 'bfs_file_id' in request.DATA['body']['chat']:
            send_to_self = False
            chat = self._create_multimedia_chat(
                request, org_id, dest_type, dest_id, request.DATA['body']['chat']['bfs_file_id'])
            content = MessageContent(
                content={'chat': chat.to_dict()},
            )
        # text chat
        elif 'content' in request.DATA['body']['chat']:
            send_to_self = False
            chat = self._create_text_chat(
                request, org_id, dest_type, dest_id, request.DATA['body']['chat']['content'])

            chat.id = simpleflake.simpleflake()
            chat._state = ModelState(db=shard_id(org_id))
            content = MessageContent(
                content={'chat': chat.to_dict()},
            )
        else:
            raise ValueError("bad request.")

        message = Message(
            id=simpleflake.simpleflake(),
            src_type=SrcType.ORG_MEMBER,
            src_id=request.current_uid,
            dest_type=dest_type,
            dest_id=dest_id,
            content=content.id,
            type=request.DATA['type'],
        )

        message._snapshot = content.content
        message._send_to_self = send_to_self

        return message

    def _create_text_chat(self, request, org_id, dest_type, dest_id, content):
        content = html.escape(content)
        if not re.sub(r'[\s　]+', '', content):
            raise ValueError('emtpy content')

        return TextChat(
            src_id=request.current_uid,
            src_type=SrcType.ORG_MEMBER,
            dest_id=dest_id,
            dest_type=dest_type,
            content=content,
        )

    def _create_multimedia_chat(self, request, org_id, dest_type, dest_id, bfs_file_id):
        bfs_file = BfsFile.get(request.DATA['body']['chat']['bfs_file_id'], org_id)
        if not bfs_file:
            raise ValueError('invalid args, no bfs file')

        r = check_bfs_file_permission(request.current_uid, org_id, bfs_file)
        if r:
            raise ValueError('permission denied')

        filename = request.DATA['body']['chat']['name']
        filepath = bfs_file.filepath
        chat = MultimediaChat(
            src_id=request.current_uid,
            src_type=SrcType.ORG_MEMBER,
            dest_id=dest_id,
            dest_type=dest_type,
            meta={},
            filepath=filepath
        )

        mimetype = detect_mime_type(MultimediaChat.full_path(chat.filepath))
        mimetype = self._fix_audio_mime_type(mimetype, filename)

        _meta = {
            'name': filename,
            'size': os.path.getsize(MultimediaChat.full_path(chat.filepath)),
            'mimetype': mimetype,
        }

        if mimetype in ('audio/mp4', ):
            audio = audioread.audio_open(MultimediaChat.full_path(chat.filepath))
            length = int(math.ceil(audio.duration))
            audio.close()
            if not length:
                raise ValueError('empty audio.')
            _meta.update(length=length)

        elif mimetype.startswith('image/'):
            try:
                image = openImage(MultimediaChat.full_path(chat.filepath), mimetype)
                self._append_thumb_info(_meta, image.size)
                image.close()
            except Exception as e:
                log.warning('can not open image %s, %s' % (mimetype, e))
                _meta['mimetype'] = "application/octet-stream"

        chat.meta.update(_meta)
        chat.save(using=shard_id(org_id))

        return chat

    def _create_ref_chat_content(self, request, org_id, dest_type, dest_id, id_):
        _type = int(request.DATA['type'])
        if _type not in (Message.TYPE_TEXT_CHAT_CREATED, Message.TYPE_MULTIMEDIA_CHAT_CREATED):
            raise ValueError('invalid chat type')

        resp = Landbridge.send_request(
            request.current_uid,
            '/v1/orgs/%s/members/%s/messages/%s' %
            (org_id, request.current_uid, request.DATA['body']['id'])
        )
        message = json.loads(resp.content.decode('utf8'))
        if not message:
            raise ValueError('no such message.')

        if not Message.has_owner2(
                request.current_uid, org_id,
                message['src_type'], message['src_id'],
                message['dest_type'], message['dest_id'],
                message['created_at']
                ):
            raise ValueError('bad message.')

        return MessageContent(
            content=message['body'],
        )

    def _fix_audio_mime_type(self, mimetype, name):
        if mimetype == 'video/mp4' and name[-4:] == '.m4a':
            return 'audio/mp4'

        if mimetype.startswith('video/3gpp') and name[-4:] == '.m4a':
            return 'audio/mp4'

        return mimetype

    def _append_thumb_info(self, meta, image_size):
        meta.update({'thumbs': {}})
        for k, v in list(settings.IMAGE_RESIZE_SPEC.items()):
            w, h = calc_thumbnail_size(
                image_size[0], image_size[1], v[0], v[1])
            meta['thumbs'][k] = {'width': w, 'height': h}
