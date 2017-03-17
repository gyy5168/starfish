from django.conf.urls import patterns, url

from apps.project import views

projects_list = views.ProjectViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

member_projects_list = views.ProjectViewSet.as_view({
    'get': 'list_by_member',
})

project_members_list = views.ProjectMemberViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

project_member_detail = views.ProjectMemberViewSet.as_view({
    'delete': 'destroy',
})

project_detail = views.ProjectViewSet.as_view({
    'patch': 'partial_update',
    'get': 'retrieve',
})

tags_list = views.TagViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

tag_detail = views.TagViewSet.as_view({
    'patch': 'partial_update',
    'delete': 'destroy',
})

tasks_list = views.TaskViewSet.as_view({
    'post': 'create',
    'get': 'list',
})

task_detail = views.TaskViewSet.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'delete': 'destroy',
})

tasks_order = views.TaskViewSet.as_view({
    'patch': 'update_order',
})

task_attachments_list = views.TaskAttachmentViewSet.as_view({
    'post': 'create',
})

task_attachment_detail = views.TaskAttachmentViewSet.as_view({
    'delete': 'destroy',
})

download_task_attachment = views.TaskAttachmentDownloadView.as_view()

task_tags_list = views.TaskTagViewSet.as_view({
    'post': 'create',
})

task_tag_detail = views.TaskTagViewSet.as_view({
    'delete': 'destroy',
})

task_comments_list = views.TaskCommentViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

task_comment_detail = views.TaskCommentViewSet.as_view({
    'delete': 'destroy',
})

task_ops_list = views.TaskOperationsViewSet.as_view({
    'get': 'list',
})

project_user_statistic_record = views.ProjectStatisticRecord.as_view({
    'get': 'list',
})

task_status_list = views.TaskStatusViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

task_status_detail = views.TaskStatusViewSet.as_view({
    'patch': 'partial_update',
    'delete': 'destroy'
})

task_priority_list = views.TaskPriorityViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

task_priority_detail = views.TaskPriorityViewSet.as_view({
    'patch': 'partial_update',
    'delete': 'destroy'
})


urlpatterns = patterns(
    '',
    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects$',
        projects_list, name='project-app-projects-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)$',
        project_detail, name='project-app-project-detail'),
    url(r'^v1/orgs/(?P<org_id>\d+)/members/(?P<user_id>\d+)/project/projects$',
        member_projects_list, name='project-app-member-projects-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/tags$',
        tags_list, name='project-app-tags-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/tags/(?P<tag_id>\d+)$',
        tag_detail, name='project-app-tag-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks$',
        tasks_list, name='project-app-tasks-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)$',
        task_detail,
        name='project-app-task-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>[\d,]+)/order$',
        tasks_order, name='project-app-task-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)/comments$',
        task_comments_list, name='project-app-task-comments-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)/comments/(?P<comment_id>\d+)$',
        task_comment_detail, name='project-app-task-comment-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)/attachments$',
        task_attachments_list, name='project-app-task-attachments-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)/attachments/(?P<attachment_id>\d+)/attachment$',
        download_task_attachment, name='project-app-task-attachment-detail'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)/attachments/(?P<attachment_id>\d+)$',
        task_attachment_detail, name='project-app-task-attachment-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)/tags$',
        task_tags_list, name='project-app-task-tags-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)/tags/(?P<tag_id>\d+)$',
        task_tag_detail, name='project-app-task-tag-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/members$',
        project_members_list, name='project-app-project-members-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/members/(?P<user_id>\d+)$',
        project_member_detail, name='project-app-project-member-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/tasks/(?P<task_id>\d+)/operations$',
        task_ops_list, name='project-app-task-ops-list'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/members/(?P<user_id>\d+)/statistic/record$',
        project_user_statistic_record, name='project-app-project-user-statistic-record'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/status$',
        task_status_list, name='project-task-status-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/status/(?P<obj_id>\d+)$',
        task_status_detail, name='project-task-status-detail'),

    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/priority$',
        task_priority_list, name='project-task-priority-list'),
    url(r'^v1/orgs/(?P<org_id>\d+)/project/projects/(?P<project_id>\d+)/priority/(?P<obj_id>\d+)$',
        task_priority_detail, name='project-task-priority-detail'),
)
