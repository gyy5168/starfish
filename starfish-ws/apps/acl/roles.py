from apps.account.models import User
from apps.org.models import (Org, UserOrg, DiscussionGroup, UserDiscussionGroup)

from common.utils import shard_id, list_ids


class Guest(object):
    def __init__(self, **kwargs):
        self.kwargs = kwargs

    def has_or_is(self, user_id):
        return True


class RegisteredUser(Guest):
    def has_or_is(self, user_id):
        return user_id > 0


class OrgMember(RegisteredUser):
    def has_or_is(self, user_id):
        if not super(OrgMember, self).has_or_is(user_id):
            return False

        org_id = self.kwargs.get('org_id', 0)
        if not org_id:
            return False

        # cache for org member
        r = UserOrg.objects.getx(org_id=org_id, user_id=user_id)
        return r and not r.is_left


class OrgCreator(RegisteredUser):
    def has_or_is(self, user_id):
        if not super(OrgCreator, self).has_or_is(user_id):
            return False

        org_id = self.kwargs.get('org_id', 0)
        if not org_id:
            return False

        o = Org.objects.getx(id=org_id)
        return o and o.creator == user_id


class OrgAdmin(OrgCreator):
    def has_or_is(self, user_id):
        if super(OrgAdmin, self).has_or_is(user_id):
            return True

        org_id = self.kwargs.get('org_id', 0)
        if not org_id:
            return False

        return User.objects.getx(id=user_id).is_admin(org_id)


class DiscussionGroupMember(OrgMember):
    def has_or_is(self, user_id):
        if not super(DiscussionGroupMember, self).has_or_is(user_id):
            return False

        org_id = self.kwargs.get('org_id', 0)
        if not org_id:
            return False

        group_ids = list_ids(self.kwargs.get('group_id', 0))

        for group_id in group_ids:
            g = DiscussionGroup.objects.using(org_id).getx(id=group_id)
            if not g or g.is_disbanded or not g.has_user(user_id):
                return False

        return True


class UserSelf(RegisteredUser):
    def has_or_is(self, user_id):
        return self.kwargs.get('user_id', 0) == user_id


class OrgMemberSelf(UserSelf):
    def has_or_is(self, user_id):
        return super(OrgMemberSelf, self).has_or_is(user_id)
