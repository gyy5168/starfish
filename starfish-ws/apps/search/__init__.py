import json
from django.conf import settings


def index_key(object_id):
    return '_%s' % object_id


def send_index_cmd(model, pk, org_id, create=True, extra=None):
    kwargs = {
        "label": model._meta.app_label,
        "model": model._meta.object_name,
        "org_id": org_id,
        "pk": pk,
        "extra": extra,
    }
    kwargs.update(create_index=(1 if create else 0))

    from common.message_queue import send_message_to_queue
    send_message_to_queue(
        settings.STARFISH_INDEX_QUEUE_NAME,
        json.dumps(kwargs)
    )

from . import signals
