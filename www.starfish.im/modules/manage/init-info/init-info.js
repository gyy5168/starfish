/*
*   加载组织列表和个人信息, 并显示loading界面, 加载成功后才会进入后台主页
* */

var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
    attributes:{
        "class": "init-info"
    },

    initialize: function( fn ){
        this.callback = fn;
        this.render();
        this.initEvent();
        this.load();
    },

    render: function(){
        this.$el.html(__inline("init-info.html"));
        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$errorBtn = this.$error.find("button");
        global.$doc.append( this.$el );
    },

    initEvent: function(){
        var that = this;
        this.$error.on("click", function(){
            that.load();
        });
    },

    // 获取当前用户的数据和组织列表
    load: function(){
        var that = this;

        if ( this.loading ) {
            return;
        }
        this.loading = true;

        this.$loading.show();
        this.$error.hide();

        //先获取当前用户数据,成功后获取组织列表
        this.loadUser().then(function(response){
            if ( response.errcode === 0 ) {
                return that.loadOrgList();
            } else {
                return false;
            }
        }).then( function(response){
            if ( response.errcode === 0 ) {
                that.destroy();
                if (response.data.length === 0 ) {
                    point.shortShow({
                        text:"您不是组织管理员，没有管理组织权限",
                        time:2000
                    });
                    setTimeout(function(){
                        location.href = "http://www.starfish.im/pages/login/index.html?redirectURL=" + encodeURI(location.href);
                    }, 2000 );
                } else {
                    that.callback();
                }

                that.loading = false;
            }
        }, function(){
            that.$loading.hide();
            that.$error.show();
            that.loading = false;
        });
    },

    // 获取当前用户信息
    loadUser: function(){
        return $.ajax({
            url: global.baseUrl + "/users/self",
            type: "GET",
            success: function( response ){
                if ( response.errcode === 0 ) {
                    global.data.user = new Backbone.Model(response.data);
                } else {
                    location.href = "http://www.starfish.im/pages/login/index.html?redirectURL=" + encodeURI(location.href);
                    return false;
                }
            }
        });
    },

    // 获取当前用户的组织列表
    loadOrgList: function(){

        return $.ajax({
            url: global.baseUrl + "/user-admins/"+global.data.user.get("id"),
            type:"GET",
            success: function( response ) {
                if ( response.errcode === 0 ) {
                    global.data.orgList = new Backbone.Collection( response.data );
                }
            }
        });
    },

    destroy: function(){
        this.remove();
    }
});

module.exports = function( fn ){
    new View(fn);
};
