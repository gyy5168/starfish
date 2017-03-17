var _ = require("modules-common/underscore/underscore.js"),
    $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    point = require("modules-common/point/point.js"),
    ItemView = require("./item/item.js");

var View = Backbone.View.extend({

    pageSize: 30,
    pageCount: 1,

    attributes: {
        "class": "search-department"
    },
    initialize: function() {
        this.list = new Backbone.Collection()
        this.itemViews = [];
        this.render();
        this.initListEvent();
        this.initClickEvent();
        this.initScrollEvent();
    },
    render: function() {
        this.$el.html(__inline("search-department.html"));
        this.$list = this.$el.find("ul");
        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$empty = this.$el.find(".JS-empty");
        this.$errorBtn = this.$error.find(".text");

        this.$moreLoading = this.$el.find(".JS-more-loading");
        this.$moreError = this.$el.find(".JS-more-error");
        this.$noMore = this.$el.find(".JS-no-more");
    },
    initListEvent: function() {
        var that = this;

        this.listenTo(this.list, "add", that.addItem);
        this.listenTo(this.list, "remove", this.removeItem);

        this.listenTo(this.list, "reset", function(models, options) {
            _.each(options.previousModels, function(model) {
                that.removeItem(model);
            });

            that.list.each(function(model) {
                that.addItem(model);
            });

            if (that.list.length === 0) {
                that.showEmpty()
            }
        });
    },

    initClickEvent: function() {
        var that = this;
        this.$list.on("click", 'li', function() {
            var id = $(this).data("id"),
                item = that.getItem(id),
                pickedItem = that.getPickedView();

            pickedItem && pickedItem.unpick();
            item.pick();
            that.trigger("set", item.model.toJSON());
            return false
        });

        this.$el.on("click", function() {
            var pickedItem = that.getPickedView();
            pickedItem && pickedItem.unpick();
        });

        this.$error.on("click", function() {
            that.search(that.keyWord)
        });

        this.$moreError.on("click", function() {
            that.loadMore();
        });
    },

    initScrollEvent: function() {
        var that = this,
            moreHeight;
        this.$list.on("scroll", function() {

            // 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
            if (that.$list.scrollTop() === 0) {
                return;
            }

            moreHeight = that.$moreLoading.height();

            if (this.scrollTop + that.$list.height() + moreHeight / 2 >= this.scrollHeight) {
                if (that.noMore) {
                    that.$noMore.show();
                    return;
                }
                that.loadMore();
            }
        });
    },

    getPickedView: function() {
        return _.find(this.itemViews, function(view) {
            return view.isPicked();
        })
    },

    set: function(data) {
        this.list.reset([data]);
    },

    search: function(value) {
        this.keyWord = value;
        var that = this;

        if (this.searching) {
            return
        }
        this.setting = true;

        this.keyWord = value;

        that.showLoading();
        var url = global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/search?q=" + value + "&is_detail=1&type=103&page=1&count=" + that.pageSize;
        this.ajaxObj = $.ajax({
            url: url,
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.pageCount++;
                    var data = response.data.data;
                    if (data.length) {
                        that.list.reset([]);
                        _.each(data, function(model) {
                            that.list.add(model.source)
                        });
                        if (data.length < that.pageSize) {
                            that.noMore = true;
                            // that.$noMore.show();
                        }
                        that.showList();
                    } else {
                        that.showEmpty();
                    }
                    // that.list.reset(list);
                } else {
                    that.showEmpty();
                }
            },
            error: function(jqHXR, status) {
                that.showError();
            },
            complete: function() {
                that.searching = false;
            }
        });
    },

    loadMore: function() {
        var that = this;
        if (this.loadMoring) {
            return;
        }
        this.loadMoring = true;

        this.$moreLoading.show();
        this.$moreError.hide();
        var url = global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/search?q=" + this.keyWord + "&is_detail=1&type=103&page=" + that.pageCount + "&count=" + that.pageSize;
        return $.ajax({
            url: url,
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.pageCount++;
                    var data = response.data.data;
                    var list = [];
                    _.each(data, function(model) {
                        that.list.add(model.source)
                    });

                    that.showList();
                    if (data.length < that.pageSize) {
                        that.noMore = true;
                        that.$noMore.show();
                    }
                } else {
                    that.$moreError.show();
                }
            },

            error: function() {
                that.$moreError.show();
            },

            complete: function() {
                that.loadMoring = false;
                that.$moreLoading.hide();
            }
        });
    },

    getItem: function(id) {
        return _.find(this.itemViews, function(view) {
            return id === view.model.get("id");
        })
    },

    addItem: function(model, collection, options) {
        var view = new ItemView({
            model: model,
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
            // this.$list.append(view.$el);
            this.$moreLoading.before(view.$el);
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



    showEmpty: function() {
        this.$list.hide();
        this.$error.hide();
        this.$loading.hide();
        this.$empty.show();
    },

    showLoading: function() {
        this.$list.hide();
        this.$error.hide();
        this.$empty.hide();
        this.$loading.show();
    },

    showError: function() {
        this.$list.hide();
        this.$loading.hide();
        this.$empty.hide();
        this.$error.show()
    },

    showList: function() {
        this.$list.show();
        this.$loading.hide();
        this.$empty.hide();
        this.$error.hide();
    },

    show: function() {
        this.$el.show()
    },
    hide: function() {
        this.$el.hide();
    },

    destroy: function() {
        this.list.reset([]);
        this.remove();
    }
})


module.exports = View
