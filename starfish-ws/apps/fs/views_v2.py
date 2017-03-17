import uuid
import zipfile

from datetime import datetime
from random import randint
from collections import deque
from django.http import HttpResponseNotFound, HttpResponseForbidden
from django.conf import settings
from rest_framework.response import Response

from apps.fs.models import File, FileRole
from apps.bfs.models import BfsFile
from apps.fs.serializers import FileDetailSerializer, FileSimpleSerializer

from common.const import ErrorCode, FilePermission, PresetFileRole
from common.exceptions import APIError
from common.utils import shard_id, AttachmentView, ensure_dir_exists, check_bfs_file_permission, \
    current_timestamp, setattr_if_changed
from common.viewset import ViewSet

import logging
log = logging.getLogger(__name__)


class FilePermissionMixin(object):
    def _get_permitted_files_from_request(self, request, org_id, file_id):
        if isinstance(file_id, int):
            file_ids = [file_id]
        else:
            file_ids = [int(i) for i in file_id.split(',') if i]

        if len(file_ids) == 0:
            raise APIError(ErrorCode.NO_SUCH_FILE, file_id=file_id)

        files = File.permitted_files(org_id, request.current_uid)\
            .filter(id__in=file_ids)

        if files.count() < len(file_ids):
            raise APIError(ErrorCode.PERMISSION_DENIED, file_ids=file_ids,
                           permitted_files=list(files.values_list('id', flat=True)))
        return files

    def set_file_perm_for_creator(self, f, request):
        FileRole.set_by_preset(f,
                               request.current_uid,
                               FileRole.TYPE_ORG_MEMBER,
                               request.current_user.name,
                               PresetFileRole.CONTROLLER)

    def set_file_perm_by_request(self, f, request, inherit_parent=False):
        if not f.is_permitted(request.current_uid, FilePermission.CONTROL):
            raise APIError(ErrorCode.PERMISSION_DENIED)

        roles = request.DATA.get('roles', [])

        if f.parent is not 0:
            parent_roles = FileRole.objects.using(f.org_id).filter(file=f.parent)
            # parent_role_target = [(r.owner_type, r.owner) for r in parent_roles]
            #
            # for r in roles:
            #     if (r['owner'], r['owner_type']) not in parent_role_target:
            #         raise APIError(ErrorCode.FILE_ROLE_NOT_SET,
            #                        owner_type=r['owner_type'], owner=r['owner'])

            if not roles and inherit_parent:
                for r in parent_roles:
                    role = PresetFileRole.role_by_perm(r.perm_val)
                    if role == PresetFileRole.CONTROLLER:
                        role == PresetFileRole.EDITOR
                    roles.append(dict(owner=r.owner, owner_type=r.owner_type,
                                      name=r.name, role=role))

        for r in roles:
            owner, owner_type, role, name = r['owner'], r['owner_type'], r['role'], r['name']
            if role == PresetFileRole.CONTROLLER:
                FileRole.set_by_preset(f, request.current_uid,
                                       FileRole.TYPE_ORG_MEMBER,
                                       request.current_user.name,
                                       PresetFileRole.EDITOR)

            FileRole.set_by_preset(f, owner, owner_type, name, role)


class FileViewSet(ViewSet, FilePermissionMixin):

    def create(self, request, org_id):
        name, parent = request.DATA['name'], request.DATA['parent']
        if parent:
            fp = File.objects.using(org_id).getx(id=parent)
            if not fp.is_permitted(request.current_uid, FilePermission.UPLOAD):
                raise APIError(ErrorCode.PERMISSION_DENIED,
                               file_id=parent, permission=FilePermission.UPLOAD)
            if fp.is_file:
                raise APIError(ErrorCode.NO_SUCH_DIR, file_id=parent)

        self._validate_name(org_id, parent, name)

        if 'bfs_file_id' not in request.DATA:  # create dir
            return self._create_dir(request, org_id, parent, name)
        else:  # create file
            bfs = BfsFile.get(request.DATA['bfs_file_id'], org_id)
            check_bfs_file_permission(request.current_uid, org_id, bfs)
            return self._create_file(request, org_id, parent, name, bfs)

    def list(self, request, org_id):
        parent = int(request.GET.get('parent', 0))
        dir_only = int(request.GET.get('dir_only', 0))
        order_by = request.GET.getlist('order_by')
        as_role = request.GET.get('as_role')
        perm_name = request.GET.get('perm')

        if parent:
            parent_dir = File.objects.using(org_id).getx(id=parent)
            if not (parent_dir and parent_dir.is_permitted(request.current_uid,
                                                           FilePermission.VIEW)):
                raise APIError(ErrorCode.PERMISSION_DENIED)
        else:
            parent_dir = None  # root dir

        # log.info('trace_502, 1, %s, %s' % (request.current_uid, parent))
        files = File.permitted_files(org_id, request.current_uid,
                                     parent=parent, as_role=as_role, perm_name=perm_name)
        # log.info('trace_502, 2, %s, %s' % (request.current_uid, parent))
        if dir_only:
            files = files.filter(is_file=0)

        if order_by:
            files = files.order_by(*order_by)
        else:
            files = files.order_by('is_file', '-date_updated', 'name')

        files = self.paging(request, files, default_count=self.MAX_PAGE_COUNT)
        # log.info('trace_502, 3, %s, %s' % (request.current_uid, parent))
        data = FileDetailSerializer(parent_dir).data if parent_dir else {}
        # log.info('trace_502, 4, %s, %s' % (request.current_uid, parent))
        data['children'] = FileSimpleSerializer(files, many=True).data
        # log.info('trace_502, 5, %s, %s' % (request.current_uid, parent))
        return Response({'errcode': ErrorCode.OK, 'data': data})

    def retrieve(self, request, org_id, file_id):
        files = self._get_permitted_files_from_request(request, org_id, file_id)

        data = FileDetailSerializer(files, many=True).data
        return Response({
            'errcode': ErrorCode.OK,
            'data': data
        })

    def destroy(self, request, org_id, file_id):
        files = self._get_permitted_files_from_request(request, org_id, file_id)

        for f in files:
            if not f.is_permitted(request.current_uid, FilePermission.DELETE):
                raise APIError(ErrorCode.PERMISSION_DENIED,
                               file_id=f.id, permission=FilePermission.DELETE)
        for f in files:
            f.remove()

        return Response({'errcode': ErrorCode.OK})

    def partial_update(self, request, org_id, file_id):
        if 'name' in request.DATA:  # rename
            return self.rename(request, org_id, file_id)

        elif 'parent' in request.DATA:  # move
            return self.move(request, org_id, file_id)
        else:
            raise APIError(ErrorCode.UNKNOWN_ERROR)

    def rename(self, request, org_id, file_id):
        files = self._get_permitted_files_from_request(request, org_id, file_id)
        f = files[0]
        new_name = request.DATA['name']

        if not f.is_permitted(request.current_uid, FilePermission.RENAME):
            raise APIError(ErrorCode.PERMISSION_DENIED,
                           file_id=f.id, permission=FilePermission.RENAME)

        self._validate_name(org_id, f.parent, new_name)
        self._unique_file_name(org_id, f.parent, new_name)
        f.name = new_name
        f.save()
        return Response({'errcode': ErrorCode.OK,
                         'data': FileSimpleSerializer(f).data})

    def move(self, request, org_id, file_id):
        parent = int(request.DATA['parent'])  # can be 0
        if parent:
            if parent == file_id:
                raise APIError(ErrorCode.MOVE_DIR_ERROR, file_id=parent)

            fp = File.objects.using(org_id).getx(id=parent)
            if file_id in [f.id for f in fp.parents()]:
                raise APIError(ErrorCode.MOVE_DIR_ERROR, file_id=file_id, parent=parent)

            if not fp.is_permitted(request.current_uid, FilePermission.UPLOAD):
                raise APIError(ErrorCode.PERMISSION_DENIED,
                               file_id=parent, permission=FilePermission.UPLOAD)
            if fp.is_file:
                raise APIError(ErrorCode.NO_SUCH_DIR, file_id=parent)

        results = []
        files = self._get_permitted_files_from_request(request, org_id, file_id)
        for i, f in enumerate(files):
            error_code = ErrorCode.OK
            try:
                if not f.is_permitted(request.current_uid, FilePermission.DELETE):
                    raise APIError(ErrorCode.PERMISSION_DENIED)

                existed = File.find(org_id, parent, f.name)
                if existed:
                    if not existed.is_permitted(request.current_uid, FilePermission.DELETE):
                        raise APIError(ErrorCode.PERMISSION_DENIED)

                    if existed.is_file != f.is_file:
                        raise APIError(ErrorCode.FILE_DIR_REPLACE_ERROR)

                    if not int(request.DATA.get('replace', 0)):
                        raise APIError(
                            ErrorCode.FILE_EXISTS if f.is_file else ErrorCode.DIR_EXISTS
                        )

                    existed.remove()

                if setattr_if_changed(f, parent=parent):
                    f.save()

            except APIError as e:
                error_code = e.error_code

            results.append({"errcode": error_code, "id": f.id})

        return Response({'errcode': ErrorCode.OK, 'data': results})

    # implement
    def _validate_name(self, org_id, parent, name):
        if not (name and name.find('/') == -1):
            raise APIError(ErrorCode.INVALID_FILENAME, name=name)

    def _unique_file_name(self, org_id, parent, name):
        if File.find(org_id, parent, name):
            raise APIError(ErrorCode.FILE_EXISTS,
                           org_id=org_id, parent=parent, name=name)

    def _create_dir(self, request, org_id, parent, name):
        self._unique_file_name(org_id, parent, name)
        d, created = File.objects.using(org_id) \
            .get_or_create(parent=parent, name=name,
                           defaults={'creator': request.current_uid, 'is_file': 0})
        if not created:
            raise APIError(ErrorCode.DIR_EXISTS, file_id=d.id)

        self.set_file_perm_for_creator(d, request)
        self.set_file_perm_by_request(d, request)
        return Response({'errcode': ErrorCode.OK, 'data': FileSimpleSerializer(d).data})

    def _create_file(self, request, org_id, parent, name, bfs_file):
        f, created = File.objects.using(org_id) \
            .get_or_create(parent=parent, name=name,
                           defaults={'creator': request.current_uid,
                                     'filepath': bfs_file.filepath,
                                     'size': bfs_file.size,
                                     'is_file': 1})
        if not created:
            if int(request.DATA.get('replace', 0)) is 0 or \
                    not f.is_permitted(request.current_uid, FilePermission.DELETE):
                return Response({
                    'errcode': ErrorCode.FILE_EXISTS,
                    'data': {'suggested_name': f.suggested_name()}})
            elif setattr_if_changed(f, filepath=bfs_file.filepath, size=bfs_file.size):
                f.save()
        else:
            # only set perm for creator when file is new created
            self.set_file_perm_for_creator(f, request)

        self.set_file_perm_by_request(f, request, True)
        return Response({'errcode': ErrorCode.OK, 'data': FileSimpleSerializer(f).data})


class FileCheckViewSet(ViewSet, FilePermissionMixin):
    def check_file_exists(self, request, org_id):
        parent = int(request.GET['parent'])  # can be 0
        if parent:
            fp = File.objects.using(org_id).getx(id=parent)
            if not fp.is_permitted(request.current_uid, FilePermission.VIEW):
                raise APIError(ErrorCode.PERMISSION_DENIED,
                               file_id=parent, permission=FilePermission.VIEW)
        data = []
        for name in request.GET.getlist('name'):
            r = {"name": name}
            f = File.find(org_id, parent, name)
            if f:
                r.update(id=f.id, is_file=f.is_file)
            data.append(r)
        return Response({'errcode': ErrorCode.OK, 'data': data})


class FileRoleViewSet(ViewSet, FilePermissionMixin):
    def create(self, request, org_id):
        f = File.objects.using(org_id).getx(id=request.DATA['file_id'])
        self.set_file_perm_by_request(f, request)
        return Response({'errcode': ErrorCode.OK})

    def list(self, request, org_id):
        f = File.objects.using(org_id).getx(id=request.GET['file_id'])
        # if not f.is_permitted(request.current_uid, FilePermission.CONTROL):
        #     raise APIError(ErrorCode.PERMISSION_DENIED)

        roles = FileRole.objects.using(org_id).filter(file=f)
        if 'q' in request.GET:
            roles = roles.filter(name__icontains=request.GET['q'])
        if 'role' in request.GET:
            roles = roles.filter(perm=PresetFileRole.perm_by_role(request.GET['role']))

        return Response({'errcode': ErrorCode.OK, 'data': [r.to_dict() for r in roles]})


class DownloadView(AttachmentView, FilePermissionMixin):
    def get(self, request, org_id, file_id):
        try:
            return self._get(request, org_id, file_id)
        except Exception as exc:
            log.exception(exc)
            return self._build_json_response(errcode=ErrorCode.UNKNOWN_ERROR)

    def _get(self, request, org_id, file_id):
        f = File.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=file_id, is_file=1)

        if not f:
            return HttpResponseNotFound()
        if not f.is_permitted(request.current_uid, FilePermission.DOWNLOAD):
            return HttpResponseForbidden()

        return self._build_attachment_response(request, f.name, File.full_path(f.filepath))


class BundleDownloadView(DownloadView):
    BUNDLE_NAME = 'Starfish-批量下载.zip'

    BUNDLE_TEMP_DIR = '%s/temp/bundle' % settings.FS_ROOT

    def get(self, request, org_id, file_id):
        files = self._get_permitted_files_from_request(request, org_id, file_id)

        for f in files:
            if not f.is_permitted(request.current_uid, FilePermission.DOWNLOAD):
                return HttpResponseForbidden()

        if files.count() == 1 and files[0].is_file:
            return super(BundleDownloadView, self).get(request, org_id, files[0].id)

        return self._bundle0(request, org_id, files)

    def _bundle0(self, request, org_id, files):
        files_queue = deque(files)

        tmp = '%s/%s/%08d/%s.zip' % (
            self.BUNDLE_TEMP_DIR,
            datetime.strftime(datetime.now(), '%Y-%m-%d'),
            randint(0, 99999999),
            uuid.uuid4())
        ensure_dir_exists(tmp)

        with zipfile.ZipFile(tmp, 'w') as f:
            while files_queue:
                _f = files_queue.popleft()
                if _f.is_file:
                    f.write(File.full_path(_f.filepath), '%s/%s' % (_f.path(), _f.name))
                else:
                    zif = zipfile.ZipInfo('%s/%s/' % (_f.path(), _f.name))
                    f.writestr(zif, '')

                files_queue.extend(
                    File.objects
                    .using(shard_id(org_id))
                    .filter(parent=_f.id))

        return self._build_attachment_response(request, self.BUNDLE_NAME, tmp)
