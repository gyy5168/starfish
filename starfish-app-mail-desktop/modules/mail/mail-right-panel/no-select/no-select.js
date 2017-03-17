var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "select-one"
	},

	initialize: function(option) {
		this.render();
		this.initEvent();
	},

	render: function(){
		this.$el.html(__inline("no-select.html"));
	},

	initEvent: function() {
		
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