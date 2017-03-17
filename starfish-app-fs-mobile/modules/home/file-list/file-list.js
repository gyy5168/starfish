var Backbone = require("modules-common/backbone/backbone.js"),
    _ = require("modules-common/underscore/underscore.js"),
    $ = require("modules-common/zepto/zepto.js"),
    fileDirectory = require("modules/file-directory/file-directory.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    tools = require("modules-common/tools/tools.js"),
    point = require("modules-common/point/point.js"),
    ItemView = require("./item-view/item-view.js");

var View = Backbone.View.extend({

    attributes: {
        class: "home-file-list"
    },

    pageSize: 30,

    initialize: function (option) {
        global.data.fileList = global.data.fileList || new Backbone.Collection();
        this.list = global.data.fileList;
        this.itemViews = []; //缓存列表项实例
        this.parentView = option.parentView;
        this.render();
        this.initListEvent();
        this.initGlobalEvent();
        this.initClickEvent();
        this.initScrollEvent();
    },

    render: function () {
        this.$el.html(__inline("file-list.html"));
        this.$list = this.$el.find("ul");
        this.$error = this.$el.find(".JS-error");
        this.$errorTxt = this.$error.find(".JS-common-text");
        this.$loading = this.$el.find(".JS-loading");
        this.$empty = this.$el.find(".JS-empty");

        this.$noMore = this.$list.find(".JS-no-more");
        this.$moreLoading = this.$list.find(".JS-more-loading");
        this.$moreError = this.$list.find(".JS-more-error");
    },

    // 初始化list事件
    initListEvent: function () {
        var that = this;

        this.listenTo(this.list, "add", that.addItem);

        this.listenTo(this.list, "remove", this.removeItem);

        this.listenTo(this.list, "reset", function (models, options) {
            _.each(options.previousModels, function (model) {
                that.removeItem(model);
            });

            that.list.each(function (model) {
                that.addItem(model);
            });
        });

        this.listenTo(this.list, "add reset remove destroy", function () {
            if (that.list.length === 0) {
                that.$empty.show();
                that.$list.hide();
            } else {
                that.$list.show();
                that.$empty.hide();
            }
        });

        // 当选择一个文件时, 触发selectSome事件
        // 当选择所有文件时, 触发selectAll事件
        // 当取消所有文件选择时, 触发noSelect事件
        this.listenTo(this.list, "change:selected", function () {
            // 查看是否有选中的列表项和未选中的列表项
            var hasSelected, hasUnselected;
            that.list.each(function (model) {
                if (model.get("selected")) {
                    hasSelected = true;
                } else {
                    hasUnselected = true;
                }
            });

            if (hasSelected) {
                if (hasUnselected) {
                    that.trigger("selectSome");
                } else {
                    that.trigger("selectAll");
                }
            } else {
                that.trigger("noSelect");
            }
        });
    },

    initGlobalEvent: function () {
        var that = this;

        // 文件发生增加, 删除, 移动时, 更新视图
        this.listenTo(global.event, "fileRemoved", function (arr) {
            _.each(arr, function (id) {
                that.list.remove(id);
            });
        });

        // 文件发生增加, 删除, 移动时, 更新视图
        this.listenTo(global.event, "folderNewed", function (obj) {
            // 判断是否同一个目录
            if (obj.id === that.id) {
                that.list.add(obj.data, {
                    at: 0
                });
            }
        });

        // 文件发生增加, 删除, 移动时, 更新视图
        this.listenTo(global.event, "fileNewed", function (obj) {
            var index = 0,
                data = obj.data;

            // 判断是否同一个目录
            if (that.id != obj.dirId) {
                return;
            }

            // 新增加的文件插入到最后一个文件夹后面,第一个文件的前面
            that.list.find(function (model, i) {
                if (model.get("is_file")) {
                    index = i;
                    return true;
                }
            });

            that.list.add(data, {
                at: index
            });
        });

        // 文件发生增加, 删除, 移动时, 更新视图
        this.listenTo(global.event, "fileMoved", function (obj) {
            if ( obj.sourceId == that.id ) {
                _.each(obj.data, function (o) {
                    that.list.remove(o.id);
                });
                //topBar.setTitle(global.data.dirNameCache.get(that.id));
            }
        });
    },

    initClickEvent: function () {
        var that = this;
        this.$error.on("click", function () {
            that.set(that.id);
        });

        this.$moreError.on("click",function(){
            that.loadMore();
        });
    },

    initScrollEvent: function () {
        var that = this,
            moreHeight;
        this.$list.on("scroll", function () {
            if (that.noMore) {
                return;
            }

            // 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
            if (that.$list.scrollTop() === 0) {
                return;
            }

            moreHeight = that.$moreLoading.height();

            if (this.scrollTop + that.$list.height() + moreHeight / 2 >= this.scrollHeight) {
                that.loadMore();
            }
        });
    },

    // 根据ID获取列表项
    getItem: function (id) {
        return _.find(this.itemViews, function (view) {
            return id === view.model.get("id");
        });
    },

    // 添加列表项
    addItem: function (model, collection, options) {
        var itemview = new ItemView({
            model: model
        });

        options = options || {};

        if (options.at !== undefined) {
            if (options.at === 0) {
                this.$list.prepend(view.$el);
                this.itemViews.unshift(view);
            } else {
                var id = collection.at(options.at - 1).get("id");
                itemview = this.getItem(id);
                this.$moreLoading.before(itemview.$el);
                this.itemViews.splice(options.at, 0, itemview);
            }
        } else {
            this.$moreLoading.before(itemview.$el);
            this.itemViews.push(itemview);
        }
    },

    // 删除列表项
    removeItem: function (model) {
        var view = this.getItem(model.get("id")),
            that = this;

        if (!view) {
            return;
        }
        view.destroy();

        _.find(this.itemViews, function (itemView, index) {
            if (itemView === view) {
                that.itemViews.splice(index, 1);
                return true;
            }
        });
    },

    // 全选
    selectAll: function () {
        this.list.each(function (model) {
            model.set("selected", true);
        });
    },

    // 全不选
    unSelectAll: function () {
        this.list.each(function (model) {
            model.set("selected", false);
        });
    },

    // 获取选择的文件
    getSelect: function () {
        var result = [];
        this.list.each(function (model) {
            if (model.get("selected")) {
                result.push(model.toJSON());
            }
        });
        return result;
    },

    set: function (id) {
        this.load(id);
    },

    // 根据id加载文件列表
    load: function(id){
        var that = this;

        if (this.loading) {
            return;
        }
        this.loading = true;

        id = parseInt(id);
        id = id || 0;
        this.id = id;
        that.page = 1;

        this.$loading.show();
        this.$error.hide();
        this.$list.hide();
        this.$empty.hide();
        this.$moreLoading.hide();
        this.$noMore.hide();
        this.$moreError.hide();

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files?parent=" + that.id + "&page=" + that.page + "&count=" + that.pageSize,
            type: "GET",

            success: function (response) {
                if (response.errcode === 0) {
                    // 设置路径对象
                    fileDirectory.set(response.data);
                    that.list.reset(response.data.children);
                    that.$list.show();
                    topBar.setTitle(response.data.name || "文件系统");
                } else {
                    var errorTxt = tools.getErrmsg(response.errcode) + ",请点击重新加载";
                    that.$errorTxt.text(errorTxt);
                    that.$error.show();
                }
            },

            error: function (jqXHR, status) {
                that.$errorTxt.text(global.texts.netError).show();
                that.$error.show();
            },

            complete: function () {
                that.loading = false;
                that.$loading.hide();
            }
        });

    },

    // 加载更多文件列表
    loadMore: function () {
        var that = this;
        if (this.loadMoring) {
            return;
        }
        this.loadMoring = true;

        this.$moreLoading.show();
        this.$moreError.hide();

        return $.ajax({
            url: global.data.org.get("domain")+ "/orgs/" + global.data.org.get("id") + "/file/files?parent=" + that.id +
            "&page=" + (that.page + 1)  + "&count=" + this.pageSize,
            type: "GET",
            success: function (response) {
                if (response.errcode === 0) {
                    that.page++;
                    var data = response.data.children;
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
                    that.$moreError.show();
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

    destroy: function () {
        this.list.reset([]);
        this.remove();
    }
});

module.exports = View;