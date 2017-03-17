var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	attributes: {
		class: "form-subject form-group"
	},

	initialize: function() {
		this.render();
		this.$input = this.$el.find("input");
	},

	render: function() {
		this.$el.append(__inline("form-subject.html"));
		return this.$el;
	},

	clear: function() {
		this.$input.val("");
	},

	verify: function() {
		if (this.get() === "") {
			point.shortShow({
				text: "主题不能为空"
			});
			return false;
		}
		return true;
	},

	get: function() {
		return this.$input.val();
	},

	set: function(value) {
		this.$input.val(value);
	},

	destroy: function(){
		this.remove();
	}
	
});


module.exports = View;