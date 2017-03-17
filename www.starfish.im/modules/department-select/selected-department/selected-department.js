var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
    _=require("modules-common/underscore/underscore.js");

var View = Backbone.View.extend({

	attributes: {
		class: "selected-department-content"
	},

    tagName:"ul",

    template: __inline("selected-department.tmpl"),

	initialize: function( options ) {
		this.selectedList = options.selectedList;
		this.render();
        this.initEvent();
	},

	render: function() {

	},

    initEvent: function(){
      var that = this;

        this.listenTo( this.selectedList, "add", this.addItem );
        this.listenTo( this.selectedList, "remove", this.removeItem );
        this.listenTo(this.selectedList,'reset',function(models,options) {
            _.each(options.previousModels,function(model){
                that.removeItem(model)
            })
            that.selectedList.each(function(model){
                that.addItem(model)
            })
        })
        this.$el.on("click", ".JS-remove", function(){
           var id = $(this).parent().data("id");
            that.selectedList.remove(id);
        });
    },

    addItem: function(model){
        var obj = model.toJSON();
        this.$el.append( this.template(obj));
    },

    removeItem: function(model){
        var id = model.get("id");
        this.$el.find("li[data-id="+id+"]").remove();
    },

	destroy: function(){
		this.remove();
	}
});

module.exports = View;