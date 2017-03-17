/**
 * Created by Administrator on 2015/9/17.
 */


var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
    attributes: {
        class:"domain-help"
    },
    initialize: function () {
        this.render()
        this.initEvent();
    },
    render: function () {
        this.$el.html(__inline("help.html"));
        this.$close=this.$el.find(".JS-close")
        global.$doc.append(this.$el)
    },
    initEvent:function(){
        var that=this
        this.$close.on("click",function(){
            that.hide()
        })
    },
    show:function(){
        this.$el.show();
    },
    hide:function(){
        this.$el.hide();
    },
    destroy: function () {
        this.remove();
    }
})
module.exports=new View