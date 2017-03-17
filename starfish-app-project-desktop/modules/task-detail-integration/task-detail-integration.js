var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	urlTool = require("modules-common/tools/url.js"),
	point = require("modules-common/point/point.js"),
	TaskDetailView = require("modules/task-detail/task-detail.js");

var View = Backbone.View.extend({

	tagName: "div",

	attributes: {
		"class": "task-detail-integration"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("task-detail-integration.html"));
		this.$loading = this.$el.find(".JS-loading");
		this.$loaderror = this.$el.find(".JS-error");
		this.$errorBtn = this.$loaderror.find(".JS-btn");
		this.$removed = this.$el.find(".JS-removed");
		$("#wraper").append(this.$el);

		this.detailView = new TaskDetailView();

		this.$el.append(this.detailView.$el);

		var href = window.location.href;
		href = href.substr( href.indexOf("?") );
		this.set(href);
	},


	initEvent: function() {
		var that = this;

		this.$errorBtn.on("click", function() {
			that.load();
		});
	},

	clear: function(){
		this.$loading.hide();
		this.$loaderror.hide();
		this.$removed.hide();
		this.detailView.hide();
	},

	set: function(param) {
		this.param = param;
		this.projectId = urlTool.getParam(param, "project_id")[0];
		this.taskId = urlTool.getParam(param, "task_id")[0];

		this.load();
	},

	load: function() {
		if (this.loading) {
			return;
		}
		this.loading = true;
		
		this.clear();
		this.$loading.show();

		var that = this;
		

		function error(errcode) {

            if ( errcode === 14 ) {
                that.$loading.hide();
                that.$removed.show();
                return;
            }
			point.shortShow({
				type:"error",
				text:global.tools.getErrmsg(errcode)
			});
			that.$loading.hide();
			that.$loaderror.show();
		}

		$.when($.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/projects/" + this.projectId,
			type: "GET"
		}), $.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + this.taskId,
			type: "GET"
		})).done(function(s1, s2) {
			that.loading = false;
			that.$loading.hide();
			if ( s1[0].errcode === 0 ) {
				if ( s2[0].errcode === 0 ) {
					var projectModel = new Backbone.Model(s1[0].data);
					var taskModel = new Backbone.Model(s2[0].data);

					that.detailView.show({
						projectModel: projectModel,
						taskModel: taskModel
					});
				} else {
					error(s2[0].errcode);
				}
			} else {
				error(s1[0].errcode);
			}
			// if (s1[0].errcode === 0 && s2[0].errcode === 0) {
			// 	var projectModel = new Backbone.Model(s1[0].data);
			// 	var taskModel = new Backbone.Model(s2[0].data);

			// 	that.detailView.show({
			// 		projectModel: projectModel,
			// 		taskModel: taskModel
			// 	});
			// } else {

			// 	error();
			// }
		}).fail(function() {
			that.loading = false;
			error();
		});
	},

	show: function(option) {
		if (this.showing) {
			return;
		}
		if (option) {
			this.set(option);
		}
		this.showing = true;
		this.$el.show();
	},

	hide: function() {
		if (this.showing) {
			this.showing = false;
			this.$el.hide();
		}
	},

	destory: function() {
		this.detailView && this.detailView.destory();
		this.remove();
	}
});


module.exports = View;