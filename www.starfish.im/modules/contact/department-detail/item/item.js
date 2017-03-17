var _=require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

var View=Backbone.View.extend({

    tagName:"li",

    template:__inline("item.tmpl"),

    initialize:function(option){
        this.currentDepartment=option.currentDepartment;
        this.render();
        this.initEvent();
        //TODO 没用到
        //用到了，如果该成员在多个部门里的话，就不好从后端返回的部门数据里取数据了
        // 在第二栏的树里面抛出的select事件里传的数据里传过来

    },

    render:function(){
        var data=this.model.toJSON();
        data.name=data.name || "";
        data.phone=data.phone || "";
        data.position=data.position || "";
        data.time=data.time || "";
        data.department=this.currentDepartment.get("name")
        this.$el.html(this.template({data:data}));
        this.$el.data("id",data.id)
        this.$select=this.$el.find(".JS-member-select")
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