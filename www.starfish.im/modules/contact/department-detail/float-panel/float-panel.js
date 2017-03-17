var _=require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    Detail=require("./user-detail/user-detail.js"),
    MutiOperate=require("./muti-operate/muti-operate.js");

// TODO 将用户详情和批量操作分开成连个面板会好些
var View=Backbone.View.extend({
    attributes:{
        class:"float-panel"
    },
    initialize:function(option){
        this.selectedList=global.data.operateList;
        this.departSelectedList=option.departSelectedList;
        this.currentDepartment=null;
        this.render();
        this.initEvent();
    },

    render:function(){
        this.$el.html(__inline("float-panel.html"));
        this.$close=this.$el.find(".JS-close");
        this.modules={
            detail:new Detail(),
            operate:new MutiOperate({
                departSelectedList:this.departSelectedList
            })
        };
        this.$el.append(this.modules.detail.$el);
        this.$el.append(this.modules.operate.$el);

    },

    initEvent:function(){
        var that=this;
        this.listenTo(this.selectedList,'add remove reset',function(){
            if(that.isRight()){
                that.goLeft()
            }

            if (that.selectedList.length === 0) {
                that.goRight();
            }else {
                that.modules.detail.hide();
                that.modules.operate.show()
            }
        });

        that.$close.on("click",function(){
            that.goRight();
            return false
        });

        this.listenTo(this.modules.detail,'userDeleted',function(model){
            that.trigger("userDeleted",[model.get("id")]);
            that.goRight();
        });
        this.listenTo(this.modules.operate,'userDeleted',function(list){
            that.trigger("userDeleted",list)
        })
    },

    set:function(option){
        this.modules.detail.show();
        this.modules.operate.hide();
        this.modules.detail.set(option)
    },

    isRight:function(){
        return !this.$el.hasClass("goLeft");
    },

    isOperate:function(){
        if(this.$el.hasClass("goLeft")&&this.modules.operate.$el.css("display")=="block"){
            return true;
        }else{
            return false;
        }     
    },

    goLeft:function(){
        this.$el.addClass("goLeft");
    },

    goRight:function(){
        this.$el.removeClass("goLeft");
        this.modules.operate.hide();
        this.modules.detail.showText();
    },
    hide:function(){
        this.modules.detail.show();
        this.modules.operate.hide();
        this.$el.hide();
    },
    show:function(){
        this.$el.show();
    },
    destroy:function(){
        this.modules.detail.destroy();
        this.modules.operate.destroy();
        this.remove();
    }
});
module.exports=View;