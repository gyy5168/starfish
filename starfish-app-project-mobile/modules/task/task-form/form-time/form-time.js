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
        class: "form-time"
    },

    initialize: function(options) {
        this.prevTitle = topBar.getTitle();
        this.prevBack = topBar.getBack();
        this.prevMenu = topBar.getMenu();

        this.type = options.type || "expected_hours";
        this.taskId = options.taskId || "";
        this.render();
        this.initEvent();
    },

    render: function() {
        var that = this;

        this.$el.html(__inline("form-time.html"));
        this.$textarea = this.$el.find("textarea");
        this.$infoPanel = this.$el.find(".info-panel");
        this.$num = this.$infoPanel.find(".item-num");
        this.$modifyPanel = this.$el.find(".modify-panel");
        this.$input = this.$modifyPanel.find("input");
        if (this.type == "spent_hours") {
            this.$infoPanel.find("label").text("实际耗时");
            this.$modifyPanel.addClass("spent_hours");
        }
    },

    initEvent: function() {
        var that = this;

        this.$infoPanel.on("click", function() {
            that.showModifyPanel()
        });
        this.$modifyPanel.on("click", ".task-time", function() {
            that.$input.focus()
        });

    },

    set: function(num) {
        this.$num.text(num || "");
    },

    get: function() {
        return this.$infoTextarea.val();
    },

    showModifyPanel: function() {
        var that = this;
        if (this.type == "expected_hours") {
            topBar.setTitle("预计耗时");
            this.$input.val(this.$num.text());
        } else {
            topBar.setTitle("实际耗时");
            this.$modifyPanel.find(".spent").text(this.$num.text() || 0);
        }

        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            name: "确定",
            callback: $.proxy(this.finishModify, that)
        }]);

        $(".modify-container").html(this.$modifyPanel);
        this.$modifyPanel.show();
        $(".modify-container").show();
    },

    hideModifyPanel: function() {
        this.$modifyPanel.hide();

        $(".modify-container").html("");
        $(".modify-container").hide();
    },

    finishModify: function() {
        var that = this,
            data = {},
            num;
        if (this.type == "expected_hours") {
            num = this.$input.val();
            data = {
                expected_hours: num
            };
        } else {
            num = Number(this.$input.val()) + Number(this.$modifyPanel.find(".spent").text());

            data = {
                spent_hours: num
            };
        }
        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId,
            type: "PATCH",
            data: JSON.stringify(data),
            success: function(response) {
                if (response.errcode === 0) {
                    that.$num.text(num);
                    that.$input.val("");
                    that.trigger("change",data);
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
