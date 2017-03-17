from django.core.management import BaseCommand
from django.db.models import get_models
import psycopg2
import inspect
from django.conf import settings
import logging
from common.models import BaseModel, BaseOrgModel
from common.utils import shard_id
log = logging.getLogger(__name__)


def get_tables(db_settings):
    sql = """SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"""
    sql2 = """SELECT * FROM %s LIMIT 0;"""
    conn_string = \
        "host='%s' dbname='%s' user='%s' password='%s'" \
        % tuple(db_settings[k] for k in ['HOST', 'NAME', 'USER', 'PASSWORD'])

    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()
    cursor.execute(sql)
    results = {i[0]: [] for i in cursor.fetchall()}
    for t in results.keys():
        cursor.execute(sql2 % t)
        for desc in cursor.description:
            results[t].append(desc[0])
    cursor.close()
    conn.commit()
    conn.close()
    print('''--DB: %s, tables(%s):\n%s\n''' % (conn_string, len(results), sorted(results.keys())))
    return results


def get_default_tables():
    return get_tables(settings.DATABASES['default'])


def get_org_tables():
    return get_tables(settings.DATABASES[shard_id(1)])


class Command(BaseCommand):
    SQL = """UPDATE "%s" SET "%s" = to_timestamp(%s);"""
    # update project_task set create_time=to_timestamp(date_added);
    FIELDS = \
        {'create_time': ['date_added', 'date_created', 'create_at'],
         'update_time': ['date_updated', 'update_at', 'last_updated']
         }
    # 'date_added', 'date_updated', 'update_at', 'date_created', 'last_updated','create_at'

    def run(self, is_run, db_main=True, db_org=True):
        default_tables_dict = get_default_tables() if db_main else {}
        org_tables_dict = get_org_tables() if db_org else {}

        hits_default_dict = {}
        hits_org_dict = {}
        skip_model_tables = []
        for m in get_models():
            t = m._meta.db_table
            skip = BaseModel not in inspect.getmro(m)
            print('==%s== %-30s %-35s ' % ('S' if skip else ' ', m.__name__, t))

            if skip:
                skip_model_tables.append((m.__name__, t))
                continue

            if db_main and t in default_tables_dict.keys():
                hits_default_dict[t] = []
                for k, v in self.FIELDS.items():
                    hits_default_dict[t] += [(k, s) for s in v if s in default_tables_dict[t]]
            if db_org and t in org_tables_dict.keys():
                hits_org_dict[t] = []
                for k, v in self.FIELDS.items():
                    hits_org_dict[t] += [(k, s) for s in v if s in org_tables_dict[t]]

        print('Skip Models and Tables: \n')
        for _m, _t in skip_model_tables:
            print('%-35s %-35s' % (_m, _t))

        if db_main:
            hit_default = hits_default_dict.keys()
            print('\nModels hit in main db:', len(hit_default))
            for k, v in sorted(hits_default_dict.items()):
                print('%-35s RUN: %s' % (k, v))
        if db_org:
            hit_org = hits_org_dict.keys()
            print('\nModels hit in org db:', len(hit_org))
            for k, v in sorted(hits_org_dict.items()):
                print('%-35s RUN: %s' % (k, v))

        c = input('Input c to continue...')
        if c != 'c':
            return c

        if db_main:
            for t, l in sorted(hits_default_dict.items()):
                if l:
                    sql = '\n'.join([(self.SQL % (t, n, o)) for n, o in l])
                    MainDB(sql, is_run).doit()

        if db_org:
            for t, l in (hits_org_dict.items()):
                if l:
                    sql = '\n'.join([(self.SQL % (t, n, o)) for n, o in l])
                    OrgDB(sql, is_run).doit()

    def handle(self, *args, **options):
        db, sql = None, None
        _args = list(args)
        is_run = '~run' in _args
        if is_run:
            _args.remove('~run')

        if not self.run(is_run, 'main' in _args, 'org' in _args):
            if not is_run:
                print('''add ~run to EXECUTE ''')
            else:
                print('--Finished!')


class BaseDB(object):
    def __init__(self, sql, is_run=False):
        self.sql = sql
        self.is_run = is_run
        print('''\n
=====================================
do migration for SQL:
%s
======================================''' % self.sql)

    def doit(self):
        pass

    def _do(self, db_settings):
        conn_string = \
            "host='%s' dbname='%s' user='%s' password='%s'" \
            % tuple(db_settings[k] for k in ['HOST', 'NAME', 'USER', 'PASSWORD'])

        print("--DB: %s" % conn_string)
        if not self.is_run:
            return
        try:
            conn = psycopg2.connect(conn_string)
            cursor = conn.cursor()
            cursor.execute(self.sql)
            cursor.close()
            conn.commit()
        except Exception as e:
            print(e)
            c = input('Input c to continue...')
            if c != 'c':
                raise e
        finally:
            conn.close()


class MainDB(BaseDB):
    def doit(self):
        self._do(settings.DATABASES['default'])


class OrgDB(BaseDB):
    def doit(self):
        for k in sorted(settings.DATABASES.keys()):
            if k != 'default':
                self._do(settings.DATABASES[k])
