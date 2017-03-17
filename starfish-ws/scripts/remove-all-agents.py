#!/usr/bin/env python
import os

os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

import sys
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# do not remove
from django.conf import settings
settings.DATABASES
from common.maxwell_utils import LifebookUtil


def do(user_id):
    # endpoints = utils.MaxwellEndpoint.endpoints(user_id)
    # lifebook = Lifebook(endpoints['lifebook_cmd'])

    lifebook = LifebookUtil.instance()
    r = lifebook.find_agents_by_user(user_id)
    for i in r:
        lifebook.delete_agent(user_id, i.key)
        print(i)

for i in range(3, 200):
    print(str(i) + '...............' + str(i))
    do(i)
    import time
    time.sleep(2)
