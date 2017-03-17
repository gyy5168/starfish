var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    _ = require("modules-common/underscore/underscore.js"),
    point = require("modules-common/point/point.js"),
    tools = require("modules-common/tools/tools.js"),
    Crumb=require("../crumb/crumb.js"),
    topBar = require("modules-common/top-bar/top-bar.js");

var List = Backbone.Collection.extend({
    modelId: function (attrs) {
        return attrs.type + "" + attrs.id;
    }
});


var View = Backbone.View.extend({

    attributes: {
        "class": "people-all-department"
    },

    pageSize: 30,

    template: __inline("item.tmpl"),

    parentTemplate: __inline("parent.tmpl"),

    back: function () {
        if (this.dirStack.length <= 1) {
            this.destroy();
            return;
        }

        this.dirStack.pop();
        this.setData(this.dirStack[this.dirStack.length - 1]);
    },

    initialize: function (option) {
        this.selectedList = option.selectedList;
        this.list = new List();
        this.dirStack = []; //目录栈
        this.departmentCache = {};//缓存已加载的部门数据
        this.render();
        this.initClickEvent();
        this.initListEvent();
        this.initScrollEvent();
        this.loadRootDepartment();

        this.prevTitle = topBar.getTitle();
        topBar.setTitle("选择部门");

        this.prevBack = topBar.getBack();
        topBar.setBack(_.bind(this.back, this));
    },

    render: function () {
        var that=this;
        this.$el.html(__inline("department.html"));
        this.$list = this.$el.find(".department-list");
        this.$error = this.$el.find(".JS-error");
        this.$errorTxt = this.$error.find(".common-text");
        this.$loading = this.$el.find(".JS-loading");
        this.$empty = this.$el.find(".JS-empty");

        this.$noMore = this.$el.find(".JS-no-more");
        this.$moreLoading = this.$el.find(".JS-more-loading");
        this.$moreError = this.$el.find(".JS-more-error");

        this.modules={
            crumb:new Crumb({
                parentView:that
            })
        };

        this.$el.append(this.modules.crumb.$el);
    },

    initClickEvent: function () {
        var that = this;

        this.$el.on("click", ".JS-checkbox", function (event) {
            var id = $(this).parent().data("id"),
                model = that.selectedList.get(id);

            if (model) {
                that.selectedList.remove(model);
            } else {
                that.selectedList.add(that.list.get(id).toJSON());
            }

            event.stopPropagation();
        });

        // 父部门的checkbox的点击
        this.$el.on("click", ".JS-parent-checkbox", function (event) {
            var id = $(this).parent().data("id"),
                model = that.selectedList.get(id);

            if (model) {
                that.selectedList.remove(model);
            } else {
                that.selectedList.add(that.currentDepartment);
            }

            event.stopPropagation();
        });

        this.$el.on("click", ".JS-item", function () {
            var id = $(this).data("id"),
                model = that.list.get(id),
                obj = model.toJSON();

            if (obj.children_count === 0) {
                console.log("asd")
                return;
            }

            that.dirStack.push(obj);
            that.setData(obj);
        });

        this.$moreError.on("click", function () {
            that.loadMoreDepartments();
        });

        this.$error.on("click", function () {
            if (that.dirStack.length <= 0) {
                that.loadRootDepartment();
            } else {
                that.setData(that.dirStack[that.dirStack.length - 1]);
            }
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
                that.loadMoreDepartments();
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

        // 选中或者反选
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


        // 选中或者反选父部门
        this.listenTo(this.selectedList, "add", function (model) {
            var obj = model.toJSON(),
                id = that.selectedList.modelId(obj);

            if (id === that.selectedList.modelId(that.currentDepartment)) {
                that.$el.find(".JS-parent-item").addClass("selected");
            }
        });

        this.listenTo(this.selectedList, "remove", function (model) {
            var obj = model.toJSON(),
                id = that.selectedList.modelId(obj);

            if (id === that.selectedList.modelId(that.currentDepartment)) {
                that.$el.find(".JS-parent-item").removeClass("selected");
            }
        });
    },

    loadRootDepartment: function () {
        var that = this;
        if (this.loadRooting) {
            return;
        }
        this.loadRooting = true;
        this.showLoading();

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +
            "/departments?parent=0&page=1&count=1",
            type: "GET",
            success: function (response) {
                if (response.errcode === 0) {
                    var data = response.data[0];
                    data.type = "department";
                    that.dirStack.push(data);
                    that.setData(data);
                } else {
                    var errorTxt = tools.getErrmsg(response.errcode);
                    that.$errorTxt.text(errorTxt)
                    that.showError();
                }
            },

            error: function (jqXHR, status) {
                that.$errorTxt.text(global.texts.netError);
                that.showError();
            },

            complete: function () {
                that.loadRooting = false;
            }
        });
    },

    loadDepartments: function (id) {
        var that = this;
        if (this.loadDepartmentsing) {
            return;
        }

        this.loadDepartmentsing = true;
        this.showLoading();

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +
            "/departments?parent=" + id + "&page=1&count=" + this.pageSize,
            type: "GET",

            success: function (response) {
                if (response.errcode === 0) {
                    // 添加type
                    var arr = [];
                    _.each(response.data, function (obj) {
                        obj.type = "department";
                        arr.push(obj);
                    });

                    // 缓存数据
                    that.departmentCache[id] = that.departmentCache[id] || {};
                    var cache = that.departmentCache[id];
                    cache.data = arr;
                    cache.page = 1;

                    if (response.data.length < that.pageSize) {
                        cache.noMore = true;
                        that.noMore = true;
                        that.$noMore.show();
                        that.$moreLoading.hide();
                    } else {
                        cache.noMore = false;
                        that.noMore = false;
                        that.$moreLoading.show();
                    }
                } else {
                    var errorTxt = tools.getErrmsg(response.errcode) + ",点击加载更多";
                    that.$errorTxt.text(errorTxt);
                    that.showError();
                }
            },

            error: function (jqXHR, status) {
                that.$errorTxt.text(global.texts.netError);
                that.showError();
            },

            complete: function () {
                that.loadDepartmentsing = false;
            }
        });
    },

    loadMoreDepartments: function () {
        var that = this,
            id = this.currentDepartment.id;

        if (this.loadMoring) {
            return;
        }
        this.loadMoring = false;

        this.$moreLoading.show();
        this.$moreError.hide();

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +
            "/departments?parent=" + id + "&page=" + (this.page + 1) + "&count=" + this.pageSize,
            type: "GET",

            success: function (response) {
                if (response.errcode === 0) {
                    that.isMoreError = false;
                    // 添加type
                    var arr = [];
                    _.each(response.data, function (obj) {
                        obj.type = "department";
                        arr.push(obj);
                    });

                    // 缓存数据
                    var cache = that.departmentCache[id];
                    cache.data.concat(arr);
                    that.page++;
                    cache.page = that.page;

                    that.list.set(arr, {
                        remove: false
                    });

                    if (response.data.length < that.pageSize) {
                        cache.noMore = true;
                        that.noMore = true;
                        that.$noMore.show();
                        that.$moreLoading.hide();
                    } else {
                        cache.noMore = false;
                        that.noMore = false;
                        that.$moreLoading.show();
                    }

                } else {
                    that.isMoreError = true;
                    var errorTxt = tools.getErrmsg(response.errcode);
                    point.shortShow({
                        text: errorTxt
                    });
                    that.$moreError.show();
                    that.$moreLoading.hide();
                }

            },

            error: function (jqXHR, status) {
                that.isMoreError = true;
                point.shortShow({
                    text: global.texts.netError
                });

                that.$moreError.show();
                that.$moreLoading.hide();
            },

            complete: function () {
                that.moreLoading = false;
            }
        });
    },

    setData: function (department) {
        var that = this,
            cache = this.departmentCache[id],
            id = department.id;

        this.currentDepartment = department;
        this.ajaxObj && this.ajaxObj.abort();

        if (cache) {
            handle(cache);
        } else {
            this.loadDepartments(id).done(function (response) {
                if (response.errcode === 0) {
                    handle(that.departmentCache[id]);
                }
            });
        }


        var nameList=[];
        _.each(this.dirStack,function(data,i){
            nameList.push({name:data.name})
        });

        this.modules.crumb.set(nameList);

        function handle(data) {
            // 删除旧的父部门
            that.$list.find(".JS-parent-item").remove();
            // 添加父部门
            var parentData = _.extend({}, department);
            parentData.id = that.selectedList.modelId(parentData);
            parentData.className = that.selectedList.get(parentData.id) ? "selected" : "";
            that.$moreLoading.before(that.parentTemplate(parentData));

            that.showList();
            that.page = data.page;
            that.noMore = data.noMore;
            that.list.reset(data.data);
        }
    },

    // 添加列表项
    addItem: function (model) {
        var obj = model.toJSON();
        obj.id = this.selectedList.modelId(obj);
        obj.className = this.selectedList.get(obj.id) ? "selected" : "";
        this.$moreLoading.before(this.template(obj));
    },

    showLoading: function () {
        this.$loading.show();
        this.$error.hide();
        this.$empty.hide();
        this.$list.hide();
    },

    showError: function (response) {
        this.$error.show();
        this.$loading.hide();
        this.$empty.hide();
        this.$list.hide();
    },

    showEmpty: function () {
        this.$loading.hide();
        this.$error.hide();
        this.$empty.show();
        this.$list.hide();
    },

    showList: function () {
        this.$loading.hide();
        this.$error.hide();
        this.$empty.hide();
        this.$list.show();
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