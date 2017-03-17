var Backbone = require("modules-common/backbone/backbone.js"),
    OrgContact = require("modules/contact/contact.js"),
    OrgSet = require("modules/organization-set/organization-set.js");

var View = Backbone.View.extend({
    attributes: {
        class: "manage-container"
    },

    initialize: function () {
        this.render();
        this.initEvent();
        this.initRouterEvent();
    },

    render: function () {
        this.$el.html(__inline("container.html"));

        this.$contact = this.$el.find(".JS-org-contact");
        this.$set = this.$el.find(".JS-org-set");
        this.$content = this.$el.find(".JS-manage-content");
    },

    initEvent: function () {

        this.$contact.on("click", function () {
            global.router.navigate("", {trigger: true});
        });

        this.$set.on("click", function () {
            global.router.navigate("set", {trigger: true});
        });
    },

    initRouterEvent: function () {
        var that = this;

        global.router.route("", function () {
            // 修改导航样式
            that.$set.removeClass("active");
            that.$contact.addClass("active");

            // 修改当前模块为联系人
            if ( that.currentModule && that.currentModule instanceof OrgContact ) {
                return;
            }

            if ( that.currentModule ) {
                that.currentModule.destroy();
            }

            that.currentModule = new OrgContact();
            that.$content.html( that.currentModule.$el );
        });

        global.router.route("set", function () {
            // 修改导航样式
            that.$set.addClass("active");
            that.$contact.removeClass("active");

            // 修改当前模块为组织设置
            if ( that.currentModule && that.currentModule instanceof OrgSet ) {
                return;
            }

            if ( that.currentModule ) {
                that.currentModule.destroy();
            }

            that.currentModule = new OrgSet();
            that.$content.html( that.currentModule.$el );
        });
    },

    destroy: function(){
        if ( this.currentModule ) {
            this.currentModule.destroy();
        }
        this.$el.remove();
    }
});

module.exports = View;