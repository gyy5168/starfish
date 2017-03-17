var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point = require("../point/point.js"),
    JoinSuccess = require("../join-success/join-success.js"),
    Register = require("../register/register.js");

var View = Backbone.View.extend({
    attributes:{
        "class": "phone-verify"
    },

    initialize: function(phone){
        this.phone = phone;
        this.render();
        this.initEvent();
    },

    render: function(){
        this.$el.html(__inline("phone-verify.html"));
        this.$phoneInput = this.$el.find(".JS-phone input");
        this.$codeInput = this.$el.find(".JS-code input");
        this.$getCode = this.$el.find(".JS-get-code");
        this.$next = this.$el.find(".JS-next");

        if ( this.phone ) {
            this.$phoneInput.val(this.phone);
            this.$phoneInput.attr("disabled", true);
            this.$phoneInput.addClass("disabled");
        }

        global.$doc.append(this.$el);
    },

    initEvent: function(){
        var that = this;

        this.$getCode.on("click", function(){
            if ( that.$getCode.hasClass("disabled") ) {
                return;
            }

            var phone = that.$phoneInput.val();
            phone = phone.replace(/\s+/g,"");

            if ( !that.verifyPhone(phone) ) {
                return;
            }

            that.getSecurityCode(phone);
        });

        this.$next.on("click", function(){
            var code = that.$codeInput.val(),
                phone = that.$phoneInput.val();

            // 验证下手机号和验证码
            code = code.replace(/\s+/g,"");
            phone = phone.replace(/\s+/g,"");

            if ( !that.verifyPhone(phone) ) {
                return false;
            }

            if( code === "" ) {
                point.shortShow({
                    type:"error",
                    text:"验证码不能为空"
                });
                return false;
            }

            that.next(phone, code);
        });
    },

    // 验证手机号是否正确
    verifyPhone: function(phone){
        if ( phone === "" ) {
            point.shortShow({
                type:"error",
                text:"手机号码不能为空"
            });
            return false;
        }

        if ( !/\d{11}/.test(phone) ) {
            point.shortShow({
                type:"error",
                text: "手机号码格式错误"
            });
            return false;
        }

        return true;
    },

    // 下一步
    next: function(phone, code){
        var that = this;
        if ( this.nexting ) {
            return false;
        }
        this.nexting = true;
        this.$next.addClass("state-loading");

        // 验证验证码
        this.verifySecurityCode(phone, code).then(function(response){
            if ( response.errcode !== 0 || response.data === null ) {
                return false;
            }

            // 如果成功且该号码没有注册,跳转到NoRegister模块
            if ( !response.data.user_id ) {
                var register = new Register();
                that.$el.after(register.$el);
                that.destroy();
                return false;
            }

            // 否则直接执行加入组织操作
            return that.joinOrg();
        }).then(function(response){
            // 如果加入成功,跳转到HasRegister模块
            if ( response.errcode === 0 ) {
                var joinSuccess = new JoinSuccess();
                that.$el.after(joinSuccess.$el);
                that.destroy();
            }
        }).always(function(){
            that.nexting = false;
            that.$next.removeClass("state-loading");
        });
    },

    // 获取验证码
    getSecurityCode: function(phone){
        var that = this;

        if ( this.getSecurityCodeing ) {
            return false;
        }

        this.getSecurityCodeing = true;

        this.$getCode.html("获取中...");
        return $.ajax({
            url: global.baseUrl + "/tokens",
            type: "POST",
            data: JSON.stringify({
                phone: phone,
                type: 0,
                is_auto_login: 1
            }),
            success: function(response){
                if ( response.errcode === 0 ) {
                    that.startCodeTime();
                } else {
                    point.shortShow({
                        type:"error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                    that.$getCode.html("重新获取");
                }
            },

            error: function(){
                point.shortShow({
                    type:"error",
                    text: "网络异常,请检查你的网络设置"
                });
                that.$getCode.html("获取验证码");
            },

            complete: function(){
                that.getSecurityCodeing = false;
            }

        });

    },

    // 验证手机验证码是否正确
    verifySecurityCode: function(phone, code){

        return $.ajax({
            url: global.baseUrl + "/tokens?type=0&account="+phone+"&token="+code+"&is_auto_login=1",
            type:"GET",
            success: function(response){
                if ( response.errcode === 0 ) {

                    if ( response.data === null ) {
                        point.shortShow({
                            type:"error",
                            text:"验证码错误"
                        });
                        return false;
                    }

                    global.securityCode = code;
                    global.phone = phone;

                    // 根据返回的user_id 设置user
                    if ( response.data.user_id ) {
                        global.data.user = new Backbone.Model({
                            id: response.data.user_id
                        });
                    }
                } else {
                    point.shortShow({
                        type:"error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },

            error: function(){
                point.shortShow({
                    type:"error",
                    text:"网络异常,请检查你的网络设置"
                });
            }
        });
    },

    // 假如组织
    joinOrg: function(){
        return $.ajax({
            url: global.baseUrl + "/org_invitation/user",
            type:"POST",
            data: JSON.stringify({
                org_id: global.data.org.get("id"),
                invitation_id: global.data.invite.get("id"),
                user_id: global.data.user.get("id")
            }),

            success: function(response){
                if ( response.errcode !== 0 ) {
                    point.shortShow({
                        type:"error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },

            error: function(){
                point.shortShow({
                    type:"error",
                    text:"网络异常,请检查你的网络设置"
                });
            }
        });
    },

    // 开始验证码倒计时
    startCodeTime: function(){
        var that = this,
            time = 60;

        that.$getCode.html("重新获取(" + time + ")");
        that.$getCode.addClass("disabled");

        this.codeTimeFn = setInterval(function(){
            if ( time === 0 ) {
                that.stopCodeTime();
                return;
            }
            time--;
            that.$getCode.html("重新获取(" + time + ")");

        }, 1000);
    },

    // 停止验证码倒计时
    stopCodeTime: function(){
        if ( !this.$getCode.hasClass("disabled") ) {
            return false;
        }

        clearInterval(this.codeTimeFn);
        this.codeTimeFn = null;
        this.$getCode.html("获取验证码");
        this.$getCode.removeClass("disabled");
    },

    destroy: function(){
        if ( this.codeTimeFn ) {
            this.stopCodeTime();
        }
        this.remove();
    }
});

module.exports = View;