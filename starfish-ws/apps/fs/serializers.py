from rest_framework import serializers
from apps.fs.models import File
import magic
from common.const import FilePermission
from common.globals import get_current_user_id


class FileSerializer(serializers.ModelSerializer):
    mimetype = serializers.SerializerMethodField('get_mimetype')
    permissions = serializers.SerializerMethodField('get_permissions')
    all_parents = serializers.SerializerMethodField('get_all_parents')
    contain_dirs = serializers.IntegerField(source='contain_dirs')

    class Meta:
        model = File

    def get_mimetype(self, obj):
        if obj.is_file:
            return str(magic.from_file(File.full_path(obj.filepath), mime=True), 'utf8')
        else:
            return ''

    def get_permissions(self, obj):
        user_id = get_current_user_id()
        if user_id:
            return FilePermission.list(obj.user_perm(user_id))
        else:
            return []

    def get_all_parents(self, obj):
        names, ids, parent = [], [], obj.parent
        while parent:
            f = File.objects.using(obj.org_id).getx(id=parent)
            names.insert(0, f.name)
            ids.insert(0, f.id)
            parent = f.parent

        return {"names": names, "ids": ids}


class FileSimpleSerializer(FileSerializer):
    class Meta:
        model = File
        fields = ('id', 'name', 'parent', 'is_file',
                  'size', 'date_updated', 'permissions', 'mimetype', 'contain_dirs')


class FileDetailSerializer(FileSimpleSerializer):
    class Meta:
        model = File
        fields = FileSimpleSerializer.Meta.fields + ('all_parents',)