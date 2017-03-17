var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	router = require("modules/routers/router.js");


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

	require("modules-common/init/init.js");
	global.baseUrl2 = "https://api.starfish.im/v2";
	global.data.downloadList = new Backbone.Collection();
	global.data.uploadList =  new Backbone.Collection();
	var SendPage = require("modules/send-page/send-page.js");
	new SendPage();

	Backbone.history.start();
});


