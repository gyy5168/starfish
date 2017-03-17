var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({

	attributes: {
		class: "form-content form-group"
	},

	initialize: function() {
		this.render();
		this.$content = this.$el.find(".JS-content");
	},
	render: function() {
		this.$el.append(__inline("form-content.html"));
		return this.$el;
	},
	clear: function() {
		this.$content.html("");
	},

	get: function() {
		var value = this.$content.html();
		return value;
	},

	set: function(value) {
		this.$content.html(value);
	},

	destroy: function(){
		this.remove();
	}
	
});

module.exports = View;