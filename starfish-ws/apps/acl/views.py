from rest_framework.response import Response

from apps.message.models import Message
from apps.acl.models import Role, UserRole
from apps.account.models import User

from common.message_queue import MessageSender
from common.utils import shard_id, current_timestamp, TargetObject
from common.const import ErrorCode, DestType, SrcType
from common.viewset import ViewSet


class ACLUserRoleViewSet(ViewSet):
    ROLE_AGE = 3600 * 24 * 365 * 3

    def create(self, request, org_id):
        r = UserRole.add(
            request.DATA['user_id'],
            org_id,
            expires_at=current_timestamp() + self.ROLE_AGE
        )

        MessageSender(
            Message.TYPE_ORG_ADMIN_CREATED,
            {
                'operator': TargetObject().obj_info(User, request.current_uid),
            },
            org_id
        ).send(
            src_id=request.current_uid,
            src_type=SrcType.ORG_MEMBER,
            dest_id=request.DATA['user_id'],
            dest_type=DestType.ORG_MEMBER,
            date_added=current_timestamp(),
        )

        return Response({'errcode': ErrorCode.OK, 'data': r.to_dict()})

    def list(self, request, org_id):
        r = UserRole.objects \
            .using(shard_id(org_id)) \
            .filter(role=Role.role_id(org_id, Role.ADMIN_ROLE_NAME))

        return Response({'errcode': ErrorCode.OK, 'data': [i.to_dict() for i in r]})

    def retrieve(self, request, org_id, user_id):
        ur = UserRole.objects \
            .using(shard_id(org_id)) \
            .get_or_none(user_id=user_id, role=Role.role_id(org_id, Role.ADMIN_ROLE_NAME))

        data = ur.to_dict() if ur else {}
        return Response({'errcode': ErrorCode.OK, 'data': data})

    def destroy(self, request, org_id, user_id):
        UserRole.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=user_id) \
            .filter(role=Role.role_id(org_id, Role.ADMIN_ROLE_NAME)) \
            .delete()

        MessageSender(
            Message.TYPE_ORG_ADMIN_DELETED,
            {
                'operator': TargetObject().obj_info(User, request.current_uid),
            },
            org_id
        ).send(
            src_id=request.current_uid,
            src_type=SrcType.ORG_MEMBER,
            dest_id=user_id,
            dest_type=DestType.ORG_MEMBER,
            date_added=current_timestamp(),
        )

        return Response({'errcode': ErrorCode.OK})
