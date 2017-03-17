var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    point = require("modules-common/point/point.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    MemberListView = require("./member-list/member-list.js");

var View = Backbone.View.extend({
    attributes: {
        class: "people-select-project"
    },
    memberTemplate: __inline("member-item.tmpl"),

    initialize: function(options) {
        this.memberList = new Backbone.Collection();

        this.prevTitle = topBar.getTitle();
        this.prevBack = topBar.getBack();
        this.prevMenu = topBar.getMenu();

        this.projectId = options.projectId;
        this.taskId = options.taskId;
        this.type = options.type || "charge";
        this.render();
        this.initClickEvent();
        this.initListEvent();
    },

    render: function() {
        var that = this;

        this.$el.html(__inline("people-select-project.html"));
        this.$infoPanel = this.$el.find(".info-panel");
        this.$label = this.$infoPanel.find("label");

        this.$memberList = this.$infoPanel.find(".members-list");
        this.$selectPanel = this.$el.find(".select-panel");

        this.$error = this.$selectPanel.find(".JS-error");
        this.$loading = this.$selectPanel.find(".JS-loading")
        this.$empty = this.$selectPanel.find(".JS-empty");
    },

    initClickEvent: function() {
        var that = this;
        this.$infoPanel.on("click", function() {
            that.showSelectPanel()
        });
        this.$selectPanel.on("click", ".member-list .depart", function() {
            var id = $(this).data("id");
            that.searchDepart(id);
        });
        this.$selectPanel.on("click", ".member-list .people", function() {
            that.choosePeople($(this));
        });

    },

    initListEvent: function() {
        var that = this;
        this.listenTo(this.memberList, "add", this.addItem);
        this.listenTo(this.memberList, "remove", this.removeItem);

        this.listenTo(this.memberList, "reset", function(models, options) {
            $.each(options.previousModels, function(model) {
                that.removeItem(model);
            });
            that.$memberList.empty();
            that.memberList.each(function(model) {
                that.addItem(model);
            });
        });

        this.listenTo(this.memberList, "add reset remove destroy", function() {});
    },

    addItem: function(model, list, option) {
        var data = model.toJSON();
        this.$memberList.append(this.memberTemplate(data));
    },

    removeItem: function(model) {

    },

    searchRoortDepart: function() {
        var that = this;
        this.$error.hide();
        this.$loading.show();
        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/departments?parent=0",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    var id = response.data[0].id;
                    that.searchDepart(id);
                } else {
                    that.$error.show();
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode)
                    })
                }
            },

            error: function() {
                that.$error.show();
                that.$loading.hide();
                point.shortShow({
                    text: global.texts.netError
                });
                that.$error.one("click", function() {
                    that.searchRoortDepart();
                })
            },

            complete: function() {
                that.$loading.hide();
            }
        });
    },

    loadMembers: function() {
        var that = this;
        this.$selectPanel.append(new MemberListView({
            projectId: that.projectId
        }).$el);
    },

    choosePeople: function($item) {
        var data = {};
        data.id = $item.data("id");
        data.avatar = $item.find("img")[0].src;
        data.name = $item.find("span").text();

        if ($item.hasClass("selected")) {
            var model = global.data.selectedList.get(data.id);
            global.data.selectedList.remove(model);
            $item.removeClass("selected");
        } else {
            global.data.selectedList.reset(data);
            $(".member-list .people").removeClass("selected");
            $item.addClass("selected");
        }
    },

    set: function(members) {
        this.memberList.reset(members);
        var members = this.memberList.map(function(item) {
            return item.get("id");
        });
    },

    get: function() {
        var members = this.memberList.map(function(item) {
            return item.get("id");
        });

        return members[0];
    },

    showSelectPanel: function() {
        var that = this;
        global.data.selectedList = this.memberList.clone();

        topBar.setTitle("设置任务负责人");

        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            name: "确定",
            callback: $.proxy(this.finishSelect, that)
        }]);
        this.$selectPanel.show();
        this.loadMembers();


        $(".modify-container").html(this.$selectPanel);
        $(".modify-container").show();
        
    },

    hideSelectPanel: function() {
        this.$selectPanel.hide();
        $(".modify-container").html("");
        $(".modify-container").hide();
    },

    finishSelect: function() {
        var that = this;
        var assignee_id = global.data.selectedList.toJSON()[0].id;
        if (assignee_id == this.memberList.toJSON()[0].id) {
            that.back();
            return;
        }
        if (this.type == "detail") {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId,
                type: "PATCH",
                data: JSON.stringify({
                    "assignee": assignee_id
                }),
                success: function(response) {
                    if (response.errcode === 0) {
                        that.memberList = global.data.selectedList;
                        that.$memberList.empty();
                        that.memberList.each(function(model) {
                            that.addItem(model);
                        });
                        that.trigger("change",{
                            assignee_info:global.data.selectedList.toJSON()[0]
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
            this.memberList = global.data.selectedList;
            this.$memberList.empty();
            this.memberList.each(function(model) {
                that.addItem(model);
            });
            this.back();
        }
    },

    back: function() {

        this.$loading.hide();
        this.$error.hide();
        var views = this.$selectPanel.find(".member-list");
        if (views.length > 1) {
            $(views[views.length - 1]).remove();
        } else {
            this.hideSelectPanel();
            topBar.showTitle(this.prevTitle);
            topBar.showMenu(this.prevMenu);
            topBar.setBack(this.prevBack);
            if (views.length == 1) {
                $(views[0]).remove();
            }
            this.hideSelectPanel();
        }
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View;
