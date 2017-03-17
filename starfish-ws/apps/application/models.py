from django.db import models

from common import models as _models
from common.utils import current_timestamp


class Application(_models.BaseModel):
    contact = models.CharField(max_length=128)
    create_at = models.PositiveIntegerField()

    def save(self, *args, **kwargs):
        if not self.id:
            self.create_at = current_timestamp()

        super(Application, self).save(*args, **kwargs)

    class Meta:
        db_table = 'core_application'
