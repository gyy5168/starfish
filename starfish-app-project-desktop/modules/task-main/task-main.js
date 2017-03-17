var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    ListView = require("./task-list/task-list.js"),
    TaskFilter = require("./task-filter/task-filter.js"),
    urlTool = require("modules-common/tools/url.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

    tagName: "div",

    attributes: {
        "class": "task-list-view"
    },

    initialize: function() {
        global.data.conditionList = global.data.conditionList || new Backbone.Collection();
        this.conditionList = global.data.conditionList;
        this.render();
        this.initEvent();
        global.modules.taskMain = this;
    },

    render: function() {
        this.$el.html(__inline("task-main.html"));

        this.$content = this.$el.find(".JS-content-main");
        this.$condition = this.$el.find(".JS-condition");

        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$errorBtn = this.$el.find(".JS-btn");
        this.$createBtn = this.$el.find(".JS-btn-create");
        this.$statisticsBtn = this.$el.find(".JS-btn-statistics");

        this.$filter = this.$el.find(".JS-filter");
        this.$title = this.$el.find(".JS-title");
        this.$list = this.$el.find(".JS-list");

        this.listView = new ListView();

        this.$list.append(this.listView.$el);
        $("#wraper").append(this.$el);
    },

    initEvent: function() {
        var that = this;

        // 加载失败， 点击重新加载
        this.$errorBtn.on("click", function() {
            that.set(that.param);
        });

        this.$createBtn.on("click", function() {
            if (that.completed !== "uncompleted") {
                point.shortShow({
                    text: "只能在未完成列表中，创建任务"
                });
                return;
            }
            global.event.trigger("showTaskCreate");
        });

        this.$statisticsBtn.on("click", function() {
            global.event.trigger("showStatistics");
        });

        this.$el.find(".JS-index").on("click", function(event) {
            var router = global.modules.router;
            event.preventDefault();
            router.navigate("", {
                trigger: true
            });
        });
        this.$condition.on("click", ".JS-remove", function(event) {
            var id = $(this).closest("span").data("attr"),
                type = $(this).closest("span").data("type");
            $(this).closest("span").remove();
            that.conditionList.remove({
                id: id,
                type: type
            });

            var param = urlTool.removeParamValue(that.param, type, id);

            if (type == "assignee") {
                param = urlTool.removeParam(param, "assignee_name");
            }
            global.modules.router.navigate("task?" + param, {
                trigger: true
            });
        });
        this.listenTo(this.conditionList, "add", function(model) {
            that.$condition.append(__inline("condition-item.tmpl")(model.toJSON()));
        });

        this.listenTo(this.conditionList, "add remove reset", function() {
            if (that.conditionList.length === 0) {
                that.$condition.hide();
            } else {
                that.$condition.show();
            }
            var height = (that.$filter.outerHeight() + 66) + "px";
            that.$list.css({
                "top": height
            });
        });

        this.initFilterEvent();
    },

    initFilterEvent: function() {
        var that = this;
        // this.$filter.find(".JS-item").removeClass("active");
        this.$filter.on("click", ".JS-item", function() {

            var $this = $(this),
                attr = $this.data("attr"),
                param = that.param;
            // that.conditionList.reset([]);
            // that.$condition.find(".condition-item").remove();
            var router = global.modules.router;
            if (that.completed == "myCompleted" || that.completed == "myUncompleted") {
                param = urlTool.removeParam(param, "assignee");
                param = urlTool.removeParam(param, "assignee_name");
                that.$condition.find(".condition-item[data-type=assignee]").remove();
                that.conditionList.remove(that.conditionList.where({
                    type: "assignee"
                }));
            }
            param = urlTool.setParam(param, "navType", attr);
            if (attr === "completed") {
                param = urlTool.setParam(param, "is_completed", 1);
                param = urlTool.removeParam(param, "status");
                that.$condition.find(".condition-item[data-type=status]").remove();
                // that.conditionList.remove({
                //     type: "status"
                // });
                that.conditionList.remove(that.conditionList.where({
                    type: "status"
                }));

                router.navigate("task?" + param, {
                    trigger: true
                });
            } else if (attr === "uncompleted") {
                param = urlTool.setParam(param, "is_completed", 0);

                router.navigate("task?" + param, {
                    trigger: true
                });
            } else if (attr === "myUncompleted") {
                param = urlTool.setParam(param, "is_completed", 0);

                param = urlTool.removeParam(param, "assignee");
                param = urlTool.removeParam(param, "assignee_name");
                that.$condition.find(".condition-item[data-type=assignee]").remove();
                that.conditionList.remove(that.conditionList.where({
                    type: "assignee"
                }));

                router.navigate("task?" + param + "&assignee=" + global.data.user.get("id"), {
                    trigger: true
                });
            } else if (attr === "myCompleted") {
                param = urlTool.setParam(param, "is_completed", 1);
                
                param = urlTool.removeParam(param, "assignee");
                param = urlTool.removeParam(param, "assignee_name");
                that.$condition.find(".condition-item[data-type=assignee]").remove();
                that.conditionList.remove(that.conditionList.where({
                    type: "assignee"
                }));

                param = urlTool.removeParam(param, "status");
                that.$condition.find(".condition-item[data-type=status]").remove();
                that.conditionList.remove({
                    type: "status"
                });

                router.navigate("task?" + param + "&assignee=" + global.data.user.get("id"), {
                    trigger: true
                });
            } else if (attr === "more") {
                that.conditionList.reset([]);
                that.$condition.find(".condition-item").remove();
                var moreParam;
                if ($(this).hasClass("active")) {
                    moreParam = that.param;
                } else {
                    moreParam = "";
                }

                that.taskFilter = new TaskFilter({
                    param: moreParam,
                    projectObj: that.projectModel.toJSON(),
                    projectId: that.projectId
                });

                that.taskFilter.show();
            }
            // if (attr === "completed") {
            //     router.navigate("task?is_completed=1&project_id=" + that.projectId + "&navType=" + attr, {
            //         trigger: true
            //     });
            // } else if (attr === "uncompleted") {
            //     router.navigate("task?is_completed=0&project_id=" + that.projectId + "&navType=" + attr, {
            //         trigger: true
            //     });
            // } else if (attr === "myUncompleted") {
            //     router.navigate("task?is_completed=0&assignee=" + global.data.user.get("id") + "&project_id=" + that.projectId + "&navType=" + attr, {
            //         trigger: true
            //     });
            // } else if (attr === "myCompleted") {
            //     router.navigate("task?is_completed=1&assignee=" + global.data.user.get("id") + "&project_id=" + that.projectId + "&navType=" + attr, {
            //         trigger: true
            //     });
            // } else if (attr === "more") {
            //     var param;
            //     if ($(this).hasClass("active")) {
            //         param = that.param;
            //     } else {
            //         param = "";
            //     }

            //     that.taskFilter = new TaskFilter({
            //         param: param,
            //         projectObj: that.projectModel.toJSON(),
            //         projectId: that.projectId
            //     });

            //     that.taskFilter.show();
            // }
        });
    },

    setWidth: function(str) {
        this.listView.setWidth(str);
    },

    set: function(option) {

        this.projectModel = option.projectModel;
        this.completed = urlTool.getParam(option.param, "navType")[0] || "uncompleted";

        this.param = option.param;
        this.projectId = this.projectModel.get("id");

        // this.analyze(this.param);
        this.setNav();
        this.setFilter();
        this.listView.set(this.param);
    },

    // 解析出字符串中的值和状态
    analyze: function(param) {

        var myUncompletedUrl = "is_completed=0&assignee=" + global.data.user.get("id") + "&project_id=" + this.projectId,
            myCompletedUrl = "is_completed=1&assignee=" + global.data.user.get("id") + "&project_id=" + this.projectId;

        if (param === myUncompletedUrl) {
            this.completed = "myUncompleted";
        } else if (param === myCompletedUrl) {
            this.completed = "myCompleted";
        } else {
            var complete = param.indexOf("is_completed=1") >= 0,
                uncomplete = param.indexOf("is_completed=0") >= 0,
                me = param.indexOf("assignee=" + global.data.user.get("id")) >= 0;

            if (complete && uncomplete) {
                this.completed = "more";
            } else if (complete) {
                this.completed = "completed";
            } else if (uncomplete) {
                this.completed = "uncompleted";
            } else {
                this.completed = "more";
            }
        }
        // var complete = param.indexOf("is_completed=1") >= 0,
        //     uncomplete = param.indexOf("is_completed=0") >= 0,
        //     me = param.indexOf("assignee=" + global.data.user.get("id")) >= 0;

        // if (complete && uncomplete) {
        //     this.completed = "all";
        // } else if (complete && me) {
        //     this.completed = "myCompleted";
        // } else if (complete) {
        //     this.completed = "completed";
        // } else if (uncomplete && me) {
        //     this.completed = "myUncompleted";
        // } else if (uncomplete) {
        //     this.completed = "uncompleted";
        // } else {
        //     this.completed = "all";
        // }

        // if (complete && uncomplete) {
        //  this.completed = "all";
        // } else if ( complete && me ){
        //  this.completed = "myCompleted";
        // } else if (complete && !uncomplete) {
        //  this.completed = "completed";
        // } else if (!complete && uncomplete) {
        //  this.completed = "uncompleted";
        // } else {
        //  this.completed = "all";
        // }
    },

    setNav: function() {
        this.$title.html("> " + this.projectModel.get("name"));
    },

    setFilter: function() {
        this.$filter.find(".JS-item").removeClass("active");
        var completed = this.completed;

        this.$filter.find(".JS-item[data-attr=" + completed + "]").addClass("active");

        if (this.conditionList.length) {
            return;
        }
        this.loadConditions();

    },

    loadConditions: function() {
        var that = this;

        if (this.param.indexOf("key_tag_id") >= 0) {
            var tags = urlTool.getParam(this.param, "key_tag_id");
            var projectTagList = this.projectModel.toJSON().tags;
            if (projectTagList.length) {
                $.each(projectTagList, function(index, item) {
                    if (tags.indexOf(item.id.toString()) != -1) {
                        that.conditionList.add({
                            id: item.id,
                            name: item.name,
                            type: "key_tag_id",
                            typeName: "标签"
                        });
                    }
                });
            }
        }
        if (this.param.indexOf("assignee") >= 0) {
            if (this.completed != "myCompleted" && this.completed != "myUncompleted") {
                var id = urlTool.getParam(this.param, "assignee")[0];
                var projectMemberList = this.projectModel.toJSON().members_info;
                if (projectMemberList.length) {
                    $.each(projectMemberList, function(index, item) {

                        if (item.id == id) {
                            that.conditionList.add({
                                type: "assignee",
                                typeName: "负责人",
                                id: item.id,
                                name: item.name
                            });
                        }
                    });
                }
            }
        }
        if (this.param.indexOf("status") >= 0) {
            var id = urlTool.getParam(this.param, "status")[0];
            var projectStatusList = this.projectModel.toJSON().status;
            if (projectStatusList.length) {
                $.each(projectStatusList, function(index, item) {

                    if (item.id == id) {
                        that.conditionList.add({
                            type: "status",
                            typeName: "状态",
                            id: item.id,
                            name: item.name
                        });
                    }
                });
            }
        }
    },

    getSelected: function() {
        return this.listView.getSelected();
    },

    show: function(option) {
        if (this.showing) {
            return;
        }

        this.showing = true;
        this.$el.show();

        if (option) {
            this.set(option)
        }
    },

    hide: function() {
        if (this.showing) {
            this.showing = false;
            this.$el.hide();
        }
    },

    clear: function() {
        this.$loading.hide();
        this.$error.hide();
        this.$content.hide();
    },

    destroy: function() {
        this.taskFilter && this.taskFilter.destroy();
        this.listView.destroy();
        this.remove();
        global.modules.taskMain = null;
    }
});

module.exports = View;
