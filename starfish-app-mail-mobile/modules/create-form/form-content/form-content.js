var $ = require("modules-common/zepto/zepto.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	AutoSize = require("modules-common/autosize/autosize.js");

var View = Backbone.View.extend({

	attributes: {
		class: "form-content form-group",
		placeholder:"添加正文..."
	},

	tagName: "textarea",

	initialize: function(option) {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$input = this.$el;	
	},

	initEvent: function(){
		var that = this;
		this.$input.one("focus", function() {
			AutoSize( that.$input );
		});
	},

	clear: function() {
		this.$input.val("");
	},

	get: function() {
		var value = this.$input.val();
		value = value.replace(/\n/g, "<br>");
		return value;
	},

	set: function(value) {
		this.$input.val(value);
	},

	destroy: function(){
		this.remove();
	}
	
});


module.exports = View;