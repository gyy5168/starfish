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
        class: "task-detail"
    },

    initialize: function(options) {
        this.prevTitle = topBar.getTitle();
        this.prevBack = topBar.getBack();
        this.prevMenu = topBar.getMenu();

        topBar.showTitle("任务详情");
        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            iconUrl: window.location.origin + __uri("/modules-common/top-bar/img/title_bar_delete_icon_normal.png"),
            callback: $.proxy(this.deleteTask, this)
        }]);

        this.projectId = options.projectId;
        this.taskId = this.model.get("id");

        this.render();

        this.initEvent();

    },

    render: function() {
        var data = this.model.toJSON();
        this.$el.append(__inline("task-detail.html"));
        var completeClass = data.is_completed ? "completed" : "";

        this.$complete = this.$el.find(".JS-complete");
        this.$complete.addClass(completeClass);
        this.$complete.data("completed", data.is_completed);
        this.$comment = this.$el.find(".JS-comments");
        this.$commentSend = this.$el.find(".JS-commentSend");
        this.$commentInput = this.$el.find(".JS-input");
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

    initEvent: function() {
        var that = this;
        this.$complete.on("click", function(evt) {
            that.changeAction();
            evt.stopPropagation();
        });

        this.$el.on("click", ".JS-send", function() {
            that.addNewComment();
        });
        this.$commentInput.on('autosize:resized', function() {
            var htmlSize = $("html").css("font-size");
            var htmlNum = htmlSize.split("px")[0];
            var height = ($(this).height() / htmlNum + 0.3).toFixed(2);
            that.$form.css("bottom", height + "rem");
            that.$commentSend.css({
                height: height + "rem",
                lineHeight: height + "rem"
            });
        });
        for (var key in this.modules) {
            that.listenTo(that.modules[key], "change", function(data) {
                that.trigger("change", data);
            });
        }
    },

    changeAction: function() {
        var that = this;
        var completed = this.$complete.data("completed");
        var completedAction = (completed === 0) ? 1 : 0;
        var info = (completed === 0) ? "标记为已完成？" : "标记为未完成？";
        // var conf = confirm(info);
        confirm.show({
            text: info,
            okCallback: change
        });

        function change() {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.model.get("id"),
                type: "PATCH",
                data: JSON.stringify({
                    "is_completed": completedAction
                }),
                success: function(response) {
                    if (response.errcode === 0) {
                        that.back();
                        that.trigger("delete");
                        point.shortShow({
                            text: "标记成功",
                            time: "2000"
                        });
                        // var action = $(".task-nav .selected").data("action");
                        // if (action != 4) {
                        //     that.remove();
                        // } else {

                        //     if (completedAction == 0) {
                        //         that.$el.find(".JS-complete").removeClass("selected");
                        //         that.$el.find(".JS-complete").data("completed", 0);
                        //     } else {
                        //         that.$el.find(".JS-complete").addClass("selected");
                        //         that.$el.find(".JS-complete").data("completed", 1);
                        //     }
                        // }
                        // point.shortShow({
                        //     text: "标记成功",
                        //     time: "2000"
                        // });
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

    addCommnentsList: function() {
        var that = this;
        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.model.get("id") + "/comments?start=0&ps=1000",
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
        var $input = this.$el.find(".JS-commentSend .JS-input");
        if ($input.val()) {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.model.get("id") + "/comments",
                type: "POST",
                data: JSON.stringify({
                    "content": $input.val()
                }),
                success: function(response) {
                    // console.log(response)
                    if (response.errcode === 0) {
                        $input.val("");
                        Autosize.update($input);
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
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.model.get("id"),
                type: "delete",
                success: function(response) {
                    if (response.errcode === 0) {
                        that.trigger("delete");
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
        topBar.showTitle(this.prevTitle);
        topBar.showMenu(this.prevMenu);
        topBar.setBack(this.prevBack);
        // window.history.back();
    },

    destroy: function() {
        this.remove();
        $.each(this.modules, function(key, module) {
            module.destroy();
        });
    }
});
module.exports = View;
