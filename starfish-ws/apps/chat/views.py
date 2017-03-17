from django.http import HttpResponseNotFound

from apps.chat.models import MultimediaChat

from common.const import ErrorCode
from common.utils import shard_id, AttachmentView

import logging
log = logging.getLogger(__name__)


class MultimediaChatAttachmentView(AttachmentView):
    def get(self, request, org_id, chat_id):
        try:
            return self._get(request, org_id, chat_id)
        except Exception as exc:
            log.exception(exc)
            return self._build_json_response(errcode=ErrorCode.UNKNOWN_ERROR)

    def _get(self, request, org_id, chat_id):
        chat = MultimediaChat.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=chat_id)

        if not chat:
            return HttpResponseNotFound()

        return self._build_attachment_response(
            request,
            chat.meta['name'],
            MultimediaChat.full_path(chat.filepath))
