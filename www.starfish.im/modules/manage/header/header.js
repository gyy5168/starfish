/*
 * 后台管理的头部
 * */
var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    OrgSelect = require("./org-select/org-select.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
    attributes: {
        "class": "manage-header"
    },

    template: __inline("header.tmpl"),

    initialize: function() {
        this.render();
        this.initEvent();
    },

    render: function() {
        this.$el.html(this.template({
            name: global.data.user.get("name")
        }));

        this.modules = {
            orgSelect: new OrgSelect()
        };

        this.$el.prepend(this.modules.orgSelect.$el);
        this.$exit = this.$el.find(".JS-user-exit");
    },

    initEvent: function() {
        this.$exit.on("click", function() {
            return $.ajax({
                url: global.baseUrl + "/sessions/self",
                type: "DELETE",
                success: function(response) {
                    if (response.errcode === 0) {
                        location.href = "http://test.starfish.im/pages/login/index.html?redirectURL=" + encodeURI(location.href);
                    }
                },

                error: function() {
                    point.shortShow({
                        "text": global.texts.netError
                    });
                }
            });


        });
        this.listenTo(this.modules.orgSelect, 'orgSwitch', function() {
            global.event.trigger("orgSwitch");
        });
        this.listenTo(this.modules.orgSelect, 'orgModify', function() {
            global.event.trigger("orgModify");
        });
    },

    destroy: function() {
        this.modules.orgSelect.destroy();
        this.remove();
    }
});

module.exports = View;
