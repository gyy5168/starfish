var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    PeopleSelectProject = require("modules/people-select/people-select-project/people-select-project.js"),
    point = require("modules-common/point/point.js"),
    confirm = require("modules-common/confirm/confirm.js"),
    FormName = require("../task-form/form-name/form-name.js"),
    FormIntro = require("../task-form/form-intro/form-intro.js"),
    FormTime = require("../task-form/form-time/form-time.js"),
    FormTags = require("../task-form/form-tag/form-tag.js"),
    FormAttachment = require("../task-form/form-attachment/form-attachment.js"),
    ItemView = require("./comment-item/comment-item.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    Autosize = require("modules-common/autosize/autosize.js");


var View = Backbone.View.extend({
    attributes: {
        class: "task-conver-detail"
    },

    initialize: function(options) {
        var that = this;
        topBar.showTitle("任务详情");
        topBar.setBack($.proxy(this.back, this));

        this.projectId = options.projectId;
        this.taskId = options.taskId;
        this.getTaskDetail();
        // this.getTaskDetail().done( function(response) {
        //     if (response.errcode === 0) {
        //         that.model = response.data;
        //         that.render();
        //         that.initEvent();
        //     } else {
        //         point.shortShow({
        //             text: global.tools.getErrmsg(response.errcode)
        //         });
        //     }
        // });
    },

    render: function() {
        var that = this;

        topBar.showMenu([{
            iconUrl: window.location.origin + __uri("/modules-common/top-bar/img/title_bar_delete_icon_normal.png"),
            callback: $.proxy(this.deleteTask, this)
        }]);

        this.$el.append(__inline("task-conver-detail.html"));
        var data = this.model;
        var completeClass = data.is_completed ? "completed" : "";

        this.$el.find(".JS-complete").addClass(completeClass);
        this.$comment = this.$el.find(".JS-comments");
        this.modules = {};
        this.$form = this.$el.find(".JS-form");
        this.modules.subject = new FormName({
            type: "detail",
            projectId: this.projectId,
            taskId: this.taskId
        });
        this.modules.subject.set(data.subject);
        this.modules.content = new FormIntro({
            type: "detail",
            projectId: this.projectId,
            taskId: this.taskId
        });
        this.modules.content.set(data.content);
        this.modules.assignee = new PeopleSelectProject({
            projectId: this.projectId,
            taskId: this.taskId,
            type: "detail"
        });
        this.modules.assignee.set(data.assignee_info);
        this.modules.attachments = new FormAttachment({
            type: "detail",
            taskId: this.taskId
        });
        this.modules.attachments.set(data.attachments);
        this.modules.expected_hours = new FormTime({
            type: "expected_hours",
            taskId: this.taskId
        });
        this.modules.expected_hours.set(data.expected_hours);
        this.modules.spent_hours = new FormTime({
            type: "spent_hours",
            taskId: this.taskId
        });
        this.modules.spent_hours.set(data.spent_hours);
        this.modules.tags = new FormTags({
            type: "detail",
            projectId: this.projectId,
            taskId: this.taskId
        });
        this.modules.tags.set(data.tags);

        this.$comment.before(this.modules.subject.$el);
        this.$comment.before(this.modules.content.$el);
        this.$comment.before(this.modules.assignee.$el);
        this.$comment.before(this.modules.attachments.$el);
        this.$comment.before(this.modules.expected_hours.$el);
        this.$comment.before(this.modules.spent_hours.$el);
        this.$comment.before(this.modules.tags.$el);

        this.addCommnentsList();
        global.$doc.append(this.$el);
        Autosize($('textarea'));
    },

    getTaskDetail: function() {
        var that = this;
        if (!this.taskId) {
            point.shortShow({
                text: "信息错误"
            });
            setTimeout("that.back()", 500);
            return;
        }
        return $.ajax({
            type: "GET",
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId,
            success: function(response) {
                if (response.errcode === 0) {
                    that.model = response.data;
                    that.render();
                    that.initEvent();
                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },
            error: function(response) {
                point.shortShow({
                    text: global.texts.netError
                });
            }
        });
    },

    initEvent: function() {
        var that = this;
        this.$el.on("click", ".JS-send", function() {
            that.addNewComment();
        })
    },

    addCommnentsList: function() {
        var that = this;
        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId + "/comments?start=0&ps=1000",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    $.each(response.data, function(index, item) {
                        that.addCommentItem(item);
                    })
                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },
            error: function() {
                point.shortShow({
                    text: global.texts.netError
                });
            }
        });
    },

    addCommentItem: function(item, index) {
        var itemView = new ItemView({
            model: new Backbone.Model(item)
        });
        if (index == 0) {
            this.$comment.find(".comments-list").prepend(itemView.$el);
        } else {
            this.$comment.find(".comments-list").append(itemView.$el);
        }
    },

    addNewComment: function() {
        var that = this;
        var $input = $(".JS-commentSend .JS-input");
        if ($input.val()) {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId + "/comments",
                type: "POST",
                data: JSON.stringify({
                    "content": $input.val()
                }),
                success: function(response) {
                    // console.log(response)
                    if (response.errcode === 0) {
                        $input.val("");
                        point.shortShow({
                            text: "评论成功"
                        });
                        that.addCommentItem(response.data, 0);
                    } else {
                        point.shortShow({
                            text: global.tools.getErrmsg(response.errcode)
                        });
                    }
                },
                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                }
            });
        }
    },

    deleteTask: function() {

        var that = this;

        confirm.show({
            text: "删除该任务？",
            okCallback: handleAjax
        });

        function handleAjax() {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId,
                type: "delete",
                success: function(response) {
                    if (response.errcode === 0) {
                        that.back();
                    } else {
                        point.shortShow({
                            text: global.tools.getErrmsg(response.errcode)
                        });
                    }
                },
                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                }
            });
        }
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
        global.starfishBridge("finish");
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View;
