var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    ItemView = require("../list-item/list-item.js"),
    point = require("modules-common/point/point.js");


var View = Backbone.View.extend({
    tagName: "ul",
    attributes: {
        class: "member-list"
    },
    pageNum: 1,
    pageSize: 30,

    initialize: function(options) {
        this.projectId = options.projectId;
        this.render();
        this.seachMembers();
    },

    render: function() {
        this.$loading = $(".people-select-project").find(".JS-loading");
        this.$error = $(".people-select-project").find(".JS-error");
        this.$empty = $(".people-select-project").find(".JS-empty");

        this.$el.append(__inline("/modules-common/ui/load-more/load-more.html"));
        this.$moreLoading = this.$el.find(".JS-more-loading");
        this.$moreError = this.$el.find(".JS-more-error");
        this.$noMore = this.$el.find(".JS-more-none");
        this.scrollEvent();
    },

    seachMembers: function() {
        var that = this;
        this.$error.hide();
        this.$empty.hide();
        this.$loading.show();
        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/projects/" + that.projectId + "/members?detail=1&page=1&count=30",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.addItemList(response.data)
                    if(response.data.length==0){
                        that.$empty.show();
                    }
                } else {
                    that.$error.show();
                    point.shortShow({
                        "text": global.tools.getErrmsg(response.errcode)
                    });
                    that.$error.on("click", function() {
                        that.seachDepartMembers();
                    });
                }
            },
            error: function() {
                that.$error.show();
                point.shortShow({
                    text: global.texts.netError
                });
                that.$error.on("click", function() {
                    that.seachDepartMembers();
                });
            },
            complete: function() {
                that.$loading.hide();
            }
        });
    },

    seachMoreMembers: function(pageNum) {
        var that = this;
        // that.$loading.hide();
        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/projects/" + that.projectId + "/members?detail=1&page=" + pageNum + "&count=30",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    if (response.data.length == 0) {
                        that.noMore = true;
                        that.$noMore.show();
                    } else {
                        that.addItemList(response.data);
                        that.pageNum++;
                    }
                } else {
                    that.$moreError.show();
                    that.$moreError.on("click", function() {
                        that.seachMoreMembers(pageNum);
                    });
                    point.shortShow({
                        "text": global.tools.getErrmsg(response.errcode)
                    })
                }
            },
            error: function() {
                that.$moreError.show();
                that.$moreError.on("click", function() {
                    that.seachMoreMembers(pageNum);
                });
                point.shortShow({
                    text: global.texts.netError
                });
            }
        });
    },

    scrollEvent: function() {
        var that = this;
        this.$el.on("scroll", function(event) {
            if (that.noMore) {
                return;
            }
            if (that.moreList) {
                return;
            }

            if (this.scrollTop + that.$el.height() == this.scrollHeight) {
                that.seachMoreMembers(that.pageNum + 1)
            }
        });
    },

    isSelected: function(id) {
        var selectedList = global.data.selectedList;
        var model = selectedList.get(id);
        if (model) {
            return true;
        } else {
            return false;
        }
    },

    addItemList: function(data) {
        var that = this;
        $.each(data, function(index, item) {
            var itemView = new ItemView({
                model: new Backbone.Model(item)
            });
            if (that.isSelected(item.id)) {
                itemView.$el.find(".item-wraper").addClass("selected");
            }
            that.$moreLoading.before(itemView.$el);
            // that.$el.append(itemView.$el);
        })

    }
});
module.exports = View;
