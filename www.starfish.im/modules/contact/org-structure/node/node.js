var $ = require("modules-common/jquery/jquery.js"),
    point = require("modules-common/point/point.js"),
    _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    CreateDepart = require("../modal/create-depart/create-depart.js"),
    RenameDepart = require("../modal/rename-depart/rename-depart.js"),
    DeleteDepart = require("../modal/delete-depart/delete-depart.js");

var View = Backbone.View.extend({

    attributes: {
        "class": "depart-node"
    },

    template: __inline("node.tmpl"),

    pageSize: 30,

    initialize: function(option) {
        this.rootView = option.rootView;
        this.parentView = option.parentView || "";
        this.render();
        this.initEvent();
    },

    render: function() {
        var obj = this.model.toJSON();

        this.$el.data("id", obj.id);
        this.$el.html(this.template(obj));
        // TODO class前面加JS前缀
        this.$list = this.$el.find(".group-bd ul");
        this.$hd = this.$el.find(".JS-group-hd");
        this.$tool = this.$hd.find(".tool");

        this.$error = this.$el.find(".JS-error");
        this.$loadMore = this.$el.find(".JS-load-more");
        this.$moreError = this.$el.find(".JS-more-error");
        this.$loading = this.$el.find(".JS-loading");
        this.$arrow = this.$el.find(".JS-arrow");
    },

    initEvent: function() {
        var that = this;

        this.$hd.on("click", ".group-arrow,.group-name", function() {
            if (that.rootView.$selected) {
                that.rootView.$selected.removeClass("selected");
            }

            that.rootView.trigger("select", that.model);
            that.$el.addClass("selected");
            that.rootView.$selected = that.$el;

            if (that.$el.hasClass("open")) {
                that.$el.removeClass("open");
                return;
            }

            if (that.model.get("children_count") === 0) {
                that.$el.addClass("open");
                return;
            }

            if (that.page) {
                that.$el.addClass("open");
                return;
            }

            that.load().success(function(response) {
                if (response.errcode === 0) {
                    that.$el.addClass("open");
                }
            });
        });

        // TODO class前面加JS前缀
        // TODO 事件别用链式调用, 看着不清晰
        this.$tool.on("click", "i", function(evt) {
            that.$hd.find("ul").show();
            // evt.stopPropagation();
        }).on("click", ".create-depart", function(evt) {
            // TODO 跑出事件合适些
            CreateDepart.show({
                title: "创建子部门",
                parentOrgId: that.model.get("id"),
                callback: $.proxy(that.addNewDepart, that)
            });
            $(this).closest("ul").hide();
        }).on("click", ".rename-depart", function(evt) {
            RenameDepart.show({
                orgId: that.model.get("id"),
                orgName: that.$hd.find(".group-name").text(),
                callback: $.proxy(that.renameDepart, that)
            });
        }).on("click", ".delete-depart", function(evt) {
            DeleteDepart.show({
                orgId: that.model.get("id"),
                callback: $.proxy(that.deleteDepart, that)
            });
        }).on("mouseleave", function() {
            $(this).find("ul").hide();
        });

        this.$loadMore.on("click", function() {
            that.loadMore();
        });

        this.$moreError.on("click", function() {
            that.loadMore();
        });

        this.$error.on("click", function() {
            that.load();
        });

        //TODO destroy时需要解除该事件
        global.$doc.on("click", function(evt) {

            var target = $(evt.target);

            if (target.closest(".tool").length === 0) {
                that.$hd.find(".tool ul").hide();
            } else {

                global.$doc.find(".tool ul").hide();
                target.closest(".tool").find("ul").show();
            }
        });
    },

    addNewDepart: function(data) {
        var itemView = new View({
            model: new Backbone.Model(data),
            rootView: this.rootView,
            parentView: this
        });
        var children_count=this.model.get("children_count");
        // if(children_count==0){
        //     this.$arrow.show();
        // }
        this.model.set("children_count", children_count+1);
          
        this.$list.prepend(itemView.$el);
        if (!this.$el.hasClass("open")) {
            this.$el.addClass("open");
        }
    },

    renameDepart: function(name) {
        this.$hd.find(".group-name").text(name);
    },

    deleteDepart: function() {

        if (this.rootView.$selected) {
            this.rootView.$selected.removeClass("selected");
        }

        this.rootView.trigger("select", this.parentView.model);

        this.parentView.$el.addClass("selected");
        this.rootView.$selected = this.parentView.$el;
        this.$el.remove();
        var children_count=this.parentView.model.get("children_count");
        // if(children_count==1){
        //     this.parentView.$arrow.hide();
        // }
        this.parentView.model.set("children_count", children_count-1);
    },

    open: function() {
        this.$hd.find(".group-name").trigger("click");
    },

    load: function() {
        var that = this;
        if (this.loading) {
            return;
        }
        this.loading = true;
        this.$el.addClass("state-loading");

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/departments?parent=" + this.model.get("id") + "&page=1&count=" + this.pageSize,
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.page = 1;
                    that.$list.empty();
                    that.addChildren(response.data);
                    if (response.data.length < that.pageSize) {
                        that.hideLoadInfo();
                    } else {
                        that.loadMoreShow();
                    }
                } else {
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },

            error: function() {
                point.shortShow({
                    type: "error",
                    text: "加载失败，请检查网络"
                });
                that.errorShow();
            },

            complete: function() {
                that.$el.removeClass("state-loading");
                that.loading = false;
            }
        });
    },

    loadMore: function() {
        var that = this;
        if (this.loadMoring) {
            return;
        }
        this.loadMoreing = true;

        that.loadingShow()

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") +
                "/departments?parent=" + this.model.get("id") + "&page=" +
                (this.page + 1) + "&count=" + this.pageSize,
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.page++;
                    that.addChildren(response.data);
                    if (response.data.length < that.pageSize) {
                        that.hideLoadInfo();
                    } else {
                        that.loadMoreShow();
                    }
                } else {
                    that.$el.addClass("state-more-error");
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },

            error: function() {
                that.$el.addClass("state-more-error");
                point.shortShow({
                    type: "error",
                    text: "加载失败， 请检查网络"
                });
                that.moreErrorShow()
            },

            complete: function() {
                that.loadMoring = false;
                that.$el.removeClass("state-more-load");
            }
        });
    },

    addChildren: function(list) {
        var that = this;
        _.each(list, function(data) {
            var itemView = new View({
                model: new Backbone.Model(data),
                rootView: that.rootView,
                parentView: that
            });
            that.$list.append(itemView.$el);
        });
    },

    hideLoadInfo: function() {
        this.$error.hide()
        this.$loading.hide()
        this.$moreError.hide()
        this.$loadMore.hide()
    },

    errorShow: function() {
        this.$error.show()
        this.$loading.hide()
        this.$moreError.hide()
        this.$loadMore.hide()
    },

    // TODO 改为showLoadMore , 下面类似
    loadMoreShow: function() {
        this.$error.hide()
        this.$loading.hide()
        this.$moreError.hide()
        this.$loadMore.show()
    },
    loadingShow: function() {
        this.$error.hide()
        this.$loading.show()
        this.$moreError.hide()
        this.$loadMore.hide()
    },
    moreErrorShow: function() {
        this.$error.hide()
        this.$loading.hide()
        this.$moreError.show()
        this.$loadMore.hide()
    },

    destroy: function() {
        this.remove();
    }

});

module.exports = View;
