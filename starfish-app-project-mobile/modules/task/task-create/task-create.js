var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    PeopleSelectProject = require("modules/people-select/people-select-project/people-select-project.js"),
    point = require("modules-common/point/point.js"),
    FormName = require("../task-form/form-name/form-name.js"),
    FormIntro = require("../task-form/form-intro/form-intro.js"),
    FormTime = require("../task-form/form-time/form-time.js"),
    FormTags = require("../task-form/form-tag/form-tag.js"),
    FormAttachment = require("../task-form/form-attachment/form-attachment.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    Autosize = require("modules-common/autosize/autosize.js");


var View = Backbone.View.extend({
    attributes: {
        class: "task-create form-panel"
    },

    initialize: function(options) {
        topBar.showTitle("任务创建");
        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            name: "保存",
            callback: $.proxy(this.taskCreate, this)
        }]);

        this.projectId = options.id;
        this.projectAction = options.action;
        this.render();
        this.initEvent();

    },

    render: function() {
        this.$el.append(__inline("task-create.html"));
        this.$form = this.$el.find(".JS-form");
        this.$formBase = this.$form.find(".form-base");
        this.$formMore = this.$form.find(".form-more");
        this.$showMoreForm = this.$form.find(".more-options");
        this.modules = {};

        this.modules.subject = new FormName({
            type: "create"
        });
        this.modules.content = new FormIntro({
            type: "create"
        });
        this.modules.assignee = new PeopleSelectProject({
            projectId: this.projectId,
            type: "create"
        });
        this.modules.assignee.set(global.data.user.toJSON());
        this.modules.attachments = new FormAttachment({});
        // this.modules.attachments.set(data.attachments);

        this.modules.tags = new FormTags({
            type:"create",
            projectId: this.projectId
        });
        // this.modules.tags.set(data.tags);

        this.$formBase.append(this.modules.subject.$el);
        this.$formBase.append(this.modules.content.$el);
        this.$formBase.append(this.modules.assignee.$el);
        this.$formMore.prepend(this.modules.attachments.$el);
        this.$formMore.append(this.modules.tags.$el);

        global.$doc.append(this.$el);
        Autosize($('textarea'));
    },

    initEvent: function() {
        var that = this;
        this.$showMoreForm.on("click", function() {
            that.$showMoreForm.hide();
            that.$formMore.show();
        })
        this.$el.on("click", ".expected_hours", function() {
            that.$el.find(".expected_hours input").focus();
        })
    },

    taskCreate: function() {
        var that = this;
        if (this.creating) {
            return;
        }
        var data = this.get();
        if (data.subject == "") {
            point.shortShow({
                text: "任务名称不能为空"
            });
            return;
        }
        that.creating = true;
        $.ajax({
            type: "POST",
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks",
            data: JSON.stringify(data),
            success: function(response) {
                if (response.errcode === 0) {
                    that.back();
                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }

            },

            error: function(res) {
                point.shortShow({
                    text: global.texts.netError
                });
            },

            complete: function() {
                that.creating = false;
            }
        })
    },

    get: function() {
        var data = {};
        $.each(this.modules, function(key, module) {
            data[key] = module.get();
        });
        data.date_due = Date.parse(new Date()) / 1000;
        data.expected_hours = this.$el.find('.expected_hours input').val() || 0;
        data.project_id = this.projectId;
        return data;
    },

    back: function() {
        this.destroy();
        window.history.back();
    },

    destroy: function() {
        this.$el.remove();
        $.each(this.modules, function(key, module) {
            module.destroy();
        });
    }
});
module.exports = View;
