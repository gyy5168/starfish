var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	TransferBtn = require("./transfer-btn/transfer-btn.js");
	
var View = Backbone.View.extend({
	tagName: "div",

	initialize: function() {
		var that = this;
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("toolbar.html"));
		var transferBtn = new TransferBtn();
		this.$el.append(transferBtn.$el);
	},

	initEvent: function() {
		var that = this;
		this.$el.on("click", ".JS-action", function(){
			var $this = $( this ),
				action = $this.data("action");
			global.event.trigger(action);
		});
	},

	attributes: {
		class: "toolbar"
	}
});


module.exports = View;