var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point = require("./point/point.js"),
    tools = require("./tools/tools.js"),
    PhoneVerify = require("./phone-verify/phone-verify.js");

var View = Backbone.View.extend({
    attributes: {
        "class": "invite"
    },

    initialize: function () {
        this.render();
        this.initEvent();
        this.load();
    },

    render: function () {
        this.$el.html(__inline("invite.html"));
        this.$content = this.$el.find(".JS-content");
        this.$invalid = this.$el.find(".JS-invalid");
        this.$errorUrl = this.$el.find(".JS-error-url");
        this.$info = this.$content.find(".JS-info");
        this.$form = this.$content.find(".JS-form");
        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        global.$doc.append(this.$el);

        if ( tools.isQQ() || tools.isWeixin() ) {
            tools.useBrowser();
        }
    },

    initEvent: function () {
        var that = this;
        this.$error.on("click", function () {
            that.load();
        });
    },

    // 加载信息
    load: function () {
        var that = this,
            inviteId = this.getQueryString("inviteId"),
            orgId = this.getQueryString("orgId"),
            phone = this.getQueryString("phone");

        if ( !inviteId || !orgId ) {
            this.$errorUrl.show();
            return false;
        }

        // 手机格式不对
        if ( phone && phone.length !== 11 ){
            this.$errorUrl.show();
            return false;
        }

        this.$loading.show();
        this.$error.hide();
        return $.ajax({
            url: global.baseUrl + "/org_invitation/" + inviteId + "?org_id=" + orgId ,
            type: "GET",
            success: function (response) {
                if (response.errcode === 0) {
                    global.data.org = new Backbone.Model(response.data.org);
                    global.data.invite = new Backbone.Model(response.data);

                    that.$info.html(response.data.creator_info.name + "邀请你加入" + response.data.org.name);
                    that.showPhoneVerify( phone );
                } else if (response.errcode === 50){
                    that.$invalid.show();
                } else {
                    point.shortShow({
                        type:"error",
                        text:global.tools.getErrmsg(response.errcode)
                    });
                    //that.$error.find(".JS-text").html(global.tools.getErrmsg(response.errcode));
                    that.$error.show();
                }
            },

            error: function () {
                //that.$error.find(".JS-text").html("加载失败，点击重新加载");
                that.$error.show();
            },

            complete: function () {
                that.$loading.hide();
            }
        });
    },

    getQueryString: function (name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
        var r = window.location.search.substr(1).match(reg);
        if (r !== null) {
            return (r[2]);
        }
        return null;
    },

    // 显示验证手机页面
    showPhoneVerify: function (phone) {
        var phoneVerify = new PhoneVerify(phone);
        this.$form.html(phoneVerify.$el);
        this.$content.show();
    },

    destroy: function () {
        this.remove();
    }
});

module.exports = View;
