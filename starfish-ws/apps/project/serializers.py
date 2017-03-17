from rest_framework import serializers
from apps.account.models import User
from apps.project.models import TaskOperation
from common.utils import dt_to_timestamp, TargetObject


class TaskOperationSerializer(serializers.ModelSerializer):
    operator = serializers.SerializerMethodField('get_operator')
    content = serializers.SerializerMethodField('get_content')
    create_time = serializers.SerializerMethodField('get_create_timestamp')

    class Meta:
        model = TaskOperation
        fields = ('id', 'create_time', 'operator', 'operation_code', 'content')

    def get_operator(self, obj):
        user = User.objects.getx(id=obj.operator)
        if user:
            return {'id': user.id, 'name': user.name, 'avatar_url': user.avatar_url}

    def get_content(self, obj):
        content = obj.content  # return a dict for JsonField, otherwise json string by default
        if obj.operation_code == TaskOperation.UPDATE_TASK_ATTRIBUTE:
            if content['field'] == 'assignee':
                _t = TargetObject()
                content['before_info'] = _t.obj_info(User, content['before'])
                content['after_info'] = _t.obj_info(User, content['after'])

        return content

    def get_create_timestamp(self, obj):
        return dt_to_timestamp(obj.create_time)
