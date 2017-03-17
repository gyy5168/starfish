var _=require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

var View=Backbone.View.extend({

    tagName:"li",

    template:__inline("item.tmpl"),

    initialize:function(option){
        this.render()
        this.initEvent()
        this.department=option.department
    },

    render:function(){
        var data=this.model.toJSON();
        data.name=data.name || "";
        data.phone=data.phone || "";
        data.department= data.departments ? data.departments[0] : "";
        data.position=data.position || "";
        data.time=data.time || "";

        this.$el.html(this.template({data:data}));
        this.$el.data("id",data.id)
    },

    initEvent:function(){
        this.listenTo(this.model,'change',this.render)
    },

    select:function(){

        this.$select.addClass("selected")
    },

    isSelected:function(){
        return !!this.$select.hasClass("selected")
    },

    unSelect:function(){
        this.$select.removeClass("selected")
    },

    pick:function(){
        this.$el.addClass("picked")
    },

    unpick:function(){
        this.$el.removeClass("picked")
    },

    isPicked:function(){
        return !!this.$el.hasClass("picked")
    },

    get:function(){
        return this.model
    },
    destroy:function(){
        this.remove()
    }
})
module.exports=View;