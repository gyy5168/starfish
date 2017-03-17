from django.core.management import BaseCommand
import psycopg2
from django.conf import settings

import logging
log = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        db, sql = None, None
        _args = list(args)
        is_run = '~run' in _args
        if is_run:
            _args.remove('~run')

        if len(_args) == 1:
            path = _args[0].strip()
            if path.endswith('.py'):
                path = path[:-3]
            path = path.replace('/', '.')

            import importlib
            f = importlib.import_module(path)
            db, sql = f.db, f.sql
        elif len(_args) == 2:
            db, sql = _args

        if db is None or sql is None:
            print(
                '''
                python manage.py runsql [apps/module/migrations/filename]
                    OR
                python manage.py runsql [db-type(main/org)] [your sql]
                '''
                )
            return

        if db == 'main':
            MainDB(sql, is_run).doit()
        elif db == 'org':
            OrgDB(sql, is_run).doit()
        else:
            print('unknown db name %s' % db)
            return

        if not is_run:
            print('''
CHECK sql & db settings, and use
python manage.py %s ~run
to EXECUTE sql to DB '''
                  % ' '.join(_args))
        else:
            print('--Finished!')


class BaseDB(object):
    def __init__(self, sql, is_run=False):
        self.sql = sql
        self.is_run = is_run
        print('''
=====================================
do migration for SQL:
%s
======================================''' % self.sql)

    def doit(self):
        pass

    def _do(self, db_settings):
        conn_string = \
            "host='%s' port='%s' dbname='%s' user='%s' password='%s'" \
            % tuple(db_settings[k] for k in ['HOST', 'PORT', 'NAME', 'USER', 'PASSWORD'])

        print("--DB: %s" % conn_string)
        if not self.is_run:
            return

        conn = psycopg2.connect(conn_string)
        cursor = conn.cursor()
        cursor.execute(self.sql)
        cursor.close()
        conn.commit()
        conn.close()


class MainDB(BaseDB):
    def doit(self):
        self._do(settings.DATABASES['default'])


class OrgDB(BaseDB):
    def doit(self):
        skip_all_error = False

        for k in sorted(settings.DATABASES.keys()):
            if k != settings.READ_ONLY_MAIN_DB and k != settings.READ_WRITE_MAIN_DB:
                try:
                    self._do(settings.DATABASES[k])
                except Exception as e:
                    if skip_all_error:
                        continue

                    c = input('error: %s\n\npress C to continue\npress S to skip all errors' % e)
                    if c.lower() == 'c':
                        continue
                    elif c.lower() == 's':
                        skip_all_error = True
                        continue
                    else:
                        break
