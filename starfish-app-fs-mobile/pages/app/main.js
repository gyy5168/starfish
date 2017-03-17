var init = require("modules-common/init/init.js");

init(function(){
	var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules-common/router/router.js");

	// 由于历史原因，文件系统的相关的api， 需要使用此版本
	global.baseUrl2 = "https://api.starfish.im/v2";

	// 设置首页路由
	router.route("", function(){
		homeInit();
	});
	router.route("dir/:id", homeInit);

	var HomePage = require("modules/home/home.js");
	var homePage;
	function homeInit(id){
		id = id || 0;
		if ( !homePage ) {
			homePage = new HomePage();
		}
		homePage.show();
		homePage.set(id);
	}

	Backbone.history.start();
});


module.exports = {};