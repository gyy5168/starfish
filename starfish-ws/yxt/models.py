from django.db import models
from common import models as _models


class UserYxt(_models.SimpleBaseModel):
    user_id = _models.PositiveBigIntegerField()
    uuid = models.CharField(max_length=36)
    username = models.CharField(max_length=128, default='')

    @classmethod
    def user(cls, user_uuid):
        from apps.account.models import User
        ux = cls.objects.get_or_none(uuid=user_uuid)
        if ux:
            return User.objects.getx(id=ux.user_id)

    class Meta:
        db_table = 'uc_user_yxt'
        unique_together = ('user_id', 'uuid', )


class OrgYxt(_models.SimpleBaseModel):
    org_id = _models.PositiveBigIntegerField()
    uuid = models.CharField(max_length=36)

    @classmethod
    def org(cls, org_uuid):
        from apps.org.models import Org
        ox = cls.objects.get_or_none(uuid=org_uuid)
        if ox:
            return Org.objects.getx(id=ox.org_id)

    class Meta:
        db_table = 'uc_org_yxt'
        unique_together = ('org_id', 'uuid', )


class DepartmentYxt(_models.SimpleBaseOrgModel):
    department_id = _models.PositiveBigIntegerField()
    uuid = models.CharField(max_length=36)

    class Meta:
        db_table = 'uc_department_yxt'
        unique_together = ('department_id', 'uuid', )