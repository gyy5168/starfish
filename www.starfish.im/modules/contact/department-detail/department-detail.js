var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    ItemView = require("./item/item.js"),
    FloatPanel = require("./float-panel/float-panel.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

    pageSize: 30,

    pageCount: 1,

    attributes: {
        class: "department-detail"
    },
    initialize: function() {
        global.data.operateList = new Backbone.Collection();
        this.list = new Backbone.Collection();
        // TODO selectList 改成 selectedList 比较好, 而且需要加注释说明它的意义
        //selectedList 已选中的列表项
        this.selectedList = new Backbone.Collection();
        this.itemViews = [];

        this.render();
        this.initListEvent();
        this.initClickEvent();
        this.initScrollEvent();


    },

    render: function() {
        this.$el.html(__inline("department-detail.html"));
        this.$departmentName = this.$el.find(".JS-department-name");
        this.$list = this.$el.find("ul");
        this.$selectAll = this.$el.find(".JS-member-select-all");
        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$empty = this.$el.find(".JS-empty");
        this.$content = this.$el.find(".JS-department-content");

        this.$moreClick = this.$el.find(".JS-more-click");
        this.$moreLoading = this.$el.find(".JS-more-loading");
        this.$moreError = this.$el.find(".JS-more-error");
        this.$noMore = this.$el.find(".JS-no-more");

        // TODO 添加注释, 说明什么是floatPanel
        // TODO 命名时, 从功能和业务的角度看, 不要从外观,行为,实现逻辑上看

        // floatPanel 是点击每一项信息 滑动出的详情面板
        this.modules = {
            floatPanel: new FloatPanel({
                departSelectedList: this.selectedList
            })
        };
        this.$el.append(this.modules.floatPanel.$el)
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

            this.$departmentName.text(this.currentDepartment.get("name") + " (" + that.model.get("all_members_count") + ") ");
            // TODO 多余, 下面的函数已经实现了


        });

        this.listenTo(this.list, "add reset remove destroy", function() {
            if (that.list.length === 0) {
                // TODO 用已有的showList, 和showEmpty
                that.$empty.show();
                that.$list.hide();
            } else {
                that.$list.show();
                that.$empty.hide();
            }
        });

        this.listenTo(this.selectedList, 'add', function(model) {
            var id = model.get("id"),
                view = that.getItem(id);
            global.data.operateList.add({
                id: model.get("id"),
                name: model.get("name"),
                avatar: model.get("avatar")
            });
            view.select();
        });

        this.listenTo(this.selectedList, 'remove', function(model) {
            var id = model.get("id"),
                view = that.getItem(id);
            global.data.operateList.remove({
                id: model.get("id")
            });
            view && view.unSelect();
        });

        this.listenTo(this.selectedList, "reset", function(models, options) {
            _.each(options.previousModels, function(model) {
                var id = model.get("id"),
                    view = that.getItem(id);

                global.data.operateList.remove({
                    id: model.get("id")
                });
                view && view.unSelect();
            });

            that.selectedList.each(function(model) {
                var id = model.get("id"),
                    view = that.getItem(id);

                global.data.operateList.add({
                    id: model.get("id"),
                    name: model.get("name"),
                    avatar: model.get("avatar")
                });
                view && view.select();
            });
        });


        this.listenTo(this.selectedList, 'add remove reset', function() {
            if (that.selectedList.length == that.list.length) {
                that.trigger("selectedAll");
            } else {
                that.trigger("selectedSome");
            }
        });

        // TODO  select没有必须写成一个函数, 且名称和逻辑不搭, 下面的unselect同理
        this.listenTo(this, 'selectedAll', function() {
            this.$selectAll.addClass("selected");
        });
        this.listenTo(this, 'selectedSome', function() {
            this.$selectAll.removeClass("selected");
        })

        this.listenTo(this.modules.floatPanel, 'userDeleted', function(arr) {
            _.each(arr, function(id) {
                that.list.remove(id);
            });
        });

    },

    initClickEvent: function() {
        var that = this;
        this.$selectAll.on("click", function() {

            if (that.selectedList.length == that.list.length) {
                that.selectedList.reset([]);
            } else {
                that.selectedList.reset(that.list.toJSON());
            }
            // TODO return false有什么用, 下面类似
            //return false 在jquery里面可以阻止事件冒泡
            return false;
        });

        this.$list.on("click", 'li', function() {
            // TODO 为什么不用一个变量记录下已选择的成员呢, 做的这么复杂
            //有道理
            if (that.pickedItem) {
                that.pickedItem.unpick();
            }
            var id = $(this).data("id"),
                item = that.getItem(id);

            item.pick();
            that.pickedItem = item;
            return false;
        });

        this.$list.on("click", 'li .JS-member-select', function() {
            var id = $(this).parent().data("id"),
                item = that.getItem(id);

            if (item.isSelected()) {
                that.selectedList.remove(item.model)
            } else {
                that.selectedList.add(item.model)
            }
            return false;
        });

        this.$error.on("click", function() {
            that.load(that.id);
        });


        //点击LI显示用户详情面板
        that.$list.on("click", 'li', function() {

            var id = $(this).data("id"),
                item = that.getItem(id);

            // TODO 下面的逻辑应该调用set接口后,floatPanel模块内部自动做
            if (that.modules.floatPanel.isRight()) {
                that.modules.floatPanel.goLeft()
            }
            if (that.modules.floatPanel.isOperate()) {

                if (item.isSelected()) {
                    that.selectedList.remove(item.model)
                } else {
                    that.selectedList.add(item.model)
                }
                return false;
            }

            that.modules.floatPanel.set({
                model: item.model,
                currentDepartment: that.currentDepartment
            });

            return false
        });

        this.$moreClick.on("click", function() {
            that.loadMore();
        });

        that.$moreError.on("click", function() {
            that.loadMore();
        });

        //点击空白区域，右边两面板隐藏
        this.$el.on("click", function(evt) {
            var target = $(evt.target);
            if (target.closest(".float-panel").length == 0) {
                that.modules.floatPanel.goRight();
            }
            // TODO 命名从功能触发, 用hide即可, goRight是一种行为
            // that.modules.floatPanel.goRight();
        })
    },

    initScrollEvent: function() {
        var that = this,
            moreHeight;
        this.$list.on("scroll", function() {
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

    set: function(model) {
        this.model = model;
        this.pageCount = 1;
        this.$noMore.hide();
        this.id = model.get("id");
        this.$departmentName.text(model.get("name"));
        var cacheOperateList = global.data.operateList.toJSON();
        this.selectedList.reset([]);
        global.data.operateList.reset(cacheOperateList);
        this.currentDepartment = model;
        this.$selectAll.removeClass("selected");
        this.load(model.get("id"));

    },

    load: function(id) {
        var that = this;
        this.id = id;

        this.showLoading();
        this.ajaxObj && this.ajaxObj.abort();

        return this.ajaxObj = $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/departments/" + that.id + "/members?direct_in=1&is_direct=0&detail=3&page=" + that.pageCount + "&count=" + that.pageSize,
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.showList();
                    that.pageCount++;
                    that.list.reset(response.data);

                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode)
                    });
                    that.showError();
                }

            },

            error: function(jqXHR, status) {
                if (status === "abort") {
                    return;
                }

                that.showError();
            },

            complete: function() {
                that.$loading.hide();
                that.ajaxObj = null;
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

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/departments/" + that.id + "/members?direct_in=1&is_direct=0&detail=3&page=" + that.pageCount + "&count=" + that.pageSize,
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.pageCount++;
                    _.each(response.data, function(obj) {
                        that.list.set(obj, {
                            remove: false
                        });
                    });
                    if (response.data.length < that.pageSize) {
                        that.noMore = true;
                        that.$moreLoading.hide();
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
        var that = this;
        var view = new ItemView({
            model: model,
            currentDepartment: that.currentDepartment
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
            //this.$list.append(view.$el);
            this.$moreLoading.before(view.$el);
            this.itemViews.push(view);
        }
        if (global.data.operateList.findWhere({
                id: model.get("id")
            })) {
            this.selectedList.add(model);
            view.select();
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
        this.$content.hide();
        this.$error.hide();
        this.$loading.hide();
        this.$empty.show();
    },

    showLoading: function() {
        this.$content.hide();
        this.$error.hide();
        this.$empty.hide();
        this.$loading.show();
    },

    showError: function() {
        this.$content.hide();
        this.$loading.hide();
        this.$empty.hide();
        this.$error.show();
    },

    showList: function() {
        this.$content.show();
        this.$loading.hide();
        this.$empty.hide();
        this.$error.hide();
    },
    show: function() {
        this.$el.show();
    },
    hide: function() {
        this.$el.hide();
        this.modules.floatPanel.goRight();
    },
    destroy: function() {
        this.modules.floatPanel.destroy();
        this.list.reset([]);
        this.remove()
    }
});

module.exports = View;
