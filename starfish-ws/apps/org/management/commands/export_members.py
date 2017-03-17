from django.core.management.base import BaseCommand

from apps.account.models import User
from apps.org.models import UserOrg, UserDepartment, Department, UserPosition
from yxt.models import UserYxt

from common.const import Gender


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('org', nargs='+', type=int)

    def handle(self, *args, **options):
        for org_id in options['org']:
            self._export(org_id)

    def _export(self, org_id):
        user_ids = UserOrg.objects \
            .filter(org_id=org_id) \
            .filter(is_left=0) \
            .values_list('user_id', flat=True)
        user_ids = [v for v in user_ids]
        # print('user_ids: %s' % len(user_ids))

        users_ = User.objects.filter(id__in=user_ids)
        users = {o.id: o for o in users_}
        # print('users: %s' % len(users))

        users_yxt_ = UserYxt.objects.filter(user_id__in=user_ids)
        users_yxt = {o.user_id: o for o in users_yxt_}
        # print('users_yxt: %s' % len(users_yxt))

        departments_ = Department.objects.using(org_id).all()
        departments = {o.id: o.name for o in departments_}

        user_departments_ = UserDepartment.objects \
            .using(org_id) \
            .filter(direct_in=1) \
            .filter(user_id__in=user_ids)
        user_departments = {}
        for v in user_departments_:
            if v.user_id not in user_departments:
                user_departments[v.user_id] = []

            user_departments[v.user_id].append(departments.get(v.group_id, ''))

        user_positions_ = UserPosition.objects.using(org_id).all()
        user_positions = {o.user_id: o.position for o in user_positions_}

        print('# 姓名,性别,部门,岗位')
        for user_id in user_ids:
            if user_id not in users or user_id not in users_yxt:
                continue

            print('{username},{gender},{department},{position}'.format(
                username=users_yxt[user_id].username,
                gender=self._format_gender(users[user_id].gender),
                department=self._format_department(user_departments.get(user_id, [])),
                position=self._format_position(user_positions.get(user_id, ''))
            ))

    def _format_gender(self, g):
        if g == Gender.GENDER_MALE:
            return '男'

        if g == Gender.GENDER_FEMALE:
            return '女'

        return '未知'

    def _format_department(self, v):
        return '|'.join(v)

    def _format_position(self, v):
        return v
