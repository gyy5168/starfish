var $ = require("modules-common/zepto/zepto.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js");

var View = Backbone.View.extend({

	attributes: {
		class: "form-subject form-group"
	},

	initialize: function(option) {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("form-subject.html"));
		this.$input = this.$el.find("input");
	},

	initEvent: function(){
		var that = this;
	},

	clear: function() {
		this.$input.val("");
	},

	get: function() {
		return this.$input.val();
	},

	set: function(value) {
		this.$input.val(value);
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}

	
});


module.exports = View;