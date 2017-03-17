var init = require("modules-common/init/init.js");

init(function() {
    var Backbone = require("modules-common/backbone/backbone.js"),
        $ = require("modules-common/zepto/zepto.js"),
        router = require("modules/routers/router.js"),
        tools = require("modules-common/tools/tools.js"),
        ProjectPage = require("modules/project/project-list/project-list.js"),
        ProjectDetailPage = require("modules/project/project-detail/project-detail.js"),
        ProjectCreatePage = require("modules/project/project-create/project-create.js"),
        TaskPage = require("modules/task/task-list/task-list.js"),
        TaskCreate = require("modules/task/task-conver-create/task-conver-create.js"),
        TaskDetail = require("modules/task/task-conver-detail/task-conver-detail.js");

    var currentView = {};
    router.route("", function() {
        currentView.obj && currentView.obj.destroy();
        currentView.obj = new ProjectPage();
        currentView.name = "project";
    });

    router.route("projectCreate", function(id) {
        currentView.obj && currentView.obj.destroy();
        currentView.obj = new ProjectCreatePage();
        currentView.name = "projectCreate";
    });

    router.route("projectDetail/:id", function(id) {
        currentView.obj && currentView.obj.destroy();
        currentView.obj = new ProjectDetailPage({id:id});
        currentView.name = "projectDetail";
    });

    router.route("taskList/:id/:action", function(id, action) {
        currentView.obj && currentView.obj.destroy();
        currentView.obj = new TaskPage({
            id: id,
            action: action
        });
        currentView.name = "task";
    });

    router.route("task-create", function() {
        var options = tools.parseURL();

        new TaskCreate({
            peerId: options.peer_id || "",
            projectId: options.project_id || "",
            subject: options.subject || "",
            content: options.content || ""
        });
    });

    router.route("task-detail", function() {
        var options = tools.parseURL();

        new TaskDetail({
            taskId: options.task_id || "",
            projectId: options.project_id || ""
        });
    });

    Backbone.history.start();
});


module.exports = {};
