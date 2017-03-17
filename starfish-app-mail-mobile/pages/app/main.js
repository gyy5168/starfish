var init = require("modules-common/init/init.js");

init(function(){
	var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules-common/router/router.js"),
	SubjectList = require("modules/subject-list/subject-list.js"),
	MailList=require("modules/mail-list/mail-list.js");

	var subjectList,
		mailList;

	// 设置首页路由
	router.route("", function(){
		if ( !subjectList ) {
			subjectList = new SubjectList();
		}
		subjectList.show();
		mailList && mailList.hide();
	});

	router.route("mailList/:subjectId",function(subjectId){
		if ( !mailList ) {
			mailList = new MailList();
		}
		mailList.show();
		mailList.set({
			type:"subject",
			id:subjectId
		});
		subjectList && subjectList.hide();
	});

	Backbone.history.start();
});


module.exports = {};