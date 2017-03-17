var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js");

var init = require("modules-common/init/init.js");

init(function(){
	// 全局添加tooltip
	require("modules-common/jquery-tooltipster/jquery.tooltipster.js");
	$(document).on("mouseenter", "[title]", function(){
		$( this ).tooltipster({
			contentAsHTML: true,
			trigger: 'hover'
		});
		$( this ).trigger("mouseenter");
	});
	global.allApps = require("modules/data/data.js");

	var App = require("modules/app/app.js");
	new App();

	Backbone.history.start();

	module.exports = {};
});

