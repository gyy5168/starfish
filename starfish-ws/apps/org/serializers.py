from apps.org.models import OrgApp, WorkMail
from common.serializers import BaseModelSerializer
from rest_framework import serializers
from common.utils import TargetObject


class OrgAppSerializer(BaseModelSerializer):
    class Meta:
        model = OrgApp
        fields = ("app",)


class WorkMailSerializer(BaseModelSerializer):
    local_part = serializers.SerializerMethodField('get_local_part')
    owner_info = serializers.SerializerMethodField('get_owner_info')

    class Meta:
        model = WorkMail
        fields = ("owner_info", "owner_type", "local_part", "domain_id", "is_set")

    def get_local_part(self, obj):
        if obj.is_fake('local_part'):
            return ''
        else:
            return obj.local_part

    def get_owner_info(self, obj):
        return TargetObject().obj_info(obj.owner_model, obj.owner, obj._state.db)
