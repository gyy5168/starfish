var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point = require("../point/point.js"),
    JoinSuccess = require("../join-success/join-success.js");

var View = Backbone.View.extend({
    attributes:{
        "class": "no-register"
    },

    initialize: function(){
        this.render();
        this.initEvent();
    },

    render: function(){
        this.$el.html(__inline("register.html"));

        this.$eye = this.$el.find(".JS-eye");
        this.$name = this.$el.find(".JS-name input");
        this.$password = this.$el.find(".JS-password .JS-normal");
        this.$next = this.$el.find(".JS-next");
        // 没有点的密码框
        this.$passwordShow = this.$el.find(".JS-password .JS-show");
    },

    initEvent: function(){
        var that = this;

        this.$password.on("change", function(){
            that.$passwordShow.val( that.$password.val() );
        });

        this.$passwordShow.on("change", function(){
            that.$password.val( that.$passwordShow.val() );
        });

        this.$eye.on("click", function(){
           $(this).parent().toggleClass("show-password");
        });

        this.$next.on("click", function(){
            var name = that.$name.val(),
                password = that.$password.val();

            name = name.replace(/\s+/g,"");
            password = password.replace(/\s+/g,"");
            if ( !that.verify(name, password) ) {
                return;
            }

            that.register(name, password);
        });
    },

    // 验证密码和姓名
    verify: function(name, password){

        if ( name === "" ) {
            point.shortShow({
                type:"error",
                text:"姓名不能为空"
            });
            return false;
        }

        if ( name.length >= 30 ) {
            point.shortShow({
                type:"error",
                text:"姓名的长度不能超过30个字符"
            });
            return false;
        }

        if( password === "" ) {
            point.shortShow({
                type:"error",
                text:"密码不能为空"
            });
            return false;
        }

        if ( password.length < 6 || password.length > 15 ) {
            point.shortShow({
                type:"error",
                text:"密码不合法"
            });
            return false;
        }

        // 密码必须是字母,数字,字符中的任意两种组合
        var num = 0;
        if ( /\d+/.test(password) ) {
            num++;
        }

        if ( /[a-zA-Z]+/.test(password) ) {
            num++;
        }

        if ( /[^a-zA-Z0-9]+/.test(password) ) {
            num++;
        }

        if ( num < 2 ) {
            point.shortShow({
                type:"error",
                text:"密码不合法"
            });
            return false;
        }

        return true;
    },

    register: function(name, password){
        var that = this;

        if ( this.registering ) {
            return false;
        }
        this.registering = true;

        this.$next.addClass("state-loading");

        return $.ajax({
            url: global.baseUrl + "/org_invitation/user",
            type:"POST",
            data: JSON.stringify({
                org_id: global.data.org.get("id"),
                invitation_id: global.data.invite.get("id"),
                "is_auto_login": 1,
                name: name,
                password: password,
                phone: global.phone,
                token: global.securityCode
            }),
            success: function(response){
                if ( response.errcode === 0 ) {
                    var joinSuccess = new JoinSuccess();
                    that.$el.after(joinSuccess.$el);
                    that.destroy();
                } else {
                    point.shortShow({
                        type:"error",
                        text:global.tools.getErrmsg(response.errcode)
                    });
                }
            },

            error: function(){
                point.shortShow({
                    type:"error",
                    text:"网络异常,请检查你的网络设置"
                });
            },

            complete: function(){
                that.registering = false;
                that.$next.removeClass("state-loading");
            }
        });
    },

    destroy: function(){
        this.remove();
    }
});

module.exports = View;
