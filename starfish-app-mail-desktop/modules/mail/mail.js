var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	LeftPanel = require("./mail-left-panel/mail-left-panel.js"),
	rightPanel = require("./mail-right-panel/mail-right-panel.js");

var View = Backbone.View.extend({
	attributes: {
		"class": "mail"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.leftPanel = new LeftPanel();
		this.rightPanel = new rightPanel();

		this.$el.append(this.leftPanel.$el);
		this.$el.append(this.rightPanel.$el);

		$("#wraper").append(this.$el);
	},

	initEvent: function(){

	},

	destroy: function(){
		this.leftPanel && this.leftPanel.destroy();
		this.leftPanel = null;
		this.rightPanel && this.rightPanel.destroy();
		this.rightPanel = null;

		this.remove();
	}
});

module.exports = View;