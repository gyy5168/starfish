var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    point = require("modules-common/point/point.js"),
    TaskCreate = require("modules/task/task-create/task-create.js"),
    ItemView = require("./list-item/list-item.js");

var View = Backbone.View.extend({
    attributes: {
        class: "task-list-view"
    },
    pageNum: 1,
    pageSize: 30,

    initialize: function(options) {
        this.options = options;
        this.projectId = options.id;
        this.projectAction = options.action;

        this.list = new Backbone.Collection();

        this.render();
        this.initListEvent();
        this.initClickEvent();
        this.initScrollEvent();
        this.load();
    },

    render: function() {
        var that = this;

        var projectModel = global.data.projectList.get(parseInt(this.projectId));
        topBar.showTitle(projectModel.get("name"));
        topBar.setBack($.proxy(this.back, this));

        var action = this.projectAction;
        if (action == "uncompleted") {
            topBar.showMenu([{
                iconUrl: window.location.origin + __uri("/modules-common/top-bar/img/title_bar_add_icon_normal.png"),
                callback: $.proxy(that.taskCreate, that)
            }]);
        } else {
            topBar.showMenu([]);
        }

        this.$el.append(__inline("task-list.html"));

        this.$list = this.$el.find(".JS-list");

        this.$nav = this.$el.find(".JS-nav");
        this.$nav.find("span[data-attr=" + action + "]").addClass("selected");

        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$empty = this.$el.find(".JS-empty");

        this.$moreLoading = this.$el.find(".JS-more-loading");
        this.$moreError = this.$el.find(".JS-more-error");
        this.$noMore = this.$el.find(".JS-no-more");

        global.$doc.append(this.$el)
    },

    initListEvent: function() {
        var that = this;
        this.listenTo(this.list, "add", this.addItem);
        this.listenTo(this.list, "remove", this.removeItem);

        this.listenTo(this.list, "reset", function(models, options) {
            $.each(options.previousModels, function(model) {
                that.removeItem(model);
            });

            that.list.each(function(model) {
                that.addItem(model);
            });
        });

        this.listenTo(this.list, "add reset remove destroy", function() {
            if (that.list.length === 0) {
                that.$empty.show();
                that.$list.hide();
            } else {
                that.$list.show();
                that.$empty.hide();
            }
        });
    },

    initClickEvent: function() {
        var that = this;
        this.$nav.on("click", "span", function() {
            var $this = $(this),
                action = $this.data("attr");
            router.navigate('taskList/' + that.projectId + '/' + action, {
                trigger: true
            });
        });
        // this.$list.on("click", ".task-subject,.task-btm", function() {
        //     var $this = $(this),
        //         action = $this.data("attr");
        //     router.navigate('taskList/' + that.projectId + '/' + action, {
        //         trigger: true
        //     });
        // });
    },

    initScrollEvent: function() {
        var that = this;
        this.$list.on("scroll", function(event) {
            if (that.noMore) {
                return;
            }
            if (that.moreList) {
                return;
            }
            if (this.scrollTop + that.$el.height() >= this.scrollHeight) {
                handle();
            }

        });
        var handle = _.throttle(_.bind(this.loadMore, this), 2000);
    },

    load: function() {
        var that = this,
            options = this.options,
            url;

        that.$error.hide();
        that.$empty.hide();
        that.$loading.show();


        var pageFilter = "&pn=" + this.pageNum + "&ps=" + this.pageSize;

        if (options.action == "uncompleted") {
            url = global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks?project_id=" + options.id + "&is_completed=0&order_by=-date_added" + pageFilter;
        } else if (options.action == "completed") {
            url = global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks?project_id=" + options.id + "&is_completed=1&order_by=-date_completed" + pageFilter;
        } else if (options.action == "myUncompleted") {
            url = global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks?project_id=" + options.id + "&is_completed=0&assignee=" + global.data.user.id + "&order_by=-date_completed" + pageFilter;
        } else if (options.action == "myCompleted") {
            url = global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks?project_id=" + options.id + "&is_completed=1&assignee=" + global.data.user.id + "&order_by=-date_added" + pageFilter;
        }
        $.ajax({
            url: url,
            type: "GET",
            dataFilter: function(response) {
                response = response.replace("<", "&lt;");
                response = response.replace(">", "&gt;");
                return response;
            },

            success: function(response) {
                if (response.errcode == 0) {
                    that.list.reset(response.data);
                } else {
                    point.shortShow({
                        "text": global.tools.getErrmsg(response.errcode)
                    })
                }
            },

            error: function() {
                that.$loading.hide();
                that.$empty.hide();
                that.$error.show();

                point.shortShow({
                    text: global.texts.netError
                });
                that.$error.one("click", function() {
                    that.load();
                })
            },

            complete: function() {
                that.$loading.hide();
            }
        })
    },

    loadMore: function(pageNum) {
        var pageNum = this.pageNum + 1;
        if (this.moreLoading || this.noMore) {
            return;
        }
        this.moreLoading = true;
        var that = this,
            options = this.options,
            url;
        that.$moreError.hide();
        that.$moreLoading.show();

        var pageFilter = "&pn=" + pageNum + "&ps=" + this.pageSize;

        if (options.action == "uncompleted") {
            url = global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks?project_id=" + options.id + "&is_completed=0&order_by=-date_added" + pageFilter;
        } else if (options.action == "completed") {
            url = global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks?project_id=" + options.id + "&is_completed=1&order_by=-date_completed" + pageFilter;
        } else if (options.action == "myUncompleted") {
            url = global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks?project_id=" + options.id + "&is_completed=0&assignee=" + global.data.user.id + "&order_by=-date_completed" + pageFilter;
        } else if (options.action == "myCompleted") {
            url = global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks?project_id=" + options.id + "&is_completed=1&assignee=" + global.data.user.id + "&order_by=-date_added" + pageFilter;
        }
        $.ajax({
            url: url,
            type: "GET",
            dataFilter: function(response) {
                response = response.replace("<", "&lt;");
                response = response.replace(">", "&gt;");
                return response;
            },

            success: function(response) {
                if (response.errcode == 0) {
                    $.each(response.data, function(index, model) {
                        that.list.add(model);
                    });
                    if (response.data.length < that.pageSize) {
                        that.$noMore.show();
                        that.noMore = true;
                    }
                    that.pageNum++;
                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode)
                    })
                }
            },

            error: function() {
                that.$moreLoading.hide();
                that.$moreError.show();
                point.shortShow({
                    text: global.texts.netError
                });
                that.$moreError.one("click", function() {
                    that.loadMore(pageNum);
                })
            },

            complete: function() {
                that.$moreLoading.hide();
                that.moreLoading = false;
            }
        })
    },

    addItem: function(model, list, option) {
        var view = new ItemView({
            model: model
        });
        this.$moreLoading.before(view.$el);
    },

    removeItem: function(model) {

    },

    taskCreate: function() {
        var that = this;
        this.destroy();
        new TaskCreate({
            id: that.projectId,
            action: that.projectAction
        });
        router.navigate('taskCreate', {
            trigger: true
        });
    },

    back: function() {
        this.destroy();
        router.navigate('', {
            trigger: true
        });
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View;
