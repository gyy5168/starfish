var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    Modal = require("modules-common/modal/modal.js"),
    point = require("modules-common/point/point.js");

var View = Modal.extend({

    attributes: {
        "class": "invite-member-modal"
    },

    title: "邀请成员",

    content: __inline("invite-member.html"),

    initialize: function(option) {
        View.__super__.initialize.call(this);

        this.render();
        this.initEvent();
        this.set(option);
    },

    render: function() {
        View.__super__.render.call(this);
        this.$ok = this.$el.find(".JS-ok");
        this.$send = this.$el.find(".JS-send");
        this.$input = this.$el.find(".JS-input");
        this.$content = this.$el.find(".JS-content");
        this.$cancel = this.$el.find(".JS-modal-close");
        this.$error = this.$el.find(".JS-error");
        this.$error.hide();
    },

    initEvent: function() {
        var that = this;
        View.__super__.initEvent.call(this);
        this.$ok.on("click", function() {
            that.addMember("continue");
        });

        this.$cancel.on("click", function(evt) {
            that.cancelCallback && that.cancelCallback();
        });
        this.$send.on("click", function(evt) {
            that.addMember("back");
        });
        this.$input.blur(function() {
            that.verifyTelephone();
        });
        this.$input.on("focus", function() {
            that.$error.hide();
        });
    },

    verifyTelephone: function() {
        var phone = this.$input.val();
        if (phone.length == 0) {
            this.verifyPhone = false;
            this.$error.html("手机号码不能为空").show();
            return;
        }
        var numTest = /^\d+$/;
        if (!numTest.test(phone)) {
            this.verifyPhone = false;
            this.$error.html("手机号码格式错误").show();
            return;
        }
        if (phone.length != 11) {
            this.verifyPhone = false;
            this.$error.html("手机号码长度错误").show();
            return;
        }
        var partten = /^1\d{10}$/;
        var isTelephone = partten.test(phone);
        if (isTelephone) {
            this.verifyPhone = true;
            this.$error.hide();
        } else {
            this.verifyPhone = false;
            this.$error.html("手机号码格式错误").show();
        }
    },

    set: function(option) {
        option = option || {};
        this.callback = option.callback;
        this.hideCallback = option.hideCallback;
        this.cancelCallback = option.cancelCallback;
        this.orgId = option.orgId;
        this.$input.val(option.orgName);
        this.hideDestroy = option.hideDestroy;
    },

    addMember: function(type) {
        var that = this;
        var phone = this.$input.val();
        that.verifyTelephone();
        if (this.verifyPhone === false) {
            // this.$input.focus();
            return;
        }
        var data = {
            type: "phone",
            org_id: this.orgId,
            to: [phone]
        };
        var isStarfishUser = function() {
            return $.ajax({
                url: global.baseUrl + "/users?phone=" + phone,
                type: "GET",
                success: function(response) {
                    if (response.errcode === 0) {
                        that.userId = response.data.id || "";
                    } else if (response.errcode === 9) {
                        that.userId = "";
                    } else {
                        point.shortShow({
                            type: "error",
                            text: global.tools.getErrmsg(response.errcode)
                        });
                    }

                },

                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                },

                complete: function() {

                }
            })
        }
        var isOrgMembervar = function() {
            return $.ajax({
                url: global.baseUrl + "/orgs/"+that.orgId+"/members/" + that.userId,
                type: "GET",
                success: function(response) {

                    if (response.errcode != 0) {
                        point.shortShow({
                            type: "error",
                            text: global.tools.getErrmsg(response.errcode)
                        });
                    }
                },

                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                },

                complete: function() {

                }
            })
        }
        var sendMessage = function() {
            return $.ajax({
                url: global.baseUrl + "/invitations",
                type: "POST",
                data: JSON.stringify(data),
                success: function(response) {

                    if (response.errcode === 0) {
                        point.shortShow({
                            "text": "邀请已发送"
                        });
                        if (type === "back") {
                            that.hide();
                        } else {
                            that.$input.val("");
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
                        text: global.texts.netError
                    });
                },

                complete: function() {

                }
            })
        };
        isStarfishUser().success(function(response) {
            if (!that.userId) {
                sendMessage();
            } else {
                isOrgMembervar().success(function(response) {
                    if (response.errcode === 0) {
                        var isMember = false;
                        if(response.data[that.userId]&&response.data[that.userId].is_left==0){
                            isMember=true;
                        }
                        if (isMember) {
                            point.shortShow({
                                text: "该用户已在当前组织"
                            });
                        }else{
                            sendMessage();
                        }
                    }
                })
            }
        })
    },

    show: function(option) {
        View.__super__.show.call(this);
        if (option) {
            this.set(option);
        }
    },

    hide: function() {
        View.__super__.hide.call(this);
        if (this.hideDestroy) {
            this.destroy();
        }
        this.hideCallback && this.hideCallback();
    }
});

var result = {
    show: function(option) {
        option = option || {};
        // 隐藏摧毁组件
        option.hideDestroy = true;
        this.confirm = new View(option);
        this.confirm.show();
    },

    hide: function() {
        this.confirm && this.confirm.hide();
    }
};

module.exports = result;
