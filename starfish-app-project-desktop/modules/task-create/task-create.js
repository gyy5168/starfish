var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js"),
	FormStatus = require("modules/task-form-modules/task-form-status/task-form-status.js"),
	FormTitle = require("modules/task-form-modules/task-form-title/task-form-title.js"),
	FormDescription = require("modules/task-form-modules/task-form-description/task-form-description.js"),
	FormAttachment = require("modules/task-form-modules/task-form-attachment/task-form-attachment.js"),
	FormCharge = require("modules/task-form-modules/task-form-charge/task-form-charge.js"),
	FormTime = require("modules/task-form-modules/task-form-time/task-form-time.js"),
	FormDate = require("modules/task-form-modules/task-form-date/task-form-date.js");

var View = Backbone.View.extend({

	tagName: "div",

	attributes: {
		"class": "task-create-view"
	},

	initialize: function() {
		global.modules.taskCreate = this;
		this.render();
		this.initEvent();

		// 默认自己为负责人
		this.modules.assignee.set(global.data.user.toJSON());
		
	},

	initEvent: function() {
		var that = this;

		this.$ok.on("click", function() {
			var data = that.get();
			if (that.verify(data)) {
				that.create(data);
			}
		});

		this.$cancel.on("click", function() {
			global.event.trigger("cancelTaskCreate");
		});

		this.$clear.on("click", function() {
			that.clear();
		});
	},

	render: function() {
		this.$el.html(__inline("task-create.html"));
		this.$form = this.$el.find(".JS-form");
		this.$cancel = this.$el.find(".JS-cancel");
		this.$ok = this.$el.find(".JS-ok");
		this.$clear = this.$el.find(".JS-clear");

		this.splitLine = '<div class="split-line"></div>';

		this.modules = {};
		this.modules.status = new FormStatus();
		this.modules.subject = new FormTitle();
		this.modules.content = new FormDescription();
		this.modules.attachments = new FormAttachment();
		this.modules.assignee = new FormCharge();
		this.modules.date_due = new FormDate();
		this.modules.expected_hours = new FormTime({
			label: "预计耗时"
		});
		this.modules.spent_hours = new FormTime({
			label: "实际耗时"
		});
		this.modules.spent_hours.$el.addClass("last-form");

		this.$form.append(this.modules.status.$el);
		this.$form.append(this.modules.subject.$el);
		this.$form.append(this.modules.content.$el);
		this.$form.append(this.splitLine);
		this.$form.append(this.modules.attachments.$el);
		this.$form.append(this.splitLine);
		this.$form.append(this.modules.assignee.$el);
		this.$form.append(this.modules.date_due.$el);
		this.$form.append(this.modules.expected_hours.$el);
		this.$form.append(this.modules.spent_hours.$el);
		this.$form.append(this.splitLine);

	},

	// 是否显示清除表单的入口
	isShowClear: function() {
		var data = this.get(),
			isshow = false;

		if (data.subject !== "") {
			isshow = true;
		} else if (this.modules.subject.getTags() > 0) {
			isshow = true;
		} else if (data.content !== "") {
			isshow = true;
		} else if (data.attachments.length > 0) {
			isshow = true;
		} else if (data.date_due) {
			isshow = true;
		} else if (data.expected_hours || data.spent_hours) {
			isshow = true;
		}

		return isshow;
	},

	clear: function() {
		$.each(this.modules, function(key, module) {
			module.clear();
		});

		this.modules.assignee.set(global.data.user.toJSON());
	},

	get: function() {
		var obj = {};

		$.each(this.modules, function(key, module) {
			obj[key] = module.get();
		});
		obj.status=undefined;
		obj.tags = this.modules.subject.getTags();
		return obj;
	},

	verify: function(data) {

		if (data.subject === "") {
			point.shortShow({
				text: "请填写任务标题"
			});
			return false;
		}

		if (!data.assignee) {
			point.shortShow({
				text: "请选择任务负责人"
			});
			return false;
		}

		if ( !this.modules.attachments.isSuccess() ) {
			point.shortShow({
				text: "附件未上传完毕"
			});
			return false;
		}
		return true;
	},

	create: function(data) {

		var that = this;

		if (this.creating) {
			return;
		}
		this.creating = true;

		this.$ok.addClass("loading");

		data.project_id = this.projectId;
		data.after_task = this.location || 0;

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks",
			type: "POST",
			data: JSON.stringify(data),
			success: function(response) {
				if (response.errcode === 0) {

					global.event.trigger("taskCreated", {
						data:response.data,
						after:that.location
					});
					that.clear();
				} else {
					point.shortShow({
						type:"error",
						text:global.tools.getErrmsg(response.errcode)
					});
				}

			},

			error: function() {
				point.shortShow({
					type:"error",
					text: "保存任务失败"
				});
			},

			complete: function() {
				that.creating = false;
				that.$ok.removeClass("loading");
			}
		});
	},

	setAssigneeData: function() {
		this.modules.assignee.setProjectId( this.projectModel.get("id"));
	},

	set: function(option) {
		this.location = option.location;
		if (this.projectModel !== option.projectModel) {
			this.projectModel = option.projectModel;
			this.projectId = this.projectModel.get("id");
			this.setAssigneeData();
		}

		this.modules.status.setStatusList(this.projectModel.toJSON().status);
		
		// 显示清空表单的按钮
		if ( this.isShowClear() ) {
			this.$clear.show();
		} else {
			this.$clear.hide();
		}
	},

	show: function(option) {
		if (this.showing) {
			return;
		}

		this.showing = true;
		this.$el.show();

		if (option) {
			this.set(option);
		}
	},

	hide: function() {
		if (this.showing) {
			this.showing = false;
			this.$el.hide();
		}
	},

	destroy: function() {
		$.each(this.modules, function(key, module) {
			module.destroy();
		});
		global.modules.taskCreate = null;
		this.remove();
	}
});


module.exports = View;