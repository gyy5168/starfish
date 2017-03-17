var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    point = require("modules-common/point/point.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    ItemView = require("./item-view/item-view.js");
var View = Backbone.View.extend({
    attributes: {
        class: "file-list-wrapper"
    },

    pageSize: 30,

    initialize: function (option) {
        this.parentView = option.parentView;
        this.list = new Backbone.Collection();
        this.itemViews = [];
        this.render();
        this.initEvent();
    },
    render: function () {
        this.$el.html(__inline("file-list.html"));
        this.$list = this.$el.find(".JS-move-bd-list");
        this.$empty = this.$el.find(".JS-empty");

        this.$noMore = this.$list.find(".JS-no-more");
        this.$moreLoading = this.$list.find(".JS-more-loading");
        this.$moreError = this.$list.find(".JS-more-error");
    },

    initEvent: function () {
        var that = this;

        this.listenTo(global.event, "folderNewed", function (obj) {
            if (obj.id === that.id) {
                that.list.add(obj.data, {
                    at: 0
                });
            }
        });

        this.listenTo(global.event, "fileMoved", function (obj) {
            if (obj.targetId === that.id) {
                _.each(obj.data, function (o) {
                    if (!o.is_file) {
                        that.list.add(o);
                    }
                });
            }

            topBar.setTitle(global.data.dirNameCache.get(that.id))
        });

        this.listenTo(this.list, "add", this.addItem);
        this.listenTo(this.list, "remove", this.removeItem);
        this.listenTo(this.list, "reset", function (models, options) {
            _.each(options.previousModels, function (model) {
                that.removeItem(model);
            });

            that.list.each(function (model) {
                that.addItem(model);
            });

            if (that.list.length === 0) {
                that.$empty.show();
            } else {
                that.$empty.hide();
            }
        });

        this.$el.on("click", "li", function () {
            var id = $(this).attr("data-id"),
                item = that.getItem(id),
                modelData = item.model.toJSON();

            if (item.isFile()) {
                return;
            }

            if ($(this).hasClass("unable-move")) {
                point.shortShow({
                    text: "对不起，没有该文件权限",
                    time: 1000
                })
                return;
            }

            that.parentView.set(id);
        });


        this.$list.on("scroll", function (event) {
            if (that.noMore) {
                return;
            }

            // 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
            if (that.$list.scrollTop() === 0) {
                return;
            }

            var moreHeight;
            moreHeight = that.$moreLoading.height();

            if (this.scrollTop + that.$list.height() + moreHeight / 2 >= this.scrollHeight) {
                that.loadMore();
            }
        });

        this.$moreError.on("click", function () {
            that.loadMore();
        })
    },

    loadMore: function () {
        var that = this;
        if (this.loadMoring) {
            return;
        }
        this.loadMoring = true;

        this.$moreLoading.show();
        this.$moreError.hide();

        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files?parent=" + that.id +
            "&page=" + (that.page + 1) + "&count=" + that.pageSize + "&count=" + this.pageSize,
            type: "GET",
            success: function (response) {
                if (response.errcode === 0) {
                    that.page++;
                    var data = response.data.children
                    _.each(data, function (obj) {
                        that.list.set(obj, {remove: false});
                    });
                    if (data.length < that.pageSize) {
                        that.noMore = true;
                        that.$moreLoading.hide();
                        that.$noMore.show();
                    }
                } else {
                    var errorTxt = tools.getErrmsg(response.errorcode) + ",点击加载更多";
                    point.shortShow({
                        text: errorTxt
                    });
                    that.$moreError.show()
                }
            },

            error: function () {
                point.shortShow({
                    text: global.texts.netError
                });
                that.$moreError.show();
            },

            complete: function () {
                that.loadMoring = false;
            }
        });
    },

    hideMore: function () {
        this.$noMore.hide();
        this.$moreLoading.hide();
        this.$moreError.hide();
    },

    set: function (data, id) {
        this.id = id;
        var folderList=[];
        _.each(data,function(obj){
            if(!obj.is_file){
                folderList.push(obj)
            }
        });
        this.list.reset(folderList);
        this.fileAndFolderList=data;
        this.page = 1;
    },

    get: function () {
        return this.fileAndFolderList;
    },

    // 添加列表项
    addItem: function (model, collection, options) {
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
            this.$moreLoading.before(view.$el);
            this.itemViews.push(view);
        }
    },

    removeItem: function (model) {

        var view = this.getItem(model.get("id")),
            that = this;
        if (!view) {
            return;
        }

        view.destroy()
        _.each(this.itemViews, function (itemView, index) {
            if (itemView == view) {
                that.itemViews.splice(index, 1);
                return true
            }
        })
    },

    getItem: function (id) {

        var view = _.find(this.itemViews, function (view) {
            return id == view.model.get("id");
        });
        return view;
    },

    destroy: function () {
        this.list.reset([]);
        this.remove()
    }
});
module.exports = View