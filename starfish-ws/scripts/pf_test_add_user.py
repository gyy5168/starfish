#!/usr/bin/env python

import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'starfish.settings'

from django.conf import settings
from common.utils import (shard_id, current_timestamp)
from apps.account.models import User
from apps.org.models import (Org, UserOrg, DiscussionGroup, UserDiscussionGroup)
from common.const import Gender
from django.db.models import signals
from apps.org.signals import (save_message_on_org_member_updated, adjust_user_for_default_department,
                              save_message_on_discussion_group_created, add_members_on_discussion_group_created,
                              save_message_on_discussion_group_updated_or_deleted, send_message_on_discussion_group_member_join,
                              save_message_on_discussion_group_member_left, clear_group_avatar_cache_on_discussion_group_member_updated,
                              update_user_discussion_group_last_modified_cache, save_message_on_discussion_group_created,
                              add_members_on_discussion_group_created, save_message_on_discussion_group_updated_or_deleted)
from apps.search.signals import create_index_on_object_saved


def add_user():
    signals.post_save.disconnect(adjust_user_for_default_department, sender=UserOrg)
    signals.post_save.disconnect(save_message_on_org_member_updated, sender=UserOrg)
    signals.post_save.disconnect(create_index_on_object_saved)
    signals.post_save.disconnect(save_message_on_discussion_group_created, sender=DiscussionGroup)
    signals.post_save.disconnect(add_members_on_discussion_group_created, sender=DiscussionGroup)
    signals.post_save.disconnect(save_message_on_discussion_group_updated_or_deleted, sender=DiscussionGroup)
    signals.post_save.disconnect(send_message_on_discussion_group_member_join, sender=UserDiscussionGroup)
    signals.post_save.disconnect(save_message_on_discussion_group_member_left, sender=UserDiscussionGroup)
    signals.post_save.disconnect(clear_group_avatar_cache_on_discussion_group_member_updated, sender=UserDiscussionGroup)
    signals.post_save.disconnect(update_user_discussion_group_last_modified_cache, sender=UserDiscussionGroup)

    groups = [{'id':0,'type':2},{'id':0,'type':10},{'id':0,'type':100},{'id':0,'type':1000},{'id':0,'type':5000}]
    orgid = 714
    pwd = '123456'

    out = open('userlist', 'w+')

    for i in range(10000,20000):
        kwargs = {
            'name': 'pftest' + str(i),
            'password': User.encrypt_password(pwd),
            'phone': '7777'+str(i),
            'gender': Gender.GENDER_MALE,
            'intro': '',
            'avatar': '',
        }
        u = User(**kwargs)
        u.save()
        
        UserOrg.objects.create(
                user_id=u.id,
                org_id=orgid,
                is_left=0)
        for g in groups:
            if i % g['type'] == 0:
                tmp = DiscussionGroup(
                    creator=u.id,
                    name=u.name,
                    intro='',
                    avatar='')
                tmp.save(using=shard_id(orgid))
                g['id'] = tmp.id

        for g in groups:
            UserDiscussionGroup(
                user_id=u.id,
                group_id=g['id'],
                date_joined=current_timestamp()).save(using=shard_id(orgid))
            out.write(str(u.id)+'|'+u.phone+'|'+pwd+'|' + str(orgid) +'|' + str(g['id']) + '|' + str(g['type'] + '\n')

    out.close()

