var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js");

// 初始化
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

	var ProjectList = require("modules/project-list/project-list.js"),
		ProjectCreate = require("modules/project-create/project-create.js"),
		ProjectDetail = require("modules/project-detail/project-detail.js"),
		TaskView = require("modules/task/task.js");

	// 当前页面
	var currentView = {};

	global.modules.router = new Backbone.Router();
	var router = global.modules.router;

	router.route("", "project", function() {
		if ( currentView.name === "project" ) {
			return;
		}

		// 销毁当前页面
		currentView.obj && currentView.obj.destroy();
		// 创建项目页面
		currentView.obj = new ProjectList();
		currentView.obj.show();
		currentView.name = "project";
	});

	router.route("projectCreate", "projectCreate", function(){
		if ( currentView.name === "projectCreate" ) {
			return;
		}

		// 销毁当前页面
		currentView.obj && currentView.obj.destroy();
		// 创建项目页面
		currentView.obj = new ProjectCreate();
		currentView.obj.show();
		currentView.name = "projectCreate";
	});

	router.route("projectDetail/:id", "projectDetail", function(id){

		if ( currentView.name === "projectDetail" ) {
			currentView.obj.set(id);
			return;
		}

		// 销毁当前页面
		currentView.obj && currentView.obj.destroy();
		// 创建项目页面
		currentView.obj = new ProjectDetail();
		currentView.obj.show();
		currentView.obj.set(id);
		currentView.name = "projectDetail";
	});

	router.route("task?*param", "task", function(param) {

		if ( currentView.name === "task" ) {
			currentView.obj.set(param);
			return;
		}
		// 销毁当前页面
		currentView.obj && currentView.obj.destroy();
		// 创建任务页面
		currentView.obj = new TaskView();
		// 设置任务参数
		currentView.obj.show(param);
		currentView.name = "task";
	});

	Backbone.history.start();
});



