/**
 * Created by Administrator on 2015/9/17.
 */


var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
    attributes: {},
    initialize: function (list) {
        this.render();
        this.initEvent();
    },
    render: function () {
        this.$el=$(__inline("header.html"))
        this.$back=this.$el.find(".JS-button-back")
        this.$search=this.$el.find(".JS-button-search")
        this.$back.hide();
    },

    initEvent: function () {
        var that=this;
        that.timer=null;
        that.searchStart=true;

        this.$search.on("input",function(e){
            clearTimeout(that.timer)

            if(that.$search.val()==""){
                that.hideBack();
            }else{
                that.showBack();
            }

            if( that.searchStart ){
                that.trigger("searchstart",that.$search.val())
                that.searchStart=false;
            }

            that.timer=setTimeout(function(){
                that.trigger("search",that.$search.val());
                that.searchStart=true;
            },600)
        })

        that.$back.on("click",function(){
            that.trigger("back")
            that.$back.hide();
        })
    },

    showBack:function(){
        this.$back.show()
    },

    hideBack:function(){
        this.$back.hide()
    },

    destroy: function () {
        this.remove();
    }
})
module.exports=View