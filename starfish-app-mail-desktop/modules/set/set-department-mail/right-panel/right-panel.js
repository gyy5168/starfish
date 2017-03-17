/**
 * Created by Administrator on 2015/9/17.
 */


var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    Header=require("./header/header.js"),
    ItemMail=require("./item-mail/item-mail.js"),
    SearchMail=require("./search-mail/search-mail.js"),
    $ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
    attributes:{
        class:"right-panel-content"
    },
    initialize: function (list) {

        this.modules = {
            head:new Header,
            searchView:new SearchMail,
            mailItemView:new ItemMail
        }

        this.render();
        this.initEvent();
    },

    render:function(){
        this.$el.append(this.modules.head.$el)
        this.$el.append(this.modules.searchView.$el)
        this.$el.append(this.modules.mailItemView.$el)
    },

    initEvent: function () {
        var that=this

        this.listenTo(this.modules.head,"searchstart",function(value){

            that.modules.mailItemView.hide()
            that.modules.searchView.show()
            that.modules.searchView.loading()
        })

        this.listenTo(this.modules.head,"search",function(value){

            value = value.replace(/(^\s*)|(\s*$)/g, "");

            if ( value === "" ) {
                that.modules.mailItemView.show();
                that.modules.searchView.hide();

                return false;
            }
            that.modules.mailItemView.hide();
            that.modules.searchView.show()
            that.modules.searchView.set(value)
        })

        this.listenTo(this.modules.head,"back",function(){
            that.modules.mailItemView.show()
            that.modules.searchView.hide()
        })
    },

    set:function(model){
        this.model=model

        this.modules.searchView.hide()
        this.modules.mailItemView.show()
        this.modules.mailItemView.set(model)
    },

    hide:function(){
        this.$el.hide()
    },

    destroy: function () {
        this.remove()
    }
})


module.exports=View