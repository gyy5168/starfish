var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	TaskList = require("modules/task-main/task-main.js"),
	TaskCreate = require("modules/task-create/task-create.js"),
	TaskDetail = require("modules/task-detail/task-detail.js"),
	Statistics = require("./statistics/statistics.js"),
	urlTool = require("modules-common/tools/url.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	tagName: "div",

	attributes: {
		"class": "task-view"
	},

	initialize: function() {
		this.render();
		this.initEvent();

		this.taskListView = new TaskList();
		this.$taskList.append(this.taskListView.$el);

		// 默认右边显示统计模块
		this.showStatistics();

		global.modules.task = this;
	},

	render: function() {
		this.$el.html(__inline("task.html"));

		this.$content = this.$el.find(".JS-task-content");
		this.$taskList = this.$el.find(".JS-task-list");
		this.$taskCreate = this.$el.find(".JS-task-create");
		this.$taskDetail = this.$el.find(".JS-task-detail");
		this.$statistics = this.$el.find(".JS-statistics");

		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$errorBtn = this.$error.find(".JS-btn");

		$("#wraper").append(this.$el);
	},

	initEvent: function() {
		var that = this;

		// 加载失败，点击重新加载
		this.$errorBtn.on("click", function() {
			that.set(that.param);
		});

		this.listenTo(global.event, "showTaskCreate", function(){
			that.showTaskCreate();
		});

		this.listenTo(global.event, "showStatistics", function(){
			that.showStatistics();
		});

		this.listenTo(global.event, "showTaskDetail", function(option){
			that.showTaskDetail(option);
		});

		this.listenTo(global.event, "cancelTaskCreate", function(){
			that.showStatistics();
		});

		this.listenTo(global.event, "taskRemoved", function(){
			that.showStatistics();
		});

	},

	showTaskCreate: function(option){

		if (!this.taskCreateView) {
			this.taskCreateView = new TaskCreate();
			this.$taskCreate.append(this.taskCreateView.$el);
		}

		var result = this.showRightPanel(this.$taskCreate);
		if ( result === "exist" ) {
			point.shortShow({
				text:"任务创建已在右边"
			});
		}

		this.taskCreateView.set({
			projectModel: this.projectModel,
			location: this.taskListView.getSelected()
		});
	},

	showTaskDetail: function(option){
		if (!this.taskDetailView) {
			this.taskDetailView = new TaskDetail();
			this.$taskDetail.append(this.taskDetailView.$el);
		}

		this.showRightPanel(this.$taskDetail);

		this.taskDetailView.set({
			taskModel: option.taskModel,
			projectModel: this.projectModel
		});
	},

	showStatistics: function(flag){
		if ( !this.statisticsView ) {
			this.statisticsView = new Statistics();
			this.$statistics.append(this.statisticsView.$el);
		}
		var result = this.showRightPanel(this.$statistics);
		if ( result === "exist" && !flag) {
			point.shortShow({
				text:"任务统计已在右边"
			});
		}
	},

	showRightPanel: function($node) {
		if (this.$rightPanel === $node) {
			return "exist";
		}

		this.$rightPanel && this.$rightPanel.hide();
		this.$rightPanel = $node;
		$node.show();

		this.$taskList.addClass("narrow");
		this.taskListView.setWidth("narrow");
	},

	hideRightPanel: function() {
		this.$rightPanel && this.$rightPanel.hide();
		this.$rightPanel = null;
		this.$taskList.removeClass("narrow");
		this.taskListView.setWidth("normal");
	},

	set: function(param) {
		this.projectId = urlTool.getParam(param, "id")[0];
		this.param = param;

		if (this.projectModel && this.projectModel.get("id") == this.projectId) {
			this.setSubView();
		} else {
			this.fetchProject();
		}
	},

	setSubView: function() {
		this.taskListView.set({
			projectModel: this.projectModel,
			param: this.param
		});

		this.statisticsView.set({
			projectModel: this.projectModel
		});
	},

	fetchProject: function(id) {
		var that = this;
		this.clear();
		this.$loading.show();

		$.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/projects/" + this.projectId,
			type: "GET",
			success: function(response) {
				if (response.errcode === 0) {
					that.projectModel = new Backbone.Model(response.data);
					that.$loading.hide();
					that.$content.show();
					that.setSubView();
				} else {
					that.projectId = null;
					that.projectModel = null;
					that.$loading.hide();
					that.$error.show();
					point.shortShow({
						type:"error",
						text:global.tools.getErrmsg(response.errcode)
					});
				}
			},

			error: function() {
				that.$loading.hide();
				that.$error.show();
				that.projectId = null;
				that.projectModel = null;
				point.shortShow({
					type:"error",
					text:"网络异常，请检查您的网络设置"
				});
			}
		});
	},

	show: function(param) {
		if (this.showing) {
			return;
		}
		this.showing = true;
		this.$el.show();

		if (param) {
			this.set(param);
		}
	},

	hide: function() {
		if (this.showing) {
			this.showing = false;
			this.$el.hide();
		}
	},

	clear: function() {
		this.$loading.hide();
		this.$error.hide();
		this.$content.hide();
	},

	destroy: function() {
		if( this.taskListView ) {
			this.taskListView.destroy();
			this.taskListView = null;
		}

		if( this.statisticsView ) {
			this.statisticsView.destroy();
			this.statisticsView = null;
		}

		if( this.taskDetailView ) {
			this.taskDetailView.destroy();
			this.taskDetailView = null;
		}

		if( this.taskCreateView ) {
			this.taskCreateView.destroy();
			this.taskCreateView = null;
		}

		this.remove();
		global.modules.task = null;
	}
});

module.exports = View;