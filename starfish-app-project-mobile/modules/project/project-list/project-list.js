var Backbone = require("modules-common/backbone/backbone.js"),
    _ = require("modules-common/underscore/underscore.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    point = require("modules-common/point/point.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    ListItem = require("./list-item/list-item.js");

var View = Backbone.View.extend({
    attributes: {
        class: "project-list-view"
    },
    pageNum: 1,
    pageSize: 30,

    initialize: function() {
        global.data.projectList = new Backbone.Collection();
        this.list = global.data.projectList;
        this.render();
        this.initListEvent();
        this.initClickEvent();
        this.load();
    },

    render: function() {
        var that = this;

        topBar.setTitle("项目");
        topBar.setBack($.proxy(this.back, this));

        if (global.data.user.attributes.is_admin != 1) {
            topBar.showMenu([]);
        } else {
            topBar.showMenu([{
                iconUrl: window.location.origin + __uri("/modules-common/top-bar/img/title_bar_add_icon_normal.png"),
                callback: $.proxy(that.showCreateProjcetPage, that)
            }]);
        }

        this.$el.append(__inline("project-list.html"));

        this.$empty = this.$el.find(".JS-empty");
        this.$error = this.$el.find(".JS-error");
        this.$error.show();
        this.$loading = this.$el.find(".JS-loading");
        this.$list = this.$el.find(".JS-list");
        global.$doc.append(this.$el);
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
        // 项目详情图标点击 显示项目详情
        this.$el.on("click", 'li .JS-detail', function(evt) {
            var id = $(this).closest("li").data("id");
            router.navigate('projectDetail/' + id, {
                trigger: true
            });
        });
        // 项目title点击 显示任务列表
        this.$el.on("click", 'li .JS-title', function(evt) {
            var id = $(this).closest("li").data("id");
            router.navigate('taskList/' + id + '/uncompleted', {
                trigger: true
            });
        })
    },

    showCreateProjcetPage: function() {
        router.navigate('projectCreate', {
            trigger: true
        });
    },

    load: function() {
        var that = this;
        that.$error.hide();
        this.$loading.show();

        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/projects",
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
                that.$error.show();
                that.$empty.hide();
                that.$loading.hide();
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

    addItem: function(model, list, option) {
        var item = new ListItem({
            model: model
        });

        this.$list.prepend(item.$el);
    },

    removeItem: function(model) {

    },

    back: function() {
        global.starfishBridge("finish");
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View;
