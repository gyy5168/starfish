var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    tools = require("modules-common/tools/tools.js"),
    router = require("../router/router.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    ItemView = require("./item-view/item-view.js");

var View = Backbone.View.extend({
    attributes: {
        class: "send-wrapper"
    },
    initialize: function(list) {
        this.itemViews = [];
        this.pathArr = [];

        topBar.setBack(_.bind(this.back, this));

        this.list = new Backbone.Collection();
        this.render();
        this.initEvent();
    },
    render: function() {
        this.$el.html(__inline("file-list.html"));
        this.$list = this.$el.find(".JS-move-bd-list")
        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$empty = this.$el.find(".JS-empty");
        this.$errorTxt = this.$error.find(".JS-common-text")
        global.$doc.append(this.$el)

    },

    initEvent: function() {
        var that = this;
        this.listenTo(this.list, "add", this.addItem);
        this.listenTo(this.list, "remove", this.removeItem);
        this.listenTo(this.list, "reset", function(models, options) {
            _.each(options.previousModels, function(model) {
                that.removeItem(model);
            });

            that.list.each(function(model) {
                that.addItem(model);
            });

            if (that.list.length === 0) {
                that.$empty.show();
            } else {
                that.$empty.hide();
            }
        });

        that.$error.on("click", function() {
            if (that.setIdsing) {
                that.setIdsing = false;
                that.setIds(that.loadingID)

            }
            if (that.setting) {
                that.setting = false;
                that.set(that.loadingID);

            }
        })
    },

    back: function() {
        if (router.getParam("type") === "root") {
            this.destroy();
            global.starfishBridge("finish");
        } else {
            history.back();
        }
    },

    setIds: function(ids) {
        var that = this;

        if (this.setIdsing) {
            return
        }

        this.setIdsing = true;
        this.loadingID = ids;
        this.$list.hide();
        this.$loading.show();
        this.$error.hide();

        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files/" + ids,
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.$list.show();
                    that.list.reset(response.data);
                    that.setIdsing = false;
                } else {
                    var errorTxt = tools.getErrmsg(response.errcode) + ",点击加载更多";
                    that.$errorTxt.text(errorTxt);
                    that.$error.show();
                }
                that.$loading.hide();
            },
            error: function(jqXHR, state) {
                var text;
                if (status === "abort") {
                    return;
                }
                if (status === "timeout" || status === "error") {
                    text = "操作失败，请检查网络";
                } else {
                    text = "返回的数据格式错误"
                }
                that.setting = false;
                that.$errorTxt.text(text);
                that.$error.show();
            }
        })
    },

    set: function(id) {
        var that = this;

        if (this.setting) {
            return
        }
        this.setting = true;
        this.loadingID = id;
        this.$list.hide();
        this.$loading.show();
        this.$error.hide();
        this.ajaxObj = $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files?parent=" + id,
            type: "GET",
            success: function(response) {
                if (response.errcode == 0) {
                    that.$list.show();

                    that.list.reset(response.data.children);
                } else {
                    var errorTxt = tools.getErrmsg(response.errcode) + ",点击加载更多";
                    that.$errorTxt.text(errorTxt);
                    that.$error.show();
                }
                that.setting = false;
                that.$loading.hide();
            },

            error: function(jqXHR, state) {
                var text;
                if (status === "abort") {
                    return;
                }
                if (status === "timeout" || status === "error") {
                    text = "操作失败，请检查网络";
                } else {
                    text = "返回的数据格式错误"
                }
                that.setting = false;
                that.$errorTxt.text(text)
                that.$error.show()
            }
        });
    },

    addItem: function(model, collection, options) {
        var view = new ItemView({
            model: model
        });

        options = options || {};

        if (options.at !== undefined) {
            if (options.at === 0) {
                this.$list.prepend(view.$el);
                this.itemViews.unshift(view);
            } else {
                var id = collection.at(options.at - 1).get("id"),
                    itemview = this.getItem(id);
                itemview.$el.after(view.$el);
                this.itemViews.splice(options.at, 0, view);
            }
        } else {
            this.$list.append(view.$el);
            this.itemViews.push(view);
        }
    },

    removeItem: function(model) {

        var view = this.getItem(model.get("id")),
            that = this;
        if (!view) {
            return
        }

        view.destroy();
        _.each(this.itemViews, function(itemView, index) {
            if (itemView == view) {
                that.itemViews.splice(index, 1);
                return true
            }
        })
    },

    getItem: function(id) {
        var view = _.find(this.itemViews, function(view) {
            return id == view.model.get("id")
        });
        return view;
    },

    destroy: function() {
        this.remove();
        _.each(this.itemViews, function(view) {
            view.destroy();
        })
    }
})
module.exports = View;