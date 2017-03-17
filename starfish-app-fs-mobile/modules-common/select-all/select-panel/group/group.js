var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    _ = require("modules-common/underscore/underscore.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    tools = require("modules-common/tools/tools.js"),
    point = require("modules-common/point/point.js");

var List = Backbone.Collection.extend({
    modelId: function (attrs) {
        return attrs.type + "" + attrs.id;
    }
});


var View = Backbone.View.extend({

    attributes: {
        "class": "people-all-group"
    },

    pageSize: 30,

    template: __inline("item.tmpl"),

    back: function () {
        this.destroy();
    },

    initialize: function (option) {
        this.selectedList = option.selectedList;
        this.list = new List();
        this.render();
        this.initClickEvent();
        this.initListEvent();
        this.initScrollEvent();
        this.load();

        this.prevTitle = topBar.getTitle();
        topBar.setTitle("选择讨论组");

        this.prevBack = topBar.getBack();
        topBar.setBack(_.bind(this.back, this));
    },

    render: function () {
        this.$el.html(__inline("group.html"));
        this.$list = this.$el.find("ul");
        this.$error = this.$el.find(".JS-error");
        this.$errorTxt = this.$error.find(".common-text");
        this.$loading = this.$el.find(".JS-loading");
        this.$empty = this.$el.find(".JS-empty");

        this.$noMore = this.$el.find(".JS-no-more");
        this.$moreLoading = this.$el.find(".JS-more-loading");
        this.$moreError = this.$el.find(".JS-more-error");
    },

    initClickEvent: function () {
        var that = this;

        this.$el.on("click", ".JS-item", function () {
            var id = $(this).data("id"),
                model = that.selectedList.get(id);

            if (model) {
                that.selectedList.remove(model);
            } else {
                that.selectedList.add(that.list.get(id).toJSON());
            }
        });

        this.$error.on("click", function () {
            that.load()
        });

        this.$moreError.on("click", function () {
            that.loadMore();
        });
    },

    initScrollEvent: function () {
        var that = this;
        var moreHeight;
        this.$list.on("scroll", function (event) {
            if (that.noMore || that.isMoreError) {
                //if(this.scrollTop>0){
                //    that.$noMore.show();
                //}else{
                //    that.$noMore.hide();
                //}
                return;
            }

            // 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
            if (that.$list.scrollTop() === 0) {
                return;
            }

            var height = that.$list.height();
            moreHeight = moreHeight || that.$moreLoading.height();

            if (this.scrollTop + that.$list.height() + moreHeight / 2 >= this.scrollHeight) {
                that.loadMore();
            }
        });

    },

    initListEvent: function () {
        var that = this;
        this.listenTo(this.list, "reset", function () {
            that.$list.find(".JS-item").remove();

            if (that.list.length === 0) {
                that.$empty.show();
                that.$list.hide();
                return
            } else {
                that.$empty.hide();
                that.$list.show();
            }

            that.list.each(function (model) {
                that.addItem(model);
            });
        });

        this.listenTo(this.list, "add", this.addItem);

        this.listenTo(this.selectedList, "add", function (model) {
            var obj = model.toJSON(),
                id = that.list.modelId(obj);

            that.$el.find(".JS-item[data-id=" + id + "]").addClass("selected");
        });

        this.listenTo(this.selectedList, "remove", function (model) {
            var obj = model.toJSON(),
                id = that.list.modelId(obj);

            that.$el.find(".JS-item[data-id=" + id + "]").removeClass("selected");
        });
    },

    load: function () {
        var that = this;
        if (this.loading) {
            return;
        }
        this.loading = true;


        this.$loading.show();
        this.$error.hide();
        this.$empty.hide();
        this.$list.hide();

        this.page = 1;

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/members/" +
            global.data.user.get("id") + "/discussion_groups?normal=1&page=1&count=" + this.pageSize,
            type: "GET",
            success: function (response) {
                if (response.errcode === 0) {
                    var arr = [];
                    _.each(response.data, function (obj) {
                        obj.type = "group";
                        arr.push(obj);
                    });
                    that.list.reset(arr);
                    that.$list.show();

                    if (response.data.length < that.pageSize) {
                        that.noMore = true;
                        that.$moreLoading.hide();
                    } else {
                        that.noMore = false;
                        that.$moreLoading.show();
                    }
                } else {
                    var errorTxt = tools.getErrmsg(response.errcode) + ",请点击重新加载";
                    that.$errorTxt.text(errorTxt);
                    that.$error.show();
                }
            },

            error: function (jqXHR, status) {
                that.$errorTxt.text(global.texts.netError);
                that.$error.show();
            },

            complete: function () {
                that.$loading.hide();
                that.loading = false;
            }
        });
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
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/members/" +
            global.data.user.get("id") + "/discussion_groups?normal=1&page=" + (this.page + 1) +
            "&count=" + this.pageSize,
            type: "GET",
            success: function (response) {
                if (response.errcode === 0) {
                    that.isMoreError = false;
                    that.page++;
                    _.each(response.data, function (obj) {
                        obj.type = "group";
                        that.list.add(obj);
                    });

                    if (response.data.length < that.pageSize) {
                        that.noMore = true;
                        that.$moreLoading.hide();
                        that.$noMore.show();
                    } else {
                        that.noMore = false;
                        that.$moreLoading.show();
                    }
                } else {
                    that.isMoreError = true;
                    var errorTxt = tools.getErrmsg(response.errorcode) + ",点击加载更多";
                    point.shortShow({
                        text: errorTxt
                    });
                    that.$moreError.show()
                }
            },

            error: function () {
                that.isMoreError = true;
                point.shortShow({
                    text: global.texts.netError
                });
                that.$moreError.show();
            },

            complete: function () {
                that.$moreLoading.hide();
                that.loadMoring = false;
            }
        });
    },

    // 添加列表项
    addItem: function (model) {
        var obj = model.toJSON();
        obj.id = this.selectedList.modelId(obj);
        obj.className = this.selectedList.get(obj.id) ? "selected" : "";
        // this.$list.append( this.template(obj) );
        this.$moreLoading.before(this.template(obj))
    },

    show: function () {
        this.$el.show();
    },

    hide: function () {
        this.$el.hide();
    },

    destroy: function () {
        this.remove();
        topBar.setTitle(this.prevTitle);
        topBar.setBack(this.prevBack);
    }
});

module.exports = View;