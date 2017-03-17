from django.conf import settings
from starfish import is_org_model


class ReadWriteRouter(object):
    """
    A router to control database read/write operations of main db on models.
    A manually specified database allocation will take priority over a database allocated by a router.
    """
    def _check_is_org_model(self, model, **hints):
        if is_org_model(model):
            return True

        instance = hints.get('instance')
        if instance and is_org_model(type(instance)):
            return True

        return False

    def db_for_read(self, model, **hints):
        """
        Attempts to read from main database.
        queryset.using(db) will not run into here,
        so only main db read should specific read_only db
        """
        suggestion = None
        if not self._check_is_org_model(model, **hints):
            from common.globals import is_read_from_readwrite
            if is_read_from_readwrite():
                suggestion = settings.READ_WRITE_MAIN_DB
            else:
                suggestion = settings.READ_ONLY_MAIN_DB
        return suggestion

    def db_for_write(self, model, **hints):
        """
        Attempts to write from main database.
        !!!!
         Message(**kwargs).save(using=db) will not run into here.
        !!!!
        """
        suggestion = None
        if not self._check_is_org_model(model, **hints):
            suggestion = settings.READ_WRITE_MAIN_DB
        return suggestion

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the database is involved.
        """  
        return None
 
    def allow_migrate(self, db, model):
        """
        Determine if the migration operation is allowed to run on the database with alias db.
        """
        return None    
