var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	template: __inline("item.tmpl"),

	attributes: {
		class: "form-people-item"
	},

	initialize: function(option) {
		this.parentView = option.parentView;
		this.render();
		this.initEvent();
	},

	render: function() {
		var obj = this.model.toJSON(),
			id = this.parentView.list.modelId(obj);
		
		this.$el.attr("data-id", id);
		if ( obj.type === "group" ) {
			obj.text = "";
		} else if ( obj.name ){
			obj.text = "&lt" + obj.work_mail + "&gt";
		} else {
			obj.name = obj.work_mail;
			obj.text = "";
		}
		
		this.$el.html( this.template(obj) );
	},

	initEvent: function(){
		var that = this;
		this.$el.find(".JS-remove").on("click", function(){
			that.parentView.list.remove(that.model);
		});
	},

	destroy: function(){
		this.remove();
	}
});


module.exports = View;