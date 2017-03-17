var _=require("modules-common/underscore/underscore.js"),
    $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js");

var View=Backbone.View.extend({
    attributes:{
        class:"delete-department"
    },
    initialize:function(){
        this.render();
        this.initEvent()
    },
    render:function(){
        this.$el.html(__inline("delete-department.html"));
        this.$close=this.$el.find(".JS-close");
        this.$ok=this.$el.find(".JS-ok");
        this.$errorInfo=this.$el.find(".JS-error-info");

        this.$cancel=this.$el.find(".JS-cancel");
        global.$doc.append(this.$el)
    },
    initEvent:function(){
        var that=this;
        this.$ok.on("click",function(){
            that.callback && that.callback();
            that.destroy()
        });
        that.$cancel.on("click",function(){
            that.destroy()
        });
        that.$close.on("click",function(){
            that.destroy()
        })
    },

    setOkCallBack:function(fn){
        this.callback=fn
    },

    destroy:function(){
        this.remove()
    }
})
module.exports=View;