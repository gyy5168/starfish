var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	tagName:"li",

	template: __inline("people-item.tmpl"),

	initialize: function(data) {
		this.render();
		this.initEvent();
		this.model.view = this;
		// this.changeSelect();
	},

	render: function() {
		var obj = this.model.toJSON();
		obj.disabled = obj.disabled || false;
		obj.avatar = obj.avatar || false;
		this.$el.append( this.template(obj) );
		this.$el.data("view", this);
	},

	initEvent: function() {
		var that = this;

		this.$el.on("click", function(){
			var value = that.model.get("selected");
			if ( value ) {
				that.model.set("selected", false);
			} else {
				that.model.set("selected", true);
			}
		});

		this.listenTo(this.model, "change:selected", function(model, value ){
			that.changeSelect();
		});
	},

	changeSelect: function(){
		var value = this.model.get("selected");
		if ( value ) {
			this.$el.addClass("selected");
		} else {
			this.$el.removeClass("selected");
		}
	},

	clear: function(){
		var selected = this.model.get("selected");

		if ( selected ) {
			this.model.set("selected", false);
		}
		
	},

	destroy: function(){
		this.model.view = null;
		this.$el.removeData();
		this.remove();
	},

	attributes: {
		class: "people-item"
	}
});

module.exports = View;