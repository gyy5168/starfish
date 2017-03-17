var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    ItemView = require("./item/item.js"),
    deleteModal = require("../delete-user/delete-user.js"),
    point = require("modules-common/point/point.js"),
    point2 = require("modules-common/point2/point.js");

var View = Backbone.View.extend({
    attributes: {
        class: "muti-operate"
    },

    initialize: function(option) {
        this.selectedList = global.data.operateList;
        this.departSelectedList = option.departSelectedList;
        this.itemViews = [];
        this.render();
        this.initEvent();
    },

    render: function() {
        this.$el.html(__inline("muti-operate.html"));
        this.$list = this.$el.find("ul");
        this.$head = this.$el.find(".JS-muti-operate-head");
        this.$delete = this.$el.find(".JS-delete");
        this.$point = this.$el.find(".JS-muti-point");
    },

    initEvent: function() {
        var that = this;

        this.$list.on("click", 'li span', function() {
            var model = that.getItem($(this).data("id")).model;

            if (that.departSelectedList.findWhere({
                    id: model.get("id")
                })) {
                that.departSelectedList.remove(model);
            } else {
                global.data.operateList.remove({
                    id: model.get("id")
                });
            }
            return false;
        });

        //修改头部内容
        this.listenTo(this.selectedList, 'add remove reset', function() {
            this.$head.find(".list-length").text("批量操作(" + that.selectedList.length + ")")
        });

        this.listenTo(this.selectedList, "add", that.addItem);
        this.listenTo(this.selectedList, "remove", this.removeItem);

        this.listenTo(this.selectedList, "reset", function(models, options) {
            _.each(options.previousModels, function(model) {
                that.removeItem(model);
            });

            that.selectedList.each(function(model) {
                that.addItem(model);
            });
        });

        this.$el.on("click", function() {
            return false
        });

        this.$delete.on("click", function() {
            deleteModal.show({
                okCallback: function() {
                    // that.removeCreator();
                    // that.removeMyself();
                    that.delete()
                }
            })
        })
    },
    //在批量操作时候在选择成员列表里过滤掉组织创建者
    removeCreator: function() {
        this.selectedList.remove(global.data.currentOrg.get("creator"))
    },
    //在批量操作时候在选择成员列表里过滤掉自己
    removeMyself: function() {
        this.selectedList.remove(global.data.user.get("id"))
    },

    delete: function() {
        var that = this;

        if (this.deleting) {
            return false
        }
        this.deleting = true;

        var memberIds = [];
        var len = this.selectedList.length;
        this.removeCreator();
        this.removeMyself();
        var hasCreatorOrSelf = false;
        if (len > this.selectedList.length) {
            hasCreatorOrSelf = true;
        }
        this.selectedList.each(function(model) {
            memberIds.push(model.get("id"))
        });

        point2.shortShow({
            text: "正在批量删除成员...",
            type: "loading"
        })
        if (memberIds.length === 0) {
            if (hasCreatorOrSelf) {
                point.shortShow({
                    text: "您没有该操作权限",
                    type: "error"
                })
            }
            this.deleting = false;
            return;
        }
        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/members/" + memberIds.join(","),
            type: "DELETE",
            success: function(response) {
                if (response.errcode == 0) {
                    that.selectedList.reset([]);
                    that.trigger("userDeleted", memberIds);
                    point2.shortShow({
                        text: "批量删除成功",
                        type: "success"
                    })
                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode),
                        type: "error"
                    })
                }
            },
            error: function() {
                point.shortShow({
                    text: global.texts.netError,
                    type: "error"
                })
            },
            complete: function() {
                that.deleting = false
            }
        })
    },

    getItem: function(id) {
        return _.find(this.itemViews, function(view) {
            return id === view.model.get("id");
        })
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
            //this.$moreLoading.before(view.$el);
            this.itemViews.push(view);
        }
    },

    removeItem: function(model) {
        var view = this.getItem(model.get("id")),
            that = this;

        if (!view) {
            return;
        }
        view.destroy();

        _.find(this.itemViews, function(itemView, index) {
            if (itemView === view) {
                that.itemViews.splice(index, 1);
                return true;
            }
        });
    },

    set: function(model) {
        this.modules.detail.set(model);
        this.modules.operate.hide();
    },

    hide: function() {
        this.$el.hide();
    },
    show: function() {
        this.$el.show();
    },
    isShow: function() {
        return !!this.$el.css("display");
    },
    destroy: function() {
        this.selectedList.reset([])
        this.remove();
    }
});

module.exports = View;
