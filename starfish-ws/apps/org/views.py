import logging
import os
import random
import smtplib

import requests
from apps.account.models import User, UserAvatar
from apps.mail import utils
from apps.org.models import (Department, DepartmentAvatar, DiscussionGroup,
                             DiscussionGroupAvatar, ExternalContact,
                             ExternalContactAvatar, ExternalInvitation,
                             GeneratedContact, Invitation,
                             MemberOrgApp, Org, OrgApp, OrgAttribute,
                             OrgAvatar, OrgCategory, OrgDomain, OrgInvitation,
                             UserDepartment, UserDiscussionGroup,
                             UserGeneratedContact, UserOrg, UserPosition,
                             WorkMail)
from apps.org.serializers import OrgAppSerializer, WorkMailSerializer
from common.const import ErrorCode
from common.decorator import last_modified
from common.exceptions import APIError
from common.utils import (BaseAvatar, GroupAvatarGenerator, TargetObject,
                          check_domain_mx_records, current_timestamp,
                          ensure_dir_exists, is_phone_number, list_ids,
                          normalize_phone_number, setattr_if_changed, shard_id)
from common.viewset import ViewSet
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from rest_framework.response import Response

log = logging.getLogger(__name__)


class OrgViewSet(ViewSet):
    def _update_org_attirbute(self, request, org_id):
        province = request.DATA.get('province', '')
        city = request.DATA.get('city', '')
        category = request.DATA.get('category', '')
        if category:
            category_obj = OrgCategory.create(category)
        else:
            category_obj = None
        if province or city or category:
            attribute, created = OrgAttribute.objects \
                .get_or_create(org_id=org_id,
                               defaults={'province': province,
                                         "city": city,
                                         'category': category_obj})
            if not created and setattr_if_changed(attribute, province=province, city=city,
                                                  category=category_obj):
                attribute.save()

        return Org.objects.get(id=org_id)

    def create(self, request):
        domain_name = request.DATA.get('domain')
        if domain_name and not check_domain_mx_records(domain_name):
            raise APIError(ErrorCode.DOMAIN_MX_RECORDS_ERROR, domain_name=domain_name)

        kwargs = {
            'creator': request.current_uid,
            'name': request.DATA['name'],
            'intro': request.DATA.get('intro', ''),
            'avatar': self._save_avatar(request),
        }

        retries = 3
        for i in range(retries):
            kwargs['id'] = Org.next_org_id()

            o = Org(**kwargs)
            try:
                with transaction.atomic():
                    o.save()
                break
            except IntegrityError as e:
                log.exception(e)
                if i == retries - 1:
                    raise e

        domain_name = request.DATA.get('domain')
        if domain_name:
            org_domain = o.default_domain
            org_domain.name = domain_name
            org_domain.save()

        o = self._update_org_attirbute(request, o.id)
        return Response({'errcode': ErrorCode.OK, 'data': o.to_dict()})

    @last_modified(Org.last_modified)
    def retrieve(self, request, org_id):
        o = Org.objects.get_or_none(id=org_id)
        if not o:
            return Response({'errcode': ErrorCode.NO_SUCH_ORG})

        return Response({'errcode': ErrorCode.OK, 'data': o.to_dict()})

    def partial_update(self, request, org_id):
        o = Org.objects.get_or_none(id=org_id)
        if not o:
            return Response({'errcode': ErrorCode.NO_SUCH_ORG})

        log.info('update org, request.FILES: %s', request.FILES)

        if request.FILES:
            o.avatar = self._save_avatar(request)

        fields = ('name', 'intro')
        for field in fields:
            if field in request.DATA:
                setattr(o, field, request.DATA[field])

        o.save()
        o = self._update_org_attirbute(request, o.id)
        return Response({'errcode': ErrorCode.OK, 'data': o.to_dict()})

    def list_work_mails(self, request, org_id):
        if 'local_part' in request.GET:
            r = WorkMail.objects\
                .using(org_id) \
                .filter(local_part=request.GET['local_part'])
            if r.exists():
                return Response({'errcode': ErrorCode.OK, 'data': r[0].to_dict()})
        elif 'owner_type' in request.GET:
            owner_type = request.GET['owner_type']
            is_set = request.GET.get('is_set', 1)

            qs = WorkMail.objects.using(org_id)\
                .filter(owner_type=owner_type, is_set=is_set)\
                .order_by('-id')

            data = WorkMailSerializer(self.paging(request, qs), many=True).data
            return Response({'errcode': ErrorCode.OK, 'data': data})

        return Response({'errcode': ErrorCode.OK, 'data': None})

    def _save_avatar(self, request):
        if not request.FILES:
            return ''

        return OrgAvatar.save_file(list(request.FILES.values())[0])


class MemberFilterMixin(object):
    def user_ids_from_request(self, request, org_id):
        if isinstance(request.DATA, dict):
            in_members = request.DATA.get('members', [])
            exclude_members = request.DATA.get('exclude_members', [])
            in_departments = request.DATA.get('departments', [])
            exclude_departments = request.DATA.get('exclude_departments', [])
        else:
            in_members = request.DATA
            exclude_members = []
            in_departments = []
            exclude_departments = []

        users_dict = {}
        for did in in_departments:
            for uid in Department.user_ids(org_id, did):
                users_dict[uid] = users_dict.get(uid, 0) + 1

        for did in exclude_departments:
            for uid in Department.user_ids(org_id, did):
                users_dict[uid] = users_dict.get(uid, 0) - 1

        for uid in exclude_members:
            users_dict[uid] = 0
        for uid in in_members:
            users_dict[uid] = 1

        return [uid for uid, count in users_dict.items() if count > 0]


class DiscussionGroupViewSet(ViewSet, MemberFilterMixin):
    def create(self, request, org_id):
        members = [request.current_uid] + self.user_ids_from_request(request, org_id)

        name = request.DATA.get('name')
        if not name:
            names_list = User.objects.filter(id__in=members[:10]).values_list('name', flat=True)
            name = ','.join(names_list)[:30]

        g = DiscussionGroup(
            creator=request.current_uid,
            name=name,
            intro=request.DATA['intro'],
            avatar=self._save_avatar(request, org_id))
        g._members = members

        g.save(using=shard_id(org_id))
        return Response({'errcode': ErrorCode.OK, 'data': g.to_dict()})

    def user_discussion_groups(self, request, org_id, user_id):
        r = UserDiscussionGroup.objects \
            .using(shard_id(org_id)) \
            .filter(user_id=user_id)

        is_left = dict([(i.group_id, i.is_left) for i in r])

        discussion_groups = DiscussionGroup.objects \
            .using(shard_id(org_id)) \
            .filter(id__in=[i.group_id for i in r])

        data = DiscussionGroup.to_dict_list(
            org_id,
            [g for g in discussion_groups if not g.is_disbanded and not is_left[g.id]]
        )

        return Response({'errcode': ErrorCode.OK, 'data': data})

    def retrieve(self, request, org_id, group_id):
        g = DiscussionGroup.objects.using(shard_id(org_id)) \
            .get_or_none(id=group_id)

        if not g:
            return Response({'errcode': ErrorCode.NO_SUCH_DISCUSSION_GROUP})

        return Response({'errcode': ErrorCode.OK, 'data': g.to_dict()})

    def partial_update(self, request, org_id, group_id):
        g = DiscussionGroup.objects.using(shard_id(org_id)) \
            .get_or_none(id=group_id)

        if not g:
            return Response({'errcode': ErrorCode.NO_SUCH_DISCUSSION_GROUP})

        for key in ('intro',):
            if key in request.DATA:
                setattr(g, key, request.DATA[key])

        if not g.related_project() and 'name' in request.DATA:
            g.name = request.DATA['name']

        if request.FILES:
            g.avatar = self._save_avatar(request, org_id)

        g.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': g.to_dict()})

    def destroy(self, request, org_id, group_id):
        g = DiscussionGroup.objects.using(shard_id(org_id)) \
            .get_or_none(id=group_id)

        if not g:
            return Response({'errcode': ErrorCode.NO_SUCH_DISCUSSION_GROUP})

        g.is_disbanded = 1
        g.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK})

    def _save_avatar(self, request, org_id):
        if not request.FILES:
            return ''

        return DiscussionGroupAvatar.save_file(list(request.FILES.values())[0], org_id)


class OrgMemberViewSet(ViewSet):
    def list(self, request, org_id):
        user_ids = UserOrg.objects \
            .filter(org_id=org_id, is_left=0) \
            .values_list('user_id', flat=True)

        data = User.build_summary_list([user_id for user_id in user_ids], org_id)
        return Response({'errcode': ErrorCode.OK, 'data': data})

    def retrieve(self, request, org_id, user_id):
        user_ids = list_ids(user_id)
        user_ids = UserOrg.objects \
            .filter(org_id=org_id, is_left=0) \
            .filter(user_id__in=user_ids) \
            .values_list('user_id', flat=True)
        user_ids = list(user_ids)
        data = {u['id']: u for u in User.build_summary_list(user_ids, org_id)}
        return Response({'errcode': ErrorCode.OK, 'data': data})

    def partial_update(self, request, org_id, user_id):
        position = request.DATA.get('position')
        if position:
            r, created = UserPosition.objects \
                .using(shard_id(org_id)) \
                .get_or_create(
                    user_id=user_id,
                    defaults={'position': position})
            if not created:
                r.position = position
                r.save()

        return Response({'errcode': ErrorCode.OK})

    def destroy(self, request, org_id, user_id):
        for uid in list_ids(user_id):
            o = UserOrg.objects \
                .get_or_none(
                    user_id=uid,
                    org_id=org_id
                )
            if o:
                o.is_left = 1
                o.save()

        return Response({'errcode': ErrorCode.OK})


class DiscussionGroupMemberViewSet(ViewSet, MemberFilterMixin):
    def create(self, request, org_id, group_id):
        group = DiscussionGroup.objects \
            .using(org_id) \
            .getx(id=group_id)
        if not group:
            raise APIError(ErrorCode.NO_SUCH_DISCUSSION_GROUP, org_id=org_id, group_id=group_id)

        members = self.user_ids_from_request(request, org_id)
        group.add_users(request.current_user, members)
        return Response({'errcode': ErrorCode.OK})

    @last_modified(UserDiscussionGroup.last_modified_by_group)
    def list(self, request, org_id, group_id):
        group_ids = list_ids(group_id)
        qs = UserDiscussionGroup.objects.using(org_id) \
            .filter(group_id__in=group_ids) \
            .filter(is_left=0)

        data = dict((gid, []) for gid in group_ids)
        for ud in qs:
            data[ud.group_id].append(ud.user_id)

        return Response({'errcode': ErrorCode.OK, 'data': data})

    def destroy(self, request, org_id, group_id, user_id):
        group = DiscussionGroup.objects \
            .using(org_id) \
            .getx(id=group_id)
        if not group:
            raise APIError(ErrorCode.NO_SUCH_DISCUSSION_GROUP, org_id=org_id, group_id=group_id)

        group.remove_users(request.current_user, [user_id])
        return Response({'errcode': ErrorCode.OK})


class DepartmentViewSet(ViewSet):
    def create(self, request, org_id):
        parent_id = int(request.DATA.get('parent', 0))
        if not parent_id:
            parent_id = request.current_org.default_department.id
        elif not Department.objects.using(org_id).getx(id=parent_id):
            raise APIError(ErrorCode.NO_SUCH_DEPARTMENT, parent_id=parent_id)

        d = Department(
            creator=request.current_uid,
            name=request.DATA['name'],
            avatar=self._save_avatar(request, org_id),
            parent_id=parent_id)
        d.save(using=shard_id(org_id))

        for user_id in request.DATA['members']:
            if 'v2' in request.GET:
                d.add_direct_in_v2(user_id)
            else:
                d.add_direct_in(user_id)

        return Response({'errcode': ErrorCode.OK, 'data': d.to_dict()})

    def list(self, request, org_id):
        groups = Department.objects.using(org_id).filter(is_disbanded=0)

        parent_id = request.GET.get('parent')
        if parent_id == '0':
            groups = groups.filter(parent=None)
        elif parent_id is not None:
            groups = groups.filter(parent_id=parent_id)

        return Response({'errcode': ErrorCode.OK, 'data': Department.to_dict_list(org_id, groups)})

    def retrieve(self, request, org_id, group_id):
        group = Department.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=group_id, is_disbanded=0)
        if not group:
            return Response({'errcode': ErrorCode.NO_SUCH_DEPARTMENT})

        return Response({'errcode': ErrorCode.OK, 'data': group.to_dict()})

    def partial_update(self, request, org_id, group_id):
        group = Department.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=group_id, is_disbanded=0)
        if not group:
            return Response({'errcode': ErrorCode.NO_SUCH_DEPARTMENT})

        fields = ('name', 'is_disbanded')
        for field in fields:
            if field in request.DATA:
                setattr(group, field, request.DATA[field])

        if request.FILES:
            group.avatar = self._save_avatar(request, org_id)

        group.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': group.to_dict()})

    def destroy(self, request, org_id, group_id):
        group = Department.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=group_id, is_disbanded=0)
        if not group:
            return Response({'errcode': ErrorCode.NO_SUCH_DEPARTMENT})

        group.is_disbanded = 1
        group.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK})

    def update_user_departments(self, request, org_id, user_id):
        if not request.current_user.is_admin(org_id):
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        if 'v2' in request.GET:
            Department.update_user_departments(org_id, user_id, request.DATA)
        else:
            Department.user_reset_direct_in(org_id, user_id, request.DATA)

        return Response({'errcode': ErrorCode.OK})

    def list_user_departments(self, request, org_id, user_id):
        db = shard_id(org_id)

        qs = UserDepartment.objects.using(db)\
            .filter(user_id=user_id)

        direct_in = 0
        if 'is_direct' in request.GET:
            direct_in = int(request.GET['is_direct'])

        if direct_in == 1:
            qs = qs.filter(direct_in=1)

        _t = TargetObject()
        data = [dict(**_t.obj_info(Department, i.group_id, db)) for i in qs]

        return Response({'errcode': ErrorCode.OK, 'data': data})

    def list_items(self, request, org_id, group_id):
        qs = Department.objects \
            .using(org_id) \
            .filter(parent_id=group_id) \
            .filter(is_disbanded=0)
        departments = Department.to_dict_list(org_id, qs)

        qs = UserDepartment.objects \
            .using(org_id) \
            .filter(group_id=group_id) \
            .filter(direct_in=1)
        _t = TargetObject()
        members = [dict(**_t.obj_info(User, i.user_id, shard_id(org_id))) for i in qs]

        return Response({
            'errcode': ErrorCode.OK,
            'data': {'departments': departments, 'members': members}
        })

    def _save_avatar(self, request, org_id):
        if not request.FILES:
            return ''

        return DepartmentAvatar.save_file(list(request.FILES.values())[0], org_id)


class DepartmentMemberViewSet(ViewSet):
    def create(self, request, org_id, group_id):
        user_ids = request.DATA

        if User.objects.filter(id__in=user_ids).count() < len(user_ids):
            return Response({'errcode': ErrorCode.NO_SUCH_USER})

        if UserOrg.objects.filter(
                org_id=org_id,
                is_left=0,
                user_id__in=user_ids).count() < len(user_ids):
            return Response({'errcode': ErrorCode.NO_SUCH_USER_IN_ORG})

        d = Department.objects.using(org_id).getx(id=group_id)
        if 'v2' in request.GET:
            d.add_direct_in_v2(*user_ids)
        else:
            d.add_direct_in(*user_ids)

        return Response({'errcode': ErrorCode.OK})

    def list(self, request, org_id, group_id):
        UserDepartment.normalize(org_id)

        group_ids = list_ids(group_id)

        qs = UserDepartment.objects.using(org_id) \
            .filter(group_id__in=group_ids)

        direct_in = 1
        if 'is_direct' in request.GET:
            direct_in = int(request.GET['is_direct'])
        elif 'direct_in' in request.GET:
            direct_in = int(request.GET['direct_in'])

        if direct_in:
            qs = qs.filter(direct_in=1)

        data = dict((gid, []) for gid in group_ids)
        for ud in qs:
            data[ud.group_id].append(ud.user_id)

        return Response({'errcode': ErrorCode.OK, 'data': data})

    def destroy(self, request, org_id, group_id, user_id):
        user_ids = list_ids(user_id)
        d = Department.objects.using(org_id).getx(id=group_id)
        if d:
            if 'v2' in request.GET:
                d.remove_direct_in_v2(*user_ids)
            else:
                d.remove_direct_in(*user_ids)

        return Response({'errcode': ErrorCode.OK})


class InvitationViewSet(ViewSet):
    def create(self, request):
        if 'user_id' in request.DATA:
            return self.create0(request)

        return self.create1(request)

    def create0(self, request):
        org_id = int(request.DATA['org_id'])
        org = Org.objects.get_or_none(id=org_id)
        if not org:
            return Response({'errcode': ErrorCode.NO_SUCH_ORG})

        if not request.current_user.is_admin(org_id):
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        r = UserOrg.objects \
            .filter(user_id=request.DATA['user_id'], org_id=org_id) \
            .filter(is_left=0)
        if r:
            return Response({'errcode': ErrorCode.USER_ALREADY_IN_ORG})

        invitation = Invitation(
            who=request.current_uid,
            whom=request.DATA['user_id'],
            org_id=org_id)
        invitation.save()

        return Response({'errcode': ErrorCode.OK, 'data': invitation.to_dict()})

    def create1(self, request):
        org_id = int(request.DATA['org_id'])
        org = Org.objects.get_or_none(id=org_id)
        if not org:
            return Response({'errcode': ErrorCode.NO_SUCH_ORG})

        if not request.current_user.is_admin(org_id):
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        if 'to' not in request.DATA:
            r = ExternalInvitation.create(
                request.current_uid,
                '',
                org.id,
                ExternalInvitation.INVITATION_TYPE_WECHAT)
            ret = {
                'url': '%s/invite?c=%s' % (settings.API_URL, r.security_code),
            }
            return Response({'errcode': ErrorCode.OK, 'data': ret})

        if is_phone_number(request.DATA['to'][0]):
            self._invite_by_sms(request.DATA['to'], org, request.current_user)
        else:
            self._invite_by_email(request.DATA['to'], org, request.current_user)

        return Response({'errcode': ErrorCode.OK})

    def _invite_by_sms(self, to_list, org, admin):
        if not settings.SMS_SWITCH:
            return

        from apps.account.template import sms_invitation_template

        for to in to_list:
            to = normalize_phone_number(to, append=False)

            obj = OrgInvitation.create_valid(org.id, admin.id, type=OrgInvitation.TYPE_PHONE)

            url = settings.INVITATION_URL.format(
                org_id=org.id,
                invitation_id=obj.id,
                phone=to,
            )
            content = sms_invitation_template % (admin.name, org.name, url)

            log.info('send sms invitation to: %s', to)
            for i in range(5):
                try:
                    requests.get(
                        settings.SMS_GATEWAY_URL,
                        params={
                            'to': normalize_phone_number(to),
                            'body': content,
                            'sc': settings.SMS_GATEWAY_SECRET_CODE,
                            'type': settings.SMS_TYPE_INVITATION},
                        timeout=settings.SMS_GATEWAY_TIMEOUT)
                    break
                except Exception as e:
                    if i == 4:
                        log.error('send sms invitation to: %s', to)
                        raise e

    def _invite_by_email(self, to, org, admin):
        from apps.account.template import email_invitation_template

        invitation = ExternalInvitation.create(admin.id, to[0], org.id)
        url = '%s/invite?c=%s' % (settings.API_URL, invitation.security_code)
        content = email_invitation_template % (org.name, admin.name, url)
        mail = utils.build_mail(
            sender="\"Starfish\" <%s>" % settings.SERVICE_MAIL_CONF['from'],
            to=to,
            subject='%s邀请你加入%s' % (admin.name, org.name),
            content=content)

        retries = 5
        for i in range(retries):
            try:
                conn = smtplib.SMTP(random.choice(settings.SMTP_HOST))

                conn.login(mail.get('From'), settings.SMPT_FAKE_PWD)
                conn.sendmail(mail.get('From'), to, mail.as_string())

                conn.quit()

                break
            except Exception as e:
                log.exception(e)

    def partial_update(self, request, invitation_id):
        invitation = Invitation.objects.get_or_none(id=invitation_id)
        if not invitation:
            return Response({'errcode': ErrorCode.NO_SUCH_INVITATION})

        if invitation.whom != request.current_uid:
            return Response({'errcode': ErrorCode.PERMISSION_DENIED})

        invitation_status = int(request.DATA['status'])
        r = UserOrg.objects \
            .filter(user_id=invitation.whom, org_id=invitation.org_id) \
            .filter(is_left=0)
        if r:
            invitation.status = Invitation.STATUS_CONFIRM
            invitation._do_not_notify = True
            invitation.save()

            return Response({'errcode': ErrorCode.USER_ALREADY_IN_ORG})

        invitation.status = invitation_status
        invitation.save()

        return Response({'errcode': ErrorCode.OK, 'data': invitation.to_dict()})


class ExternalContactView(ViewSet):
    def create(self, request, org_id):
        kwargs = {
            'creator': request.current_uid,
            'manager': request.current_uid,
            'avatar': self._save_avatar(request),
        }
        for key in ('name', 'gender', 'phone', 'wechat', 'email',
                    'corporation', 'position', 'department', 'address'):
            kwargs[key] = request.DATA.get(key, '')

        v = ExternalContact(**kwargs)
        v.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': v.to_dict()})

    def list(self, request, org_id):
        ret = ExternalContact.objects \
            .using(shard_id(org_id)) \
            .all()
        return Response({
            'errcode': ErrorCode.OK,
            'data': [v.to_dict() for v in ret]})

    def partial_update(self, request, org_id, external_contact_id):
        v = ExternalContact.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=external_contact_id)
        if not v:
            return Response({'errcode': ErrorCode.NO_SUCH_CONTACT})

        for key in ('name', 'gender', 'phone', 'wechat', 'email', 'manager',
                    'corporation', 'position', 'department', 'address'):
            if key in request.DATA:
                setattr(v, key, request.DATA.get(key, ''))

        if request.FILES:
            v.avatar = self._save_avatar(request)

        v.save(using=shard_id(org_id))

        return Response({'errcode': ErrorCode.OK, 'data': v.to_dict()})

    def retrieve(self, request, org_id, external_contact_id):
        ec = ExternalContact.objects \
            .using(shard_id(org_id)) \
            .getx(id=external_contact_id)

        return Response({'errcode': ErrorCode.OK, 'data': ec.to_dict()})

    def destroy(self, request, org_id, external_contact_id):
        ExternalContact.objects \
            .using(shard_id(org_id)) \
            .filter(id=external_contact_id) \
            .delete()

        return Response({'errcode': ErrorCode.OK})

    def _save_avatar(self, request):
        if not request.FILES:
            return ''

        return ExternalContactAvatar.save_file(list(request.FILES.values())[0])


class ExternalContactAvatarView(BaseAvatar):
    def get(self, request, org_id, external_contact_id):
        v = ExternalContact.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=external_contact_id)

        return self._get(
            request,
            v.avatar if v else None,
            ExternalContactAvatar,
            ExternalContact.DEFAULT_AVATAR)


class OrgAvatarView(BaseAvatar):
    def get(self, request, org_id):
        org = Org.objects.get_or_none(id=org_id)
        return self._get(
            request, org.avatar if org else None,
            OrgAvatar, Org.DEFAULT_AVATAR)


class GroupAvatarView(BaseAvatar):
    AVATAR_AGE = 3600

    def get(self, request, org_id, group_id):
        request._resize_disabled = True
        try:
            return self._get0(
                request, org_id, group_id, int(request.GET.get('width', 200)))
        except Exception as e:
            log.exception(e)
            raise e

    def _should_regenerate_avatar(self, path):
        if not os.path.isfile(path):
            return True

        return os.path.getmtime(path) + self.AVATAR_AGE < current_timestamp()

    def generate(self, default_avatar_path, users, box_size, name=''):
        if not self._should_regenerate_avatar(default_avatar_path):
            return

        image_files = []
        for user in users:
            if user.avatar and os.path.isfile(UserAvatar.full_path(user.avatar)):
                image_files.insert(0, UserAvatar.full_path(user.avatar))
            else:
                image_files.append(User.DEFAULT_AVATAR)

        ensure_dir_exists(default_avatar_path)

        try:
            GroupAvatarGenerator() \
                .generate(image_files, box_size, name) \
                .save(default_avatar_path)
        except OSError as e:
            log.warning('file exists: %s' % e)


class DepartmentAvatarView(BaseAvatar):
    def get(self, request, org_id, group_id):
        department = Department.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=group_id)

        return self._get(
            request, department.avatar if department else None,
            DepartmentAvatar, Department.DEFAULT_AVATAR)


class DiscussionGroupAvatarView(GroupAvatarView):
    def _get0(self, request, org_id, group_id, box_size):
        group_avatar = DiscussionGroup.objects \
            .using(shard_id(org_id)) \
            .get_or_none(id=group_id).avatar

        default_avatar_path = DiscussionGroupAvatar.full_path(
            'discussion-group-avatars/%s/%s_%s.png' % (org_id, group_id, box_size))

        user_ids = [i for i in UserDiscussionGroup.objects
                    .filter(group_id=group_id, is_left=0)
                    .using(shard_id(org_id))
                    .values_list('user_id', flat=True)]
        users = User.objects.filter(id__in=user_ids)
        self.generate(default_avatar_path, users, box_size)

        return self._get(
            request, group_avatar,
            DiscussionGroupAvatar, default_avatar_path)


class GeneratedContactView(ViewSet):
    def list(self, request, org_id):
        gc_ids = UserGeneratedContact.objects \
            .using(org_id) \
            .filter(user_id=request.current_uid)\
            .order_by('-id')\
            .values_list('contact_id', flat=True)

        gc_ids = self.paging(request, gc_ids)

        ret = GeneratedContact.objects.using(org_id).filter(id__in=gc_ids)
        return Response({'errcode': ErrorCode.OK, 'data': [v.to_dict() for v in ret]})


class OrgDomainViewSet(ViewSet):
    def _is_valid_name(self, name):
        return name and OrgDomain.objects.getx(name=name) is None

    def create(self, request, org_id):
        name = request.DATA.get('name')
        if not self._is_valid_name(name):
            return Response({'errcode': ErrorCode.DOMAIN_OCCUPIED})

        if not check_domain_mx_records(name):
            raise APIError(ErrorCode.DOMAIN_MX_RECORDS_ERROR, domain_name=name)

        od = Org.objects.getx(id=org_id).default_domain
        if not od.valid_name:
            od.creator = request.current_uid
            od.name = name
            od.save()
        else:
            od = OrgDomain.objects.create(
                creator=request.current_uid,
                name=name,
                org_id=org_id,
                is_default=request.DATA.get('is_default', 0)
            )
        return Response({'errcode': ErrorCode.OK, 'data': od.to_dict()})

    def list(self, request, org_id):
        qs = OrgDomain.objects.filter(org_id=org_id)\
            .order_by('-is_default', 'id')

        return Response({'errcode': ErrorCode.OK,
                         'data': [i.to_dict() for i in qs if i.valid_name]})

    def partial_update(self, request, org_id, domain_id):
        od = OrgDomain.objects.get_or_none(id=domain_id)
        if not od or od.org_id != org_id:
            return Response({'errcode': ErrorCode.CAN_NOT_MODIFY_DOMAIN})

        kwargs = {}
        name = request.DATA.get('name')
        is_default = request.DATA.get('is_default')
        if name:
            if not self._is_valid_name(name):
                return Response({'errcode': ErrorCode.DOMAIN_OCCUPIED})
            kwargs.update(name=name)
        if is_default:
            kwargs.update(is_default=is_default)

        if setattr_if_changed(od, **kwargs):
            od.save()

        return Response({'errcode': ErrorCode.OK, 'data': od.to_dict()})

    def destroy(self, request, org_id, domain_id):
        od = OrgDomain.objects.get_or_none(id=domain_id)
        if not od or od.org_id != org_id or od.is_default:
            return Response({'errcode': ErrorCode.CAN_NOT_MODIFY_DOMAIN})

        od.delete()
        return Response({'errcode': ErrorCode.OK})


class OrgAppViewSet(ViewSet):

    def install(self, request, org_id):
        if not request.current_user.is_admin(org_id):
            raise APIError(ErrorCode.PERMISSION_DENIED, user_id=request.current_uid)

        org_app, created = OrgApp.objects\
            .using(org_id)\
            .get_or_create(app=request.DATA.get('app'),
                           defaults={
                               'creator': request.current_uid,
                               'is_install': 1}
                           )
        if not created and setattr_if_changed(org_app, is_install=1):
            org_app.save()

        return Response({'errcode': ErrorCode.OK})

    def uninstall(self, request, org_id, app):
        if not request.current_user.is_admin(org_id):
            raise APIError(ErrorCode.PERMISSION_DENIED, user_id=request.current_uid)

        org_app = OrgApp.objects \
            .using(org_id) \
            .get_or_none(app=app)
        if org_app and setattr_if_changed(org_app, is_install=0):
            org_app.save()

        return Response({'errcode': ErrorCode.OK})

    def list(self, request, org_id):
        qs = OrgApp.objects.using(org_id).filter(is_install=1)
        data = OrgAppSerializer(qs, many=True).data
        return Response({'errcode': ErrorCode.OK, 'data': data})

    def create_navigation_app(self, request, org_id, user_id):
        if request.current_uid != user_id:
            raise APIError(ErrorCode.PERMISSION_DENIED,
                           current_uid=request.current_uid, user_id=user_id)

        app = request.DATA.get('app')

        if not OrgApp.has_install(org_id, app):
            raise APIError(ErrorCode.ORG_APP_NOT_INSTALL, org_id=org_id, app=app)

        member_app, created = MemberOrgApp.objects\
            .using(org_id)\
            .get_or_create(app=app, user_id=user_id,
                           defaults={'is_navi': 1}
                           )
        if not created and setattr_if_changed(member_app, is_navi=1):
            member_app.save()

        return Response({'errcode': ErrorCode.OK})

    def delete_navigation_app(self, request, org_id, user_id, app):
        if request.current_uid != user_id:
            raise APIError(ErrorCode.PERMISSION_DENIED,
                           current_uid=request.current_uid, user_id=user_id)

        if not OrgApp.has_install(org_id, app):
            raise APIError(ErrorCode.ORG_APP_NOT_INSTALL, org_id=org_id, app=app)

        member_app = MemberOrgApp.objects \
            .using(org_id)\
            .get_or_none(app=app, user_id=user_id)

        if member_app and setattr_if_changed(member_app, is_navi=0):
            member_app.save()

        return Response({'errcode': ErrorCode.OK})

    def list_navigation_app(self, request, org_id, user_id):
        if request.current_uid != user_id:
            raise APIError(ErrorCode.PERMISSION_DENIED,
                           current_uid=request.current_uid, user_id=user_id)
        qs = MemberOrgApp.objects.using(org_id).filter(user_id=user_id, is_navi=1)
        return Response({'errcode': ErrorCode.OK, 'data': qs.values_list('app', flat=True)})


class OrgInvitationViewSet(ViewSet):
    def create(self, request, org_id):
        obj = OrgInvitation.create_valid(
            org_id,
            request.current_uid,
            request.DATA.get('type', OrgInvitation.TYPE_MANAGE)
        )

        return Response({'errcode': ErrorCode.OK, 'data': obj.to_dict()})

    def list(self, request, org_id):
        obj_list = OrgInvitation.get_invitation(org_id, type=request.GET.get('type', None))
        return Response({'errcode': ErrorCode.OK, 'data': [o.to_dict() for o in obj_list]})

    def retrieve(self, request, invitation_id):
        obj = OrgInvitation.get_invitation(int(request.GET['org_id']), invitation_id)
        if not obj:
            raise APIError(ErrorCode.BAD_INVITATION_CODE, invitation_id=invitation_id)

        data = obj[0].to_dict()
        return Response({'errcode': ErrorCode.OK, 'data': data})

    def invite_user_to_org(self, request):
        if 'user_id' in request.DATA:
            user_id = request.DATA['user_id']
        else:
            from apps.account.views import UserViewSet
            u = UserViewSet._create0(request)
            user_id = u.id

        invitation_id = request.DATA['invitation_id']
        org_id = request.DATA['org_id']

        obj_list = OrgInvitation.get_invitation(org_id, invitation_id)
        if not obj_list or not obj_list[0].is_valid:
            raise APIError(ErrorCode.BAD_INVITATION_CODE, invitation_id=invitation_id)

        obj = obj_list[0]
        if obj.limit != 0 and obj.added >= obj.limit:
            raise APIError(ErrorCode.ORG_INVITATION_EXCEED_LIMIT,
                           limit=obj.limit, added=obj.added)

        o, created = UserOrg.objects \
            .get_or_create(
                user_id=user_id,
                org_id=obj.org_id,
                defaults={'is_left': 0})

        is_added = created or o.is_left == 1

        if not created and o.is_left:
            o.is_left = 0
            o.save()

        if is_added:
            OrgInvitation.objects.filter(id=obj.id).update(
                added=F('added') + 1
            )

        return Response({'errcode': ErrorCode.OK, 'data': {'is_added': 1 if is_added else 0}})

    def destroy(self, request, org_id, invitation_id):
        obj_list = OrgInvitation.get_invitation(org_id, invitation_id)
        if not obj_list:
            raise APIError(ErrorCode.BAD_INVITATION_CODE, invitation_id=invitation_id)

        obj_list[0].delete()
        return Response({'errcode': ErrorCode.OK})
