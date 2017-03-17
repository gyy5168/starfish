var init = require("modules-common/init/init.js");

init(function(){
	
	var CreateForm = require("modules/create-form/create-form.js");

	var createForm = new CreateForm();

	createForm.back = function(){
		global.starfishBridge("finish");
	}

	createForm.destroy = function(){
		global.starfishBridge("finish");
	}

	createForm.set("new");
});

module.exports = {};