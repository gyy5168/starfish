import uuid
import zipfile

from datetime import datetime
from random import randint
from collections import deque
from django.http import HttpResponseNotFound
from django.conf import settings
from rest_framework.response import Response

from apps.fs.models import File, FileExistsError, BadTargetError
from apps.bfs.models import BfsFile

from common.const import ErrorCode
from common.utils import shard_id, AttachmentView, ensure_dir_exists, check_bfs_file_permission
from common.viewset import ViewSet

import logging
log = logging.getLogger(__name__)


class FileViewSet(ViewSet):
    def create(self, request, org_id):
        bfs_file = self._has_bfs_file(request, org_id)
        if not bfs_file:
            return self._create_dir(request, org_id)

        r = check_bfs_file_permission(request.current_uid, org_id, bfs_file)
        if r:
            return r

        return self._create_file(request, org_id, bfs_file)

    def list(self, request, org_id):
        if 'fullpath' in request.GET:
            return self._search_by_fullpath(request, org_id)

        return self.list_dir(request, org_id)

    def _search_by_fullpath(self, request, org_id):
        parts = None
        if request.GET['fullpath'][-1] == '/':
            parts = request.GET['fullpath'].split('/')[1:-1]
        else:
            parts = request.GET['fullpath'].split('/')[1:]

        parent, f = 0, None
        for p in parts:
            f = File.objects \
                .using(shard_id(org_id)) \
                .get_or_none(parent=parent, name=p)
            if not f:
                break

            parent = f.id

        if not f:
            return Response({'errcode': ErrorCode.OK, 'data': {}})

        return Response({'errcode': ErrorCode.OK, 'data': f.to_dict()})

    def list_dir(self, request, org_id):
        _dir = self._normalize_dir(request.GET.get('dir', '/'))
        parent = 0
        for i in _dir.split('/')[1:-1]:
            f = File.objects \
                .using(shard_id(org_id)) \
                .get_or_none(parent=parent, name=i)
            if not f:
                return Response({'errcode': ErrorCode.NO_SUCH_DIR})

            parent = f.id

        return self.list_dir0(request, org_id, parent)

    def list_dir0(self, request, org_id, parent):
        qs = File.objects \
            .using(shard_id(org_id)) \
            .filter(parent=parent)

        if 'dir_only' in request.GET:
            qs = qs.filter(is_file=0)

        files = qs.order_by('is_file', '-date_updated', 'name')

        return Response({
            'errcode': ErrorCode.OK,
            'data': [i.to_dict() for i in files]})

    def retrieve(self, request, org_id, file_id):
        if isinstance(file_id, int):
            file_ids = [file_id]
        else:
            file_ids = [int(i) for i in file_id.split(',') if i]

        files = File.objects \
            .using(shard_id(org_id)) \
            .filter(id__in=file_ids)

        return Response({
            'errcode': ErrorCode.OK,
            'data': [f.to_dict() for f in files]})

    def destroy(self, request, org_id, file_id):
        if isinstance(file_id, int):
            file_ids = [file_id]
        else:
            file_ids = [int(i) for i in file_id.split(',') if i]

        for file_id in file_ids:
            r = self._destroy0(request, org_id, file_id)
            if r:
                return r

        return Response({'errcode': ErrorCode.OK})

    def _destroy0(self, request, org_id, file_id):
        f = File.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=file_id)
        if not f:
            return Response({'errcode': ErrorCode.NO_SUCH_FILE})

        root_dir = self._get_root_dir(request, org_id, f)
        if not root_dir:
            raise ValueError()

        if root_dir.is_system:
            return Response({'errcode': ErrorCode.FILE_IS_READ_ONLY})

        if f.is_file:
            f.delete()
        else:
            self._rm_dir_recursively(request, org_id, f)

    def _rm_dir_recursively(self, request, org_id, f):
        file_ids_list, file_ids_queue = [], deque([f.id])
        while file_ids_queue:
            fid = file_ids_queue.popleft()
            file_ids_queue.extend(
                File.objects
                .using(shard_id(org_id))
                .filter(parent=fid)
                .values_list('id', flat=True))

            file_ids_list.append(fid)

        File.objects \
            .using(shard_id(org_id)) \
            .filter(id__in=file_ids_list) \
            .delete()

    def partial_update(self, request, org_id, file_id):
        if 'name' not in request.DATA and 'parent' not in request.DATA:
            raise ValueError()

        if isinstance(file_id, int):
            file_ids = [file_id]
        else:
            file_ids = [int(i) for i in file_id.split(',') if i]

        files = File.objects \
            .using(shard_id(org_id)) \
            .filter(id__in=file_ids)
        if not files:
            return Response({'errcode': ErrorCode.NO_SUCH_FILE})

        for f in files:
            root_dir = self._get_root_dir(request, org_id, f)
            if not root_dir:
                raise ValueError()

            if root_dir.is_system:
                return Response({'errcode': ErrorCode.FILE_IS_READ_ONLY})

        if 'name' in request.DATA:
            r = self._validate_name(request.DATA['name'])
            if r:
                return r

            return self._rename(request, org_id, files[0], request.DATA['name'])

        if 'parent' in request.DATA:
            r = self._validate_name(request.DATA['parent'])
            if r:
                return r

            return self._move(request, org_id, files)

    def _validate_name(self, name):
        if not self._is_validate_name(name):
            return Response({'errcode': ErrorCode.INVALID_FILENAME})

        if name.startswith('/%s/' % File.TASK_ATTACHMENT_DIRNAME) \
                or name.startswith('/%s/' % File.EMAIL_ATTACHMENT_DIRNAME):
            return Response({'errcode': ErrorCode.FILE_IS_READ_ONLY})

        return None

    def _rename(self, request, org_id, f, new_name):
        log.info('rename %s to %s', f.fullpath(), new_name)

        if f.is_file:
            try:
                return Response({
                    'errcode': ErrorCode.OK,
                    'data': self._rename_file(request, org_id, f, new_name)})
            except FileExistsError:
                return Response({'errcode': ErrorCode.FILE_EXISTS})

        return Response({
            'errcode': ErrorCode.OK,
            'data': self._rename_dir(request, org_id, f, new_name)})

    def _rename_file(self, request, org_id, f, new_name):
        # create new file
        _f, created = File.objects \
            .using(shard_id(org_id)) \
            .get_or_create(
                name=new_name.split('/')[-1],
                parent=self._save_dir(request, org_id, new_name),
                defaults={
                    'creator': request.current_uid,
                    'size': f.size,
                    'filepath': f.filepath,
                    'is_file': 1,
                    'is_system': 0})

        if not created:
            raise FileExistsError()

        # rm original file
        f.delete()

        return _f.to_dict()

    def _rename_dir(self, request, org_id, f, new_name):
        if not self._validate_target_dir(f.fullpath(), new_name):
            raise BadTargetError()

        r = self._save_dir(request, org_id, self._normalize_dir(new_name))

        # mv files
        File.objects \
            .using(shard_id(org_id)) \
            .filter(parent=f.id) \
            .update(parent=r)

        # rm original dir
        f.delete()

        return File.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=r).to_dict()

    def _move(self, request, org_id, files):
        ret = []
        for f in files:
            if f.is_file:
                try:
                    ret.append(self._rename_file(
                        request, org_id, f,
                        '%s%s' % (self._normalize_dir(request.DATA['parent']), f.name)))
                except FileExistsError:
                    return Response({'errcode': ErrorCode.FILE_EXISTS})
            else:
                try:
                    ret.append(self._rename_dir(
                        request, org_id, f,
                        '%s%s' % (self._normalize_dir(request.DATA['parent']), f.name)))
                except BadTargetError:
                    return Response({'errcode': ErrorCode.INVALID_TARGET})

        return Response({'errcode': ErrorCode.OK, 'data': ret})

    def _validate_target_dir(self, src, dest):
        return not self._normalize_dir(dest).startswith(self._normalize_dir(src))

    def _create_dir(self, request, org_id):
        name = self._normalize_dir(request.DATA['name'])
        if name.startswith('/%s/' % File.TASK_ATTACHMENT_DIRNAME) \
                or name.startswith('/%s/' % File.EMAIL_ATTACHMENT_DIRNAME):
            return Response({'errcode': ErrorCode.FILE_IS_READ_ONLY})

        if not self._is_validate_name(name):
            return Response({'errcode': ErrorCode.INVALID_FILENAME})

        id_, created = self._save_dir(request, org_id, name, True)
        if not created:
            return Response({'errcode': ErrorCode.DIR_EXISTS})

        r = File.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=id_)
        return Response({'errcode': ErrorCode.OK, 'data': r.to_dict()})

    def _create_file(self, request, org_id, bfs_file):
        name = request.DATA['name']
        if name.startswith('/%s/' % File.TASK_ATTACHMENT_DIRNAME) \
                or name.startswith('/%s/' % File.EMAIL_ATTACHMENT_DIRNAME):
            return Response({'errcode': ErrorCode.FILE_IS_READ_ONLY})

        if not self._is_validate_name(name):
            return Response({'errcode': ErrorCode.INVALID_FILENAME})

        return self._save_file(
            request, org_id, name,
            self._save_dir(request, org_id, name),
            bfs_file)

    def _save_dir(self, request, org_id, dirname, return_created=False):
        parent, created = 0, True
        for i in dirname.split('/')[1:-1]:
            d, created = File.objects \
                .using(shard_id(org_id)) \
                .get_or_create(
                    name=i,
                    parent=parent,
                    defaults={
                        'creator': request.current_uid,
                        'is_file': 0,
                        'is_system': 0}
                )
            parent = d.id

        if return_created:
            return (parent, created)

        return parent

    def _save_file(self, request, org_id, name, parent, bfs_file):
        f, created = File.objects \
            .using(shard_id(org_id)) \
            .get_or_create(
                name=name.split('/')[-1],
                parent=parent,
                defaults={
                    'creator': request.current_uid,
                    'size': bfs_file.size,
                    'filepath': bfs_file.filepath,
                    'is_file': 1,
                    'is_system': 0})

        if not created:
            if not request.DATA.get('replace', 0):
                return Response({
                    'errcode': ErrorCode.FILE_EXISTS,
                    'data': {'suggested_name': f.suggested_name()}})

            return self._replace(request, org_id, f, bfs_file)

        return Response({'errcode': ErrorCode.OK, 'data': f.to_dict()})

    def _replace(self, request, org_id, f, bfs_file):
        f.filepath = bfs_file.filepath
        f.size = bfs_file.size

        f.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': f.to_dict()})

    def _has_bfs_file(self, request, org_id):
        if 'bfs_file_id' in request.DATA:
            return BfsFile.get(request.DATA['bfs_file_id'], org_id)

        return None

    def _get_root_dir(self, request, org_id, f):
        max_level = 64
        for i in range(max_level):
            if not f.parent:
                return f

            f = File.objects \
                .using(shard_id(org_id)) \
                .get_or_none(id=f.parent)

        return None

    def _is_validate_name(self, name):
        return name and name[0] == '/' and name.find('/.') == -1

    def _normalize_dir(self, name):
        if name[-1] != '/':
            name += '/'

        return name


class DownloadView(AttachmentView):
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

        return self._build_attachment_response(request, f.name, File.full_path(f.filepath))


class BundleDownloadView(DownloadView):
    BUNDLE_NAME = 'Starfish-批量下载.zip'

    BUNDLE_TEMP_DIR = '%s/temp/bundle' % settings.FS_ROOT

    def get(self, request, org_id, file_id):
        if isinstance(file_id, int):
            file_ids = [file_id]
        else:
            file_ids = [int(i) for i in file_id.split(',') if i]

        files = File.objects \
            .using(shard_id(org_id)) \
            .filter(id__in=file_ids)

        if len(files) < 1:
            raise ValueError('invalid args, no such file')

        if len(files) == 1 and files[0].is_file:
            return super(BundleDownloadView, self).get(request, org_id, file_ids[0])

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
