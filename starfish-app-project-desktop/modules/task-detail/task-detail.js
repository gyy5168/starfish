var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    point = require("modules-common/point/point.js"),
    confirm = require("modules-common/confirm/confirm.js"),
    FormStatus = require("modules/task-form-modules/task-form-status/task-form-status.js"),
    FormTitle = require("modules/task-form-modules/task-form-title/task-form-title.js"),
    FormDescription = require("modules/task-form-modules/task-form-description/task-form-description.js"),
    FormAttachment = require("modules/task-form-modules/task-form-attachment/task-form-attachment.js"),
    FormCharge = require("modules/task-form-modules/task-form-charge/task-form-charge.js"),
    FormTime = require("modules/task-form-modules/task-form-time/task-form-time.js"),
    FormOperates = require("modules/task-form-modules/task-form-operates/task-form-operates.js"),
    FormComment = require("modules/task-form-modules/task-form-comment/task-form-comment.js"),
    // FormShare = require("modules/task-form-modules/task-form-share/task-form-share.js"),
    FormShare = require("modules-common/people-select-all/people-select-all.js"),
    FormDate = require("modules/task-form-modules/task-form-date/task-form-date.js");

var View = Backbone.View.extend({

    tagName: "div",

    attributes: {
        "class": "task-detail-view"
    },

    initialize: function() {
        this.render();
        this.initEvent();
        global.modules.taskDetail = this;
        // 初始化后， 视图是可见的
        this.showing = true;
    },

    render: function() {
        this.$el.html(__inline("task-detail.html"));
        this.$topbar = this.$el.find(".JS-topbar");
        this.$form = this.$el.find(".JS-form");
        this.$state = this.$el.find(".JS-state");
        this.$remove = this.$el.find(".JS-remove");
        this.$share = this.$el.find(".JS-share");
        this.$buttons = this.$el.find(".JS-buttons");
        this.$okbtn = this.$el.find(".JS-ok");
        this.$cancelbtn = this.$el.find(".JS-cancel");

        this.splitLine = '<div class="split-line"></div>';

        this.modules = {};
        this.modules.status = new FormStatus({
            type: "detail"
        });
        this.modules.subject = new FormTitle({
            type: "detail"
        });
        this.modules.content = new FormDescription({
            type: "detail"
        });
        this.modules.attachments = new FormAttachment({
            type: "detail"
        });
        this.modules.assignee = new FormCharge({
            type: "detail"
        });
        this.modules.date_due = new FormDate({
            type: "detail"
        });
        this.modules.expected_hours = new FormTime({
            label: "预计耗时"
        });
        this.modules.spent_hours = new FormTime({
            label: "实际耗时"
        });
        this.modules.operates = new FormOperates();
        this.modules.comments = new FormComment();

        this.modules.spent_hours.$el.addClass("last-form");

        this.$topbar.append(this.modules.status.$el);
        this.$form.append(this.modules.subject.$el);
        this.$form.append(this.modules.content.$el);
        this.$form.append(this.$buttons);
        this.$form.append(this.splitLine);
        this.$form.append(this.modules.attachments.$el);
        this.$form.append(this.splitLine);
        this.$form.append(this.modules.assignee.$el);
        this.$form.append(this.modules.date_due.$el);
        this.$form.append(this.modules.expected_hours.$el);
        this.$form.append(this.modules.spent_hours.$el);
        this.$form.append(this.splitLine);
        this.$form.append(this.modules.operates.$el);
        this.$form.append(this.splitLine);
        this.$form.append(this.modules.comments.$el);

        this.$state.tooltipster();
    },

    initEvent: function() {
        var that = this;

        this.$state.on("click", function() {
            that.changeState();
        });

        this.$remove.on("click", function() {
            that.confirmShow = true;
            confirm.show({
                text: "确定要删除此任务吗?",
                callback: function() {
                    that.removeTask();
                    that.confirmShow = false;
                }
            });
        });

        this.$share.on("click", function() {
            if (!that.peopleSelect) {
                that.peopleSelect = new FormShare();

                that.listenTo(that.peopleSelect, "ok", function(list) {

                    if (list.length === 0) {
                        point.shortShow({
                            text: "请选择要分享给的人、部门或者讨论组"
                        });
                        return;
                    }

                    var dests = [];

                    $.each(list, function(index, obj) {
                        dests.push({
                            id: obj.id,
                            type: transferType(obj.type)
                        });
                    });

                    var shareData = {
                        body: {
                            task: {
                                id: that.taskId
                            }
                        },
                        dests: dests,
                        type: global.messageType.taskShare
                    };

                    that.peopleSelect.addLoadingState();

                    that.shareTask(shareData).success(function(response) {
                        if (response.errcode === 0) {
                            that.peopleSelect.removeLoadingState();
                            that.peopleSelect.hide();
                        } else {
                            that.peopleSelect.removeLoadingState();
                        }
                    }).error(function() {
                        that.peopleSelect.removeLoadingState();
                    });

                });

                that.listenTo(that.peopleSelect, "hide", function() {
                    that.stopListening(that.peopleSelect);
                    that.peopleSelect.destroy();
                    that.peopleSelect = null;
                });
            }
            that.peopleSelect.show();
        });

        // 转换type， 发送消息的类型和app的人员类型不一样
        function transferType(str) {
            switch (str) {
                case "department":
                    return 3;
                case "people":
                    return 0;
                case "discussionGroup":
                    return 1;
            }
        }

        this.$okbtn.on("click", function() {
            that.saveSubjectAndContent();
        });

        this.$cancelbtn.on("click", function() {
            that.recoverSubjectAndContent();
        });

        this.initStatusEvent();
        this.initSubjectEvent();
        this.initContentEvent();
        this.initAssigneeEvent();
        this.initDatedueEvent();
        this.initExpecthourEvent();
        this.initSpenthourEvent();
    },

    initStatusEvent: function() {
        var that = this;
        this.listenTo(this.modules.status, "change", function(status) {
            var data = {
                status: status
            };

            function success(response) {
                that.taskModel.set("status", response.status);
                that.modules.status.set(that.taskModel.get("status"));
            }

            function error() {
                that.modules.date_due.set(that.taskModel.get("status"));
                point.shortShow({
                    text: "修改任务状态失败",
                    type: "error"
                });
            }

            that.modify({
                type: "status",
                data: data,
                success: success,
                error: error
            });

        });
    },

    initSubjectEvent: function() {
        var that = this;
        this.listenTo(this.modules.subject, "input", function() {
            that.showSaveButtons(true);
        });
    },

    initContentEvent: function() {
        var that = this;

        this.listenTo(this.modules.content, "input", function() {
            that.showSaveButtons(true);
        });
    },

    showSaveButtons: function(isShow) {
        if (isShow) {
            this.$buttons.removeClass("hide");
            this.modules.content.$el.addClass("short-margin");
        } else {
            this.$buttons.addClass("hide");
            this.modules.content.$el.removeClass("short-margin");
        }
    },

    initAssigneeEvent: function() {
        var that = this;
        this.listenTo(this.modules.assignee, "change", function(assignee) {
            var data = {
                assignee: assignee
            };

            function success(response) {
                that.taskModel.set(response);
                that.modules.assignee.set(that.taskModel.get("assignee_info"));
            }

            function error() {
                that.modules.assignee.set(that.taskModel.get("assignee_info"));
                point.shortShow({
                    text: "修改负责人失败",
                    type: "error"
                });
            }

            that.modify({
                type: "assignee",
                data: data,
                success: success,
                error: error
            });
        });
    },

    initDatedueEvent: function() {
        var that = this;
        this.listenTo(this.modules.date_due, "change", function(date_due) {
            var data = {
                date_due: date_due
            };

            function success(response) {
                that.taskModel.set("date_due", response.date_due);
                that.modules.date_due.set(that.taskModel.get("date_due"));
            }

            function error() {
                that.modules.date_due.set(that.taskModel.get("date_due"));
                point.shortShow({
                    text: "修改预计完成时间失败",
                    type: "error"
                });
            }

            that.modify({
                type: "due",
                data: data,
                success: success,
                error: error
            });

        });
    },

    initExpecthourEvent: function() {
        var that = this;
        this.listenTo(this.modules.expected_hours, "blur", function() {
            var data = {
                expected_hours: that.modules.expected_hours.get()
            };

            function success(response) {
                that.taskModel.set("expected_hours", response.expected_hours);
                that.modules.expected_hours.set(that.taskModel.get("expected_hours"));
            }

            function error() {
                that.modules.expected_hours.set(that.taskModel.get("expected_hours"));
                point.shortShow({
                    text: "修改预计耗时失败",
                    type: "error"
                });
            }

            that.modify({
                type: "expectHour",
                data: data,
                success: success,
                error: error
            });
        });
    },

    initSpenthourEvent: function() {
        var that = this;
        this.listenTo(this.modules.spent_hours, "blur", function() {
            var data = {
                spent_hours: that.modules.spent_hours.get()
            };

            function success(response) {
                that.taskModel.set("spent_hours", response.spent_hours);
                that.modules.spent_hours.set(that.taskModel.get("spent_hours"));
            }

            function error() {
                that.modules.spent_hours.set(that.taskModel.get("spent_hours"));
                point.shortShow({
                    text: "修改实际耗时失败",
                    type: "error"
                });
            }

            that.modify({
                type: "spentHours",
                data: data,
                success: success,
                error: error
            });
        });
    },

    initPeopleSelectEvent: function() {
        var that = this;

        this.listenTo(this.peopleSelect, "cancel", function() {});

        this.listenTo(this.peopleSelect, "ok", function(data) {
            var dests = [];

            $.each(data, function(index, obj) {
                dests.push({
                    id: obj.id,
                    type: transferType(obj.type)
                });
            });
            if (data.length > 0) {
                var shareData = {
                    body: {
                        task: {
                            id: that.taskId
                        }
                    },
                    dests: dests,
                    type: global.messageType.taskShare
                }
                that.shareTask(shareData);
            }
        });

        // 转换type， 发送消息的类型和app的人员类型不一样
        function transferType(num) {
            switch (num) {
                case 0:
                    return 0;
                case 1:
                    return 3;
                case 2:
                    return 1;
            }
        }
    },

    // 关联任务model的标记完成事件
    addModelEvent: function() {
        var that = this;
        this.listenTo(this.taskModel, "change:is_completed", function() {
            var state = that.taskModel.get("is_completed");
            if (state) {
                that.$state.addClass("complete");
                that.$state.tooltipster("content", "标记未完成");
            } else {
                that.$state.removeClass("complete");
                that.$state.tooltipster("content", "标记完成");
            }
        });
    },

    // 更换任务详情的时候，需要推掉对该任务model的事件
    removeModelEvent: function() {
        if (this.taskModel) {
            this.stopListening(this.taskModel);
        }
    },

    shareTask: function(data) {
        var that = this,
            id = this.taskModel.get("id");

        if (this[id + "shareTasking"]) {
            return;
        }
        this[id + "shareTasking"] = true;

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/messages",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(response) {
                if (response.errcode === 0) {
                    point.shortShow({
                        text: "任务分享成功",
                        type: "success"
                    });
                } else {
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },

            error: function() {
                point.shortShow({
                    text: "网络异常，请检查您的网络设置",
                    type: "error"
                });
            },

            complete: function() {
                that[id + "shareTasking"] = null;
            }
        });
    },

    changeState: function() {
        var that = this,
            taskModel = this.taskModel,
            state = taskModel.get("is_completed"),
            id = taskModel.get("id");

        if (this[id + "changeStating"]) {
            return;
        }
        this[id + "changeStating"] = true;

        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + taskModel.get("id"),
            type: "PATCH",
            contentType: "application/json",
            data: JSON.stringify({
                is_completed: 1 - state
            }),
            success: function(response) {
                if (response.errcode === 0) {
                    taskModel.set("is_completed", response.data.is_completed);
                } else {
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },
            error: function() {
                point.shortShow({
                    type: "error",
                    text: "网络异常，请检查您的网络设置"
                });
            },
            complete: function() {
                that[id + "changeStating"] = null;
            }
        });
    },

    modify: function(obj) {
        var that = this,
            taskModel = this.taskModel,
            id = taskModel.get("id"),
            type = id + "modify" + obj.type;

        if (this[type]) {
            return;
        }
        this[type] = true;

        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + taskModel.get("id"),
            type: "PATCH",
            contentType: "application/json",
            data: JSON.stringify(obj.data),
            success: function(response) {
                if (response.errcode === 0) {
                    obj.success(response.data);
                } else {
                    obj.error();
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },
            error: function() {
                obj.error();
                point.shortShow({
                    type: "error",
                    text: "网络异常，请检查您的网络设置"
                });
            },
            complete: function() {
                that[type] = null;
            }
        });
    },

    removeTask: function() {
        var that = this,
            taskModel = this.taskModel,
            id = taskModel.get("id");

        if (this[id + "removeTasking"]) {
            return;
        }
        this[id + "removeTasking"] = true;

        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + taskModel.get("id"),
            type: "DELETE",
            success: function(response) {
                if (response.errcode === 0) {
                    global.event.trigger("taskRemoved", taskModel.get("id"));
                    that.clear();
                } else {
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }

            },
            error: function() {
                point.shortShow({
                    text: "删除任务失败",
                    type: "error"
                });
            },
            complete: function() {
                that[id + "removeTasking"] = null;
            }
        });
    },


    saveSubjectAndContent: function() {
        var title = this.modules.subject.get();
        if (title.length === 0) {
            point.shortShow({
                text: "请填写任务标题"
            });
            return false;
        }

        this.$okbtn.addClass("loading");
        var data = {
            subject: title,
            tags: this.modules.subject.getTags(),
            content: this.modules.content.get()
        };

        var that = this,
            taskModel = this.taskModel;

        function success(response) {
            taskModel.set("subject", response.subject);
            taskModel.set("tags", response.tags);
            taskModel.set("content", response.content);

            var subject = {
                text: taskModel.get("subject"),
                tags: taskModel.get("tags"),
            };
            that.modules.subject.set(subject);
            that.modules.content.set(taskModel.get("content"));
            that.$okbtn.removeClass("loading");
            that.showSaveButtons(false);
        }

        function error() {
            var subject = {
                text: taskModel.get("subject"),
                tags: taskModel.get("tags")
            };
            that.modules.subject.set(subject);
            that.modules.content.set(taskModel.get("content"));
            point.shortShow({
                text: "修改标题和描述失败",
                type: "error"
            });
            that.$okbtn.removeClass("loading");
        }

        this.modify({
            type: "subjectAndContent",
            data: data,
            success: success,
            error: error
        });
    },

    recoverSubjectAndContent: function() {
        this.showSaveButtons(false);
        var subject = {
            text: this.taskModel.get("subject"),
            tags: this.taskModel.get("tags")
        };
        this.modules.subject.set(subject);
        this.modules.content.set(this.taskModel.get("content"));
    },

    clear: function() {
        this.removeModelEvent();
        this.taskModel = null;
        this.projectModel = null;
        this.taskId = null;

        $.each(this.modules, function(key, module) {
            module.clear();
        });

        this.$state.removeClass("complete");
        this.showSaveButtons(false);
    },

    set: function(option) {
        this.clear();
        this.projectModel = option.projectModel;
        this.taskModel = option.taskModel;
        this.taskId = this.taskModel.get("id");
        this.setForm();
        this.addModelEvent();
        this.$form.scrollTop(0);
    },

    setForm: function() {
        var data = this.taskModel.toJSON();
        var subject = {
            text: data.subject,
            tags: data.tags
        };
        this.modules.status.set(data.status);
        this.modules.subject.set(subject);
        this.modules.content.set(data.content);
        this.modules.status.setStatusList(this.projectModel.toJSON().status);
        
        this.modules.attachments.set({
            taskId: this.taskId,
            data: data.attachments,
            taskModel: this.taskModel
        });

        this.setAssigneeData();

        this.modules.date_due.set(data.date_due);
        this.modules.expected_hours.set(data.expected_hours);
        this.modules.spent_hours.set(data.spent_hours);
        this.modules.operates.set(this.taskModel);

        if (data.is_completed) {
            this.$state.addClass("complete");
            this.$state.tooltipster("content", "标记未完成");
            this.modules.status.disableChangeStatus();
        } else {
            this.$state.tooltipster("content", "标记完成");
        }

        this.modules.comments.loadData(data.id);
    },

    // 设置负责人模块的数据（负责人和可以选择的负责人）
    setAssigneeData: function() {
        this.modules.assignee.setProjectId(this.projectModel.get("id"));
        this.modules.assignee.set(this.taskModel.get("assignee_info"));
    },

    show: function(option) {

        if (this.showing) {
            return;
        }
        this.showing = true;
        this.$el.show();

        if (option) {
            this.set(option);
        }
    },

    hide: function() {
        if (this.showing) {
            this.showing = false;
            this.$el.hide();
        }
    },

    destroy: function() {
        $.each(this.modules, function(key, module) {
            module.destroy();
        });

        if (this.confirmShow) {
            confirm.hide();
        }

        this.remove();
        global.modules.taskDetail = null;
    }
});


module.exports = View;
