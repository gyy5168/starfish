var _=require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

var View=Backbone.View.extend({
    attributes:{
        class:"user-detail-department"
    },

    headTemplate:__inline("user-detail-head.tmpl"),
    textTemplate:__inline("user-detail-text.tmpl"),

    initialize:function(){
        this.render();
        this.initEvent();
    },
    render:function(){
        this.$el.html(__inline("user-detail.html"));
        this.$close=this.$el.find(".JS-close");
        this.$textPanel=this.$el.find(".JS-user-detail-text");
        this.$textContent=this.$textPanel.find(".JS-text-content");

        this.$head=this.$el.find(".JS-user-detail-head")
    },

    initEvent:function(){
        var that=this;

        this.$el.on("click",function(){
            return false
        });

        this.$close.on("click",function(){
            that.goRight();
        });
    },

    set:function(data){
        var that=this;
        this.data=data;
        this.reRender()
    },

    reRender:function(){
        var data=this.data;

        this.$head.html(this.headTemplate({data:data}));
        this.$textContent.html(this.textTemplate({data:data}));
    },

    hide:function(){
        this.$el.hide();
    },
    show:function(){
        this.$el.show();
    },

    isRight:function(){
        return !this.$el.hasClass("goLeft");
    },

    goLeft:function(){
        this.$el.addClass("goLeft");
    },

    goRight:function(){
        this.$el.removeClass("goLeft")
    },

    isShow:function(){
        return !!this.$el.css("display");
    },
    destroy:function(){
        this.remove();
    }
});

module.exports=View;