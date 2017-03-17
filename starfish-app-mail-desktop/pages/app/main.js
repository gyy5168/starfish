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

	var Mail = require("modules/mail/mail.js"),
		Set = require("modules/set/set.js");

	// 当前页面
	var currentView = {};

	router.route("", "mail", function() {
		if ( currentView.name === "mail" ) {
			return;
		}

		// 销毁当前页面
		currentView.obj && currentView.obj.destroy();
		// 创建项目页面
		currentView.obj = new Mail();
		currentView.name = "mail";
	});

	router.route("set", "set", function() {

		if ( currentView.name === "set" ) {
			return;
		}

		// 销毁当前页面
		currentView.obj && currentView.obj.destroy();
		// 创建任务页面
		currentView.obj = new Set();
		currentView.name = "set";
	});


	Backbone.history.start();

});



