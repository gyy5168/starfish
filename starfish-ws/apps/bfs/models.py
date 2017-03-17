from django.conf import settings
from django.db import models
from django.core.cache import cache
from django.core.files.storage import FileSystemStorage

from common import models as _models
from common.utils import shard_id


class BfsFile(_models.BaseOrgModel, _models.FileModelsMixin):
    CHUNK_SIZE = 1024 * 1024

    DEFAULT_CACHE_TIMEOUT = 86400

    check_sum_type = models.PositiveSmallIntegerField()
    check_sum_value = models.CharField(max_length=128)
    size = models.PositiveIntegerField(default=0)
    filepath = models.CharField(max_length=128, default='')
    is_missing_chunks = models.PositiveSmallIntegerField(default=1)

    fs = FileSystemStorage(location=settings.FS_ROOT)

    @classmethod
    def get(cls, id_, org_id):
        return BfsFile.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=id_, is_missing_chunks=0)

    @classmethod
    def is_created_by(cls, id_, user_id, org_id):
        return bool(cache.get(cls._cache_key(id_, user_id, org_id)))

    @classmethod
    def add_created_log(cls, id_, user_id, org_id):
        cache.set(
            cls._cache_key(id_, user_id, org_id),
            'V',
            cls.DEFAULT_CACHE_TIMEOUT)

    @classmethod
    def _cache_key(cls, id_, user_id, org_id):
        return 'bfs_create_file_log:%s_%s_%s' % (
            user_id,
            org_id,
            id_
        )

    class Meta:
        db_table = 'bfs_file'
        index_together = [['check_sum_type', 'check_sum_value']]


class BfsChunk(_models.SimpleBaseOrgModel):
    file_id = _models.PositiveBigIntegerField()
    sn = models.PositiveIntegerField()

    class Meta:
        db_table = 'bfs_chunk'
        unique_together = ('file_id', 'sn')
