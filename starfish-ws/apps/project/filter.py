from apps.acl.models import Role, UserRole, ResourceFilter
from apps.project.models import Project

from common.utils import shard_id


class AdminAccessAllResourceFilter(ResourceFilter):
    def filter(self, user_id):
        if UserRole.has(
                user_id,
                Role.role_id(self.org_id, Role.ADMIN_ROLE_NAME),
                self.org_id):
            return [v for v in Project.objects
                    .using(shard_id(self.org_id))
                    .all()
                    .values_list('id', flat=True)]

        return []

    def has_permission(self, user_id, resource_id):
        return UserRole.has(
            user_id,
            Role.role_id(self.org_id, Role.ADMIN_ROLE_NAME),
            self.org_id)


class ProjectMemberAccessProjectResourceFilter(ResourceFilter):
    def filter(self, user_id):
        return Project.joined_projects(self.org_id, user_id)

    def has_permission(self, user_id, resource_id):
        return resource_id in set(self.filter(user_id))


class ProjectManagerAccessProjectResourceFilter(ResourceFilter):
    def filter(self, user_id):
        return [v for v in Project.objects
                .using(shard_id(self.org_id))
                .filter(person_in_charge=user_id)
                .values_list('id', flat=True)]

    def has_permission(self, user_id, resource_id):
        return Project.objects \
            .using(shard_id(self.org_id)) \
            .getx(person_in_charge=user_id, id=resource_id)
