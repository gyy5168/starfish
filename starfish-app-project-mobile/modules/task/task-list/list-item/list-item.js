var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    TaskDetail = require("modules/task/task-detail/task-detail.js"),
    point = require("modules-common/point/point.js"),
    confirm = require("modules-common/confirm/confirm.js");

var ItemView = Backbone.View.extend({
    tagName: "li",
    attributes: {
        class: "task-item"
    },
    template: __inline("list-item.tmpl"),

    initialize: function() {
        this.render();
        this.initEvent();
    },

    render: function() {
        var json = this.model.toJSON(),
            data = {};
        data.id = json.id;
        data.subject = json.subject;
        data.assignee = json.assignee_info.name;
        data.time = this.dateFormat(json.date_added);
        data.tags = json.tags;
        data.completeClass = json.is_completed ? "selected" : "";
        data.isCompleted = json.is_completed;
        this.$el.html(this.template(data));
        this.$complete = this.$el.find(".JS-complete");
    },

    initEvent: function() {
        var that = this;
        this.$complete.on("click", function(evt) {
            that.changeAction();
            evt.stopPropagation();
        });
        this.$el.on("click", function() {
            that.showTaskDetail();
        });
        
        
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
                        that.remove();

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

    showTaskDetail: function() {
        var that = this;
        var taskId = this.model.get("id");
        var projectId = this.model.get("project_id");
        this.taskDetail = new TaskDetail({
            model: this.model,
            projectId: projectId
        });
        this.listenTo(this.taskDetail, "delete", function() {
            that.destroy();
        });
        this.listenTo(this.taskDetail, "change", function(data) {
            for(var key in data){
                that.model.set(key,data[key]);
            }
            that.$el.off("click");
            that.render();
            that.initEvent();
        });
        // router.navigate('taskDetail/' + taskId, {
        //     trigger: true
        // });
    },

    dateFormat: function(utc) {
        var date = new Date(utc * 1000);
        var dateFormat = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
        var today = new Date();
        var todayFormat = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
        var time = (dateFormat == todayFormat) ? "今天" : dateFormat;
        return time;
    },

    back: function() {
        this.destroy();
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = ItemView;
