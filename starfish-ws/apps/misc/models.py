from django.db import models

from jsonfield import JSONCharField

from common import models as _models
from common.utils import current_timestamp

import logging
log = logging.getLogger(__name__)


class OfflineTask(_models.BaseModel):
    (PASSWORD_CHANGED,
     OFFLINE_AGENT,
     REMOVE_AGENT) = (1, 2, 3)

    step = models.PositiveSmallIntegerField(default=1)
    type = models.PositiveSmallIntegerField()
    date_created = models.PositiveIntegerField()
    task = JSONCharField(max_length=4096 * 16)

    def save(self, *args, **kwargs):
        if not self.date_created:
            self.date_created = current_timestamp()

        super(OfflineTask, self).save(*args, **kwargs)

    @classmethod
    def create_password_changed_task(cls, user_id, current_agent_key):
        OfflineTask(
            type=cls.PASSWORD_CHANGED,
            task={
                'user_id': user_id,
                'current_agent_key': current_agent_key,
            }
        ).save()

    @classmethod
    def create_offline_agent_task(cls, user_id, agent_key, message):
        OfflineTask(
            type=cls.OFFLINE_AGENT,
            task={
                'user_id': user_id,
                'agent_key': agent_key,
                'message': message,
            }
        ).save()

    @classmethod
    def create_remove_agent_task(cls, user_id, agent_key, message):
        OfflineTask(
            type=cls.REMOVE_AGENT,
            task={
                'user_id': user_id,
                'agent_key': agent_key,
                'message': message,
            }
        ).save()

    class Meta:
        db_table = 'core_offline_task'
