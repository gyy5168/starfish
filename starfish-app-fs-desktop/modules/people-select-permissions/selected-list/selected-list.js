var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	attributes:{
		"class": "selected-list"
	},

	tagName: "ul",

	template: __inline("list-item.tmpl"),

	initialize: function(option){
		this.selectedList = option.selectedList;
		this.render();
		this.initEvent();
	},

	render: function(){

	},

	initEvent: function(){
		var that = this;
		this.$el.on("click", ".JS-remove", function(){
			var id = $( this ).parent().data("id");
			that.selectedList.remove(id);
		});

		this.listenTo( this.selectedList, "add", this.addItem);
		this.listenTo( this.selectedList, "remove", this.removeItem);
	},

	addItem: function(model){
		var obj = model.toJSON();
		obj.id = this.selectedList.modelId( obj );
		this.$el.append( this.template( obj ));
	},

	removeItem: function(model){
		var id = this.selectedList.modelId(model.toJSON());
		this.$el.find("li[data-id="+id+"]").remove();
	},

	get: function(){
		return this.selectedList.toJSON();
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = View;