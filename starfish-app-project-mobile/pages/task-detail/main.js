var init = require("modules-common/init/init.js"),
    tools = require("modules-common/tools/tools.js");

init(function main() {
    var TaskDetail = require("modules/task/task-conver-detail/task-conver-detail.js");

    var options = tools.parseURL();

    new TaskDetail({
        taskId: opts.task_id || "",
        projectId: opts.project_id || ""
    });

});

module.exports = {};
