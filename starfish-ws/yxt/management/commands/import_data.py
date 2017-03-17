from django.core.management import BaseCommand
from yxt.utils import *
from log import config_logging

config_logging(filename='/mnt1/logs/starfish-import-data.log')

log = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        assert len(args) >= 2
        import_type = args[0]
        file_path = args[1]
        if import_type == 'user':
            ImportUser().run(file_path)
        elif import_type == 'org':
            ImportOrg().run(file_path)
        elif import_type == 'user_org':
            ImportUserOrg().run(file_path)
        elif import_type == 'position':
            # org_id = int(args[2])
            ImportUserPosition().run(file_path)
        elif import_type == 'department':
            # org_id = int(args[2])
            ImportDepartment().run(file_path)
        elif import_type == 'user_department':
            # org_id = int(args[2])
            ImportUserDepartment().run(file_path)
