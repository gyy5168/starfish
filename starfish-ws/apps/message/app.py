import json
import simpleflake

from apps.org.models import OrgApp
from apps.message.models import Message, MessageContent

from common.const import SrcType
from common.utils import Landbridge


class AppMessageMixin(object):
    def create_app_message(self, request, org_id, dest_type, dest_id):
        if 'id' in request.DATA['body']:
            return self.create_ref_message(request, org_id, dest_type, dest_id)

        return self._create_app_message0(request, org_id, dest_type, dest_id)

    def _create_app_message0(self, request, org_id, dest_type, dest_id):
        app = request.DATA['body']['app']
        if app not in OrgApp.VALID_APPS:
            raise ValueError('invalid app')

        content = MessageContent(
            content={
                'app': {
                    'id': app,
                    'name': OrgApp.app_name(app)
                },
                'content': {
                    'icon': OrgApp.app_icon(app),
                    'subject': request.DATA['body']['content']['subject'],
                    'url': request.DATA['body']['content']['url'],
                }
            },
        )

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

        return message

    def create_ref_message(self, request, org_id, dest_type, dest_id):
        message = Message.objects \
            .using(org_id) \
            .get_or_none(
                id=request.DATA['body']['id'],
                type=Message.TYPE_APP_CONTENT_UPDATED
            )

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

        message2 = Message(
            id=simpleflake.simpleflake(),
            src_type=SrcType.ORG_MEMBER,
            src_id=request.current_uid,
            dest_type=dest_type,
            dest_id=dest_id,
            type=Message.TYPE_APP_CONTENT_UPDATED,
        )

        message2._snapshot = message['body']

        return message2
