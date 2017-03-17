var $ = require("modules-common/zepto/zepto.js"),
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

		if ( !obj.name ) {
			obj.name = obj.work_mail;
		}
		
		this.$el.html( this.template(obj) );

		this.$el.attr("data-id", this.parentView.list.modelId(obj));
	},

	initEvent: function(){
		var that = this;
		this.$el.on("click", function(event){
			event.stopPropagation();
			that.parentView.showRemovePanel(that.model);
		});
	},

	destroy: function(){
		this.remove();
	}
});


module.exports = View;