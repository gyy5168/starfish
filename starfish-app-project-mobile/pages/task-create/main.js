var init = require("modules-common/init/init.js"),
    tools = require("modules-common/tools/tools.js");

init(function main() {
    var TaskCreate = require("modules/task/task-conver-create/task-conver-create.js");

    var options = tools.parseURL();

    new TaskCreate({
        peerId: options.peer_id || "",
        projectId: options.project_id || "",
        subject: options.subject || "",
        content: options.content || ""
    });
});

module.exports = {};