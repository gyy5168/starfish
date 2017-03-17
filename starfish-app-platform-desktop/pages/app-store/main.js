var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js");



var init = require("modules-common/init/init.js");

init(function(){
	global.allApps = require("modules/data/data.js");

	// 全局添加tooltip
	require("modules-common/jquery-tooltipster/jquery.tooltipster.js");
	$(document).on("mouseenter", "[title]", function(){
		$( this ).tooltipster({
			contentAsHTML: true,
			trigger: 'hover'
		});
		$( this ).trigger("mouseenter");
	});
	var AppStore = require("modules/app-store/app-store.js");
	new AppStore();

	Backbone.history.start();

	module.exports = {};
});
