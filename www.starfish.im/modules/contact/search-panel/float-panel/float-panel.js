var _=require("modules-common/underscore/underscore.js"),
    $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    departmentDetail=require("./department-detail/user-detail.js"),
    peopleDetail=require("./user-detail/user-detail.js");

var View=Backbone.View.extend({

    attributes:{
        class:"float-panel"
    },

    initialize:function(){
        this.render();
        this.initEvent();
    },

    render:function(){
        this.$el.html(__inline("float-panel.html"));
        this.$close=this.$el.find(".JS-close");
        this.modules={
            department:new departmentDetail(),
            people:new peopleDetail({
                selectList: this.selectList
            })
        };

        this.$el.append(this.modules.department.$el);
        this.$el.append(this.modules.people.$el);

    },
    initEvent: function () {

    },
    set:function(option){
        if(option.type=="people"){
            this.modules.people.show();
            this.modules.department.hide();
            this.modules.people.set(option.data)
        }else {
            this.modules.people.hide();
            this.modules.department.show();
            this.modules.department.set(option.data)
        }
        this.goLeft();
    },
    isRight:function(){
        return !this.$el.hasClass("goLeft");
    },

    goLeft:function(){
        this.$el.addClass("goLeft");
    },
    goRight:function(){
        this.$el.removeClass("goLeft");
    }
});
module.exports=View;