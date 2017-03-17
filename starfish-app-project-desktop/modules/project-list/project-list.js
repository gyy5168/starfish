var $ = require("modules-common/jquery/jquery.js"),
    _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    ProjectDetail = require("modules/project-detail/project-detail.js"),
    ItemView = require("./project-list-item/project-list-item.js");

var View = Backbone.View.extend({

    attributes: {
        "class": "project-list-view"
    },

    membersCount: 8, //显示N个项目成员

    initialize: function() {
        global.modules.projectList = this;
        global.data.projectList = global.data.projectList || new Backbone.Collection();

        this.render();
        this.initEvent();
        this.initClickEvent();

        this.fetch();

        // var projectList = global.data.projectList;
        // 如果有数据，直接渲染，没有的话，从服务器拉取
        // if ( projectList.length > 0 ) {
        // this.loadData( projectList );
        // } else {
        // this.fetch();
        // }
    },

    render: function() {
        this.$el.html(__inline("project-list.html"));

        this.$list = this.$el.find("ul");
        this.$add = this.$el.find(".JS-add");
        this.$empty = this.$el.find(".JS-empty");
        this.$loading = this.$el.find(".JS-loading");
        this.$loadError = this.$el.find(".JS-error");

        this.projectStatus="open";
        // 如果是管理员，则显示创建项目的入口
        var isAdmin = global.data.org.get("isAdmin");
        if (isAdmin) {
            this.$add.show();
            // this.addProjectStatus();
        }

        $("#wraper").append(this.$el);
    },

    initEvent: function() {
        var that = this,
            projectList = global.data.projectList;

        this.listenTo(projectList, "add", this.addItem);
        this.listenTo(projectList, "remove", this.removeItem);
        this.listenTo(projectList, "reset", function(list, option) {
            $.each(option.previousModels, function(index, model) {
                that.removeItem(model);
            });
            projectList.each(function(model, index, list) {
                that.addItem(model, list);
            });
        });

        // 当列表为空时，显示空界面
        this.listenTo(projectList, "add remove reset", function() {
            var isAdmin = global.data.org.get("isAdmin");
            // 如果列表中没有数据，且不是管理员显示“空界面”
            // 如果是管理员，列表中会有添加项目的菜单，不需要显示“空界面”
            if (projectList.length === 0 && !isAdmin) {
                that.$empty.show();
                that.$list.hide();
            } else {
                that.$empty.hide();
                that.$list.show();
            }
        });

        // 项目关闭时，删除数据
        this.listenTo(projectList, "change:is_closed", function(model, value) {
            if (value) {
                projectList.remove(model);
            }
        });

        // 创建项目成功后， 添加数据
        // this.listenTo( global.event, "projectCreated", function( obj ) {
        // 	projectList.add(obj);
        // });

    },

    initClickEvent: function() {
        var that = this;
        this.$add.on("click", function() {
            var router = global.modules.router;
            router.navigate("projectCreate", {
                trigger: true
            });
        });

        // 加载失败中的重新加载按钮
        this.$loadError.find(".JS-btn").on("click", function() {
            that.fetch();
        });

        // 点击项目，进入对应任务列表
        this.$el.on("click", ".JS-project-item", function() {
            var projectId = $(this).data("id");
            global.modules.router.navigate("task?is_completed=0&project_id=" + projectId, {
                trigger: true
            });
        });

        // 进入项目详情
        this.$el.on("click", ".JS-detail", function(event) {
            var view = $(this).closest(".JS-project-item").data("view"),
                id = view.model.get("id");

            var router = global.modules.router;
            router.navigate("projectDetail/" + id, {
                trigger: true
            });

            // if (!that.projectDetail) {
            // 	that.projectDetail = new ProjectDetail();
            // }
            // that.projectDetail.show();
            // that.projectDetail.clear();
            // that.projectDetail.set(view.model);

            event.stopPropagation();
        });

    },

    addProjectStatus: function() {
        this.$projectListStatus = $(__inline("project-list-status.html"));
        this.$el.prepend(this.$projectListStatus);
    },

    show: function() {
        if (this.showing) {
            return;
        }
        this.showing = true;
        this.$el.show();

    },

    hide: function() {
        if (this.showing) {
            this.showing = false;
            this.$el.hide();
        }
    },

    // 隐藏所有视图
    clear: function() {
        this.$loading.hide();
        this.$empty.hide();
        this.$loadError.hide();
        this.$list.hide();
    },

    // 装载数据
    loadData: function(list) {
        var that = this;
        list.each(function(model, index) {
            that.addItem(model);
        });
    },

    // 拉去数据
    fetch: function() {
        var that = this;

        if (this.fetching) {
            return;
        }

        this.clear();
        this.fetching = true;
        this.$loading.show();

        this.ajaxObj = $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/projects?members_count=8",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    global.data.projectList.reset(response.data);
                } else {
                    that.$loadError.show();
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },
            error: function() {
                that.$loadError.show();
            },
            complete: function() {
                that.$loading.hide();
                that.fetching = false;
                that.ajaxObj = null;
            }
        });
    },

    addItem: function(model, list, option) {
        var itemView = new ItemView({
            model: model,
            membersCount: this.membersCount
        });

        this.$add.after(itemView.$el);
    },

    removeItem: function(model, list) {
        var id = model.get("id");

        var view = this.$list.find("li[data-id=" + id + "]").data("view");
        if (view) {
            view.destroy();
        }
    },

    destroy: function() {

        // 清空数据，需要销毁视图对象
        this.$list.find(".JS-project-item").each(function() {
            $(this).data("view").destroy();
        });

        this.remove();

    }
});

module.exports = View;
