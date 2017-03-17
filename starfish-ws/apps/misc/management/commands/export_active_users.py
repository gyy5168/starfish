import json

import requests
from apps.account.models import User
from common.const import SrcType
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('org', nargs=1, type=int)

    def handle(self, *args, **options):
        msg_count = 0
        active_user_ids = set()
        org_id = options['org'][0]
        for shard in settings.LANDBRIDGE_SPEC['shard']:
            start = 0
            while True:
                messages = self._fetch_messages(org_id, shard, start)
                if not messages:
                    break

                for msg in messages:
                    msg_count += 1

                    if msg['src_type'] == SrcType.ORG_MEMBER:
                        active_user_ids.add(msg['src_id'])

                    start = max(start, msg['id'])

        if len(active_user_ids) > 50:
            raise ValueError()

        print('message count=%s, user count=%s' % (msg_count, len(active_user_ids)))
        r = User.objects.filter(id__in=active_user_ids)
        for i in r:
            print(i.name)

    def _fetch_messages(self, org_id, shard, start, ps=1000):
        url = '{prefix}/v1/orgs/{org_id}/messages?start={start}&ps={ps}'.format(
            prefix=settings.LANDBRIDGE_SPEC['shard'][shard]['rest_url'],
            org_id=org_id,
            start=start,
            ps=ps,
        )
        return json.loads(requests.get(url).content.decode('utf8'))
