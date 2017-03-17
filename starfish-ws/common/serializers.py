from rest_framework import serializers
from common.models import BaseModel, BaseOrgModel
from common.utils import dt_to_timestamp, time_to_str


class BaseModelSerializer(serializers.ModelSerializer):
    create_time = serializers.SerializerMethodField('get_create_time')
    update_time = serializers.SerializerMethodField('get_update_time')
    create_timestamp = serializers.SerializerMethodField('get_create_timestamp')
    update_timestamp = serializers.SerializerMethodField('get_update_timestamp')

    def pre_fetch_cache(self, queryset, db):
        pass

    class Meta:
        model = BaseModel
        exclude = ('is_deleted', 'update_time', 'update_timestamp')

    def get_create_time(self, obj):
        return time_to_str(obj.create_time)

    def get_update_time(self, obj):
        return time_to_str(obj.update_time)

    def get_create_timestamp(self, obj):
        return dt_to_timestamp(obj.create_time)

    def get_update_timestamp(self, obj):
        return dt_to_timestamp(obj.update_time)


class BaseOrgModelSerializer(BaseModelSerializer):
    org_id = serializers.IntegerField()

    class Meta:
        model = BaseOrgModel
        exclude = ('is_deleted', 'update_time', 'update_timestamp')
