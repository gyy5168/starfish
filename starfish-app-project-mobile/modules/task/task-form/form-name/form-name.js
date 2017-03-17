var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    point = require("modules-common/point/point.js"),
    confirm = require("modules-common/confirm/confirm.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    Autosize = require("modules-common/autosize/autosize.js");

var View = Backbone.View.extend({
    tagName: "form",
    attributes: {
        class: "form-name"
    },

    initialize: function(options) {
        this.prevTitle = topBar.getTitle();
        this.prevBack = topBar.getBack();
        this.prevMenu = topBar.getMenu();

        this.type = options.type || "create";
        this.taskId=options.taskId||"";
        this.render();
        this.initEvent();
    },

    render: function() {
        var that = this;

        this.$el.html(__inline("form-name.html"));
        this.$textarea = this.$el.find("textarea");
        this.$infoPanel = this.$el.find(".info-panel");
        this.$infoTextarea = this.$infoPanel.find("textarea");
        this.$modifyPanel = this.$el.find(".modify-panel");
        this.$modifyTextarea = this.$modifyPanel.find("textarea");

        if (this.type == "create") {
            this.$textarea.removeAttr("disabled");
            this.$el.addClass("create");
            this.$modifyPanel.remove();
        } else {
            this.$el.addClass("detail");
        }
    },

    initEvent: function() {
        var that = this;
        if (this.type == "detail") {
            this.$infoPanel.on("click", function() {
                that.showModifyPanel();
            });
        }
    },

    set: function(name) {
        this.$infoTextarea.val(name);
    },

    get: function() {
        return this.$infoTextarea.val();
    },

    showModifyPanel: function() {
        var that = this;
        topBar.setTitle("项目名称");
        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            name: "确定",
            callback: $.proxy(this.finishModify, that)
        }]);
        this.$modifyTextarea.val(this.$infoTextarea.val());
        this.$modifyPanel.show();
        Autosize.update(this.$modifyTextarea);

        if (this.type == "detail") {
            $(".modify-container").html(this.$modifyPanel);
            this.$modifyPanel.show();
            Autosize.update(this.$modifyTextarea);
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

    finishModify: function() {
        var that=this;
        var subject = this.$modifyTextarea.val();
        if (!subject) {
            point.shortShow({
                text: "项目名称不能为空"
            });
            return;
        }
        if (this.type == "create") {
            this.$infoTextarea.val(subject);
            Autosize.update(this.$infoTextarea);
            this.back();
        } else {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId,
                type: "PATCH",
                data: JSON.stringify({
                    subject: subject
                }),
                success: function(response) {
                    if (response.errcode === 0) {
                        that.$infoTextarea.val(subject);
                        Autosize.update(this.$infoTextarea);
                        that.trigger("change", {
                            subject: subject
                        })
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
        }
    },

    back: function() {
        this.hideModifyPanel();
        topBar.showTitle(this.prevTitle);
        topBar.showMenu(this.prevMenu);
        topBar.setBack(this.prevBack);
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View;
