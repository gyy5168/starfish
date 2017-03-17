/**
 * Created by Administrator on 2015/9/17.
 */


var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    CreateForm = require("modules/create-form/create-form.js");

var View = Backbone.View.extend({
    attributes: {
        class:"relay-bar"
    },
    initialize: function () {
        this.render();
        this.renderAction()
        this.initEvent();
        this.prevBack=window.starfishBack;
        window.starfishBack = _.bind(this.back, this);
    },
    render: function () {
        this.$el.html(__inline("relay-bar.html"));
        this.$content=this.$el.find('.JS-relay-bar-content');
        this.$wraper=this.$el.find(".JS-relay-bar-wrapper");
        global.$doc.append(this.$el);
    },

    renderAction:function(){
        var to=this.model.get("meta").to,
            cc=this.model.get("meta").cc,
            len=to.length*1+cc.length*1;

        this.$relay=this.$el.find(".JS-relay");
        this.$relayToAll=this.$el.find(".JS-relayToAll");

        if(len==1){
            this.$relayToAll.hide();
            this.$content.addClass("relay-to-one")
        }
    },

    initEvent: function () {
        var that=this;
        this.$content.on("click","div",function(){
            var action=$(this).data("action");
            if(action){
                var createForm = new CreateForm();
                createForm.set(action,that.model);
                that.remove()
            }else{
                that.destroy();
            }

        });

        this.$wraper.on("click",function(){
            that.destroy()
        })
    },

    back:function(){
        this.destroy();
        this.cancelCallback && this.cancelCallback();
    },

    destroy: function () {
        this.remove();
        window.starfishBack=this.prevBack;
    }
});

module.exports=View;

