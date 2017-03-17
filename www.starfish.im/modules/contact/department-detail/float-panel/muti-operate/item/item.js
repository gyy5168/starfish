var _=require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

var View=Backbone.View.extend({
    tagName:"li",
    template:__inline("item.tmpl"),
    attributes:{
        class:"item"
    },
    initialize:function(){
        this.render()
    },
    render:function(){
        var data=this.model.toJSON();
        if(data.gender){
            data.sex="女"
        }else {
            data.sex="男"
        }
        this.$el.html(this.template({data:this.model.toJSON()}));

    },
    destroy:function(){
        this.remove()
    }
})

module.exports=View