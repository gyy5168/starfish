var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    point = require("modules-common/point/point.js"),
    dateTool = require("modules-common/tools/date.js");

var View = Backbone.View.extend({

    tagName: "li",

    attributes: {
        "class": "task-list-item JS-task-item"
    },

    template: __inline("task-list-item.tmpl"),

    initialize: function(option) {
        this.parentView = option.parentView;
        this.model.view = this;
        this.render();
        this.initEvent();
    },

    render: function() {
        var obj = this.model.toJSON(),
            data = {};

        data.subject = obj.subject;
        data.index = this.parentView.list.indexOf(this.model) + 1;
        data.tags = obj.tags;
        data.status = obj.status;
        // if (data.status.name) {
        //     data.status.name = "["+data.status.name;
        // }
        if (obj.is_completed) {
            // data.status = {
            //     id: "",
            //     is_system: "",
            //     name: ""
            // };
            data.status.id="";
            data.status.is_system="";
            data.status.name ="";
        }
        data.markClass = obj.is_completed ? "completed" : "";

        data.markTitle = obj.is_completed ? "标记未完成" : "标记完成";

        var todayStamp = dateTool.getTodayStamp();

        if (obj.is_completed) {
            data.time = dateTool.formatDate(new Date(obj.date_completed * 1000), "yyyy-M-d");
            // data.time = dateTool.convertDate(obj.date_completed);
            data.timeClass = "completed";
            data.contentClass = "min";
        } else if (obj.date_due) {
            if (obj.date_due < todayStamp) {
                data.time = dateTool.formatDate(new Date(obj.date_due * 1000), "yyyy-M-d");
                // data.time = dateTool.convertDate(obj.date_due);
                data.timeClass = "uncompleted";
                data.contentClass = "min";
            } else {
                data.time = dateTool.formatDate(new Date(obj.date_due * 1000), "yyyy-M-d");
                // data.time = dateTool.convertDate(obj.date_due);
                data.timeClass = "expect";
                data.contentClass = "min";
            }
        } else {
            data.time = "";
            data.timeClass = "";
            data.contentClass = "";
        }

        if (obj.assignee_info) {
            data.charge = obj.assignee_info.name
        } else {
            data.charge = "未指定";
        }
        data.chargeId = obj.assignee;

        this.$el.attr("data-id", obj.id);
        this.$el.html(this.template(data));
        this.$el.data("view", this);
    },

    initEvent: function() {
        var that = this;
        this.listenTo(this.model, "change", function(model, option) {
            that.render();
        });
    },

    mark: function() {
        var complete = this.model.get("is_completed"),
            value = complete === 0 ? 1 : 0,
            that = this;

        if (this.marking) {
            return;
        }
        this.marking = true;

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + this.model.get("id"),
            type: "PATCH",
            data: JSON.stringify({
                is_completed: value
            }),
            success: success,
            error: error,
            complete: complete
        });

        function success(response) {
            if (response.errcode === 0) {
                that.model.set("is_completed", value);
            } else {
                point.shortShow({
                    type: "error",
                    text: global.tools.getErrmsg(response.errcode)
                });
            }
        }

        function error() {
            point.shortShow({
                type: "error",
                text: "网络异常，请检查您的网络设置"
            });
        }

        function complete() {
            that.marking = null;
        }
    },

    setIndex: function(value) {
        this.$el.find(".JS-index").html(value);
    },

    clearChargeTitle: function() {
        this.$el.find(".JS-charge").removeAttr("title");
    },

    destroy: function(hasAnim) {
        var that = this;
        this.$el.removeData();

        if (hasAnim) {
            this.$el.hide({
                duration: 400,
                complete: function() {
                    that.remove();
                    that.parentView.list.trigger("removed");
                }
            });
        } else {
            that.remove();
        }
    }

});

module.exports = View;
