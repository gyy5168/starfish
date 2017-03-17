var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    point = require("modules-common/point/point.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    ItemView = require("./list-item/list-item.js");

var View = Backbone.View.extend({
    tagName: "form",
    attributes: {
        class: "form-tag"
    },

    initialize: function(options) {
        this.tagList = new Backbone.Collection();
        this.selectedList = new Backbone.Collection();
        this.prevTitle = topBar.getTitle();
        this.prevBack = topBar.getBack();
        this.prevMenu = topBar.getMenu();

        this.type = options.type || "create";
        this.projectId = options.projectId || "";
        this.taskId = options.taskId || "";
        this.render();
        this.initClickEvent();
        this.initListEvent();
    },

    render: function() {
        var that = this;

        this.$el.html(__inline("form-tag.html"));
        this.$infoPanel = this.$el.find(".info-panel");

        this.$modifyPanel = this.$el.find(".modify-panel");

        this.$error = this.$modifyPanel.find(".JS-error");
        this.$loading = this.$modifyPanel.find(".JS-loading");

        this.$list = this.$el.find(".JS-list");
    },

    initClickEvent: function() {
        var that = this;
        this.$infoPanel.on("click", function() {
            that.showModifyPanel();
        });
        this.$modifyPanel.on("click", ".tag-list .tag", function() {
            that.chooseTag($(this));
        });
        this.$modifyPanel.on("click", ".tag-add span", function() {
            that.addNewTag();
        });

    },

    initListEvent: function() {
        var that = this;
        // this.listenTo(this.selectedList, "add", this.addItem);
        // this.listenTo(this.selectedList, "remove", this.removeItem);

        this.listenTo(this.selectedList, "reset", function(models, options) {
            $.each(options.previousModels, function(model) {
                that.removeItem(model);
            });
            that.$el.find(".tags").empty();
            that.selectedList.each(function(model) {
                that.addItem(model);
            });
        });

        this.listenTo(this.selectedList, "add reset remove destroy", function() {});
    },

    addItem: function(model, list, option) {
        var data = model.toJSON();
        this.$el.find(".tags").append("<span>" + data.name + "</span>");
    },

    removeItem: function(model) {

    },

    loadTags: function() {
        var that = this;
        this.allTags = [];
        this.$list.empty();
        this.$loading.show();
        this.$error.hide();
        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/projects/" + that.projectId + "/tags",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    if (response.data.length) {
                        $.each(response.data, function(index, item) {
                            that.allTags.push(item.name);
                        })
                    }
                    that.addItemList(response.data);
                    // that.markTags();
                } else {
                    that.$error.show();
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode)
                    })
                }
            },
            error: function() {
                that.$loadError.show();
                point.shortShow({
                    text: global.texts.netError
                });
            },
            complete: function() {
                that.$loading.hide();
            }
        });
    },

    addItemList: function(data) {
        var that = this;
        $.each(data, function(index, item) {
            var itemView = new ItemView({
                model: new Backbone.Model(item)
            });
            if (that.selectedList.findWhere({
                    name: item.name
                })) {
                itemView.$el.find(".tag").addClass("selected");
            }

            $(".tag-list").append(itemView.$el);
        });
    },

    chooseTag: function($item) {
        var id = $item.data("id");
        var name = $item.find("span").text();
        if (!$item.hasClass("selected")) {
            this.selectedList.add({
                name: name
            });
            $item.addClass("selected");
        } else {
            var model = this.selectedList.findWhere({
                name: name
            });
            this.selectedList.remove(model);
            $item.removeClass("selected");
        }
    },

    addNewTag: function() {
        this.$error.hide();
        var name = this.$modifyPanel.find('.tag-add textarea').eq(0).val();
        if (!name) {
            point.shortShow({
                text: "标签名不能为空"
            })
            return;
        }
        this.selectedList.add({
            name: name
        });
        this.$modifyPanel.find('.tag-add textarea').eq(0).val("");
        var itemView = new ItemView({
            model: new Backbone.Model({
                name: name,
                id: ""
            })
        });

        itemView.$el.find(".tag").addClass("selected");


        $(".tag-list").prepend(itemView.$el);

    },

    set: function(tags) {
        var that = this;
        this.selectedList.reset(tags);
        // this.selectedList.each(function(model){
        //     that.addItem(model)
        // })
    },

    get: function() {
        return this.tags;
    },

    showModifyPanel: function() {
        var that = this;
        // this.selectedList = this.tagList.clone();
        topBar.setTitle("设置标签");
        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            name: "确定",
            callback: $.proxy(this.finishSelect, that)
        }]);
        this.$modifyPanel.show();
        this.loadTags();
        if (this.type == "detail") {
            $(".modify-container").html(this.$modifyPanel);
            this.$modifyPanel.show();
            $(".modify-container").show();
        }
    },

    hideModifyPanel: function() {
        this.$modifyPanel.hide();
        if (this.type == "detail") {
            $(".modify-container").html("");
            $(".modify-container").hide();
        }
    },

    finishSelect: function() {
        var that = this;
        this.tags = this.selectedList.map(function(item) {
            return item.get("name");
        });
        if (this.type == "detail") {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId,
                type: "PATCH",
                data: JSON.stringify({
                    tags: that.tags
                }),
                success: function(response) {
                    if (response.errcode === 0) {

                        var tags = response.data.tags;
                        that.selectedList.reset(tags);
                        that.trigger("change",{
                            tags:tags
                        });
                        that.back();
                    } else {
                        point.shortShow({
                            text: global.tools.getErrmsg(response.errcode)
                        });
                    }
                },
                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                }
            });
        } else {
            that.selectedList.reset(that.selectedList.toJSON());
            that.back();
        }
    },

    back: function() {

        this.$loading.hide();
        this.$error.hide();
        this.$modifyPanel.find('.tag-add textarea').eq(0).val("");
        this.hideModifyPanel();
        $(".tag-list").empty();
        topBar.showTitle(this.prevTitle);
        topBar.showMenu(this.prevMenu);
        topBar.setBack(this.prevBack);

    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View;
