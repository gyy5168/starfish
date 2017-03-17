var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	dateTool = require("modules-common/tools/date.js");

var TASK_TYPE = {
	CREATE_TASK:100,
	UPDATE_TASK_ATTRIBUTE:200,
	ADD_ATTACHMENT:300,
	DEL_ATTACHMENT:301,
	ADD_TAG:400,
	DEL_TAG:401
};

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "task-form-operates"
	},

	template: __inline("task-form-operate.tmpl"),

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.append(__inline("task-form-operate.html"));
		this.$list = this.$el.find(".JS-list");
		this.$more = this.$el.find(".JS-more");
		this.$loading = this.$el.find(".JS-loading");
		this.$loadError = this.$el.find(".JS-error");
	},

	initEvent: function() {
		var that = this;

		// 点击失败页面重新加载
		this.$loadError.on("click", function() {
			that.load();
		});

		this.$more.on("click", function() {
			if ( that.$el.hasClass("more")) {
				that.$list.scrollTop(0);
			}
			that.$el.toggleClass("more");
			that.load();
		});
	},

	load: function() {
		var that = this;
		if (this.loaded || this.loading) {
			return;
		}

		this.loading = true;

		this.$loading.show();
		this.$list.hide();
		this.$loadError.hide();

		this.ajax = $.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + this.model.get("id") + "/operations",
			type: "GET",
			success: function(response) {
				if (response.errcode === 0) {
					that.loaded = true;
					// 删掉第一条记录，该记录为创建记录，已存在
					// response.data.shift();
					that.$list.html("");
					$.each(response.data, function(i, option) {
						that.add(option);
					});
					that.$list.show();
				} else {
					that.$loadError.show();
					point.shortShow({
						type:"error",
						text:global.tools.getErrmsg(response.errcode)
					});
				}
			},
			error: function(jqXHR, status) {
				if (status === "abort") {
					return;
				}
				that.$loadError.show();
				point.shortShow({
					type:"error",
					text:"网络异常，请检查您的网络设置"
				});
			},
			complete: function() {
				that.loading = false;
				that.$loading.hide();
			}
		});
	},

	convertDate: function(timestamp){
		var todayStamp = dateTool.getTodayStamp(),
			mid = timestamp - todayStamp;

		return dateTool.formatDate(new Date(timestamp * 1000), "yyyy-M-d HH:mm");

		// if (mid < -7 * 86400) {
		// 	return dateTool.formatDate(new Date(timestamp * 1000), "yyyy-M-d HH:mm");
		// } else if (mid < -86400) {
		// 	return dateTool.formatDate(new Date(timestamp * 1000), "星期E HH:mm");

		// } else if (mid < 0) {
		// 	return "昨天";
		// } else if (mid < 86400) {
		// 	return dateTool.formatDate(new Date(timestamp * 1000), "今天 HH:mm");
		// } else if (mid < 2 * 86400) {
		// 	return "明天";
		// } else if (mid < 7 * 86400) {
		// 	return dateTool.formatDate(new Date(timestamp * 1000), "星期E HH:mm");
		// } else {
		// 	return dateTool.formatDate(new Date(timestamp * 1000), "yyyy-M-d HH:mm" );
		// }
	},

	set: function(taskModel) {
		this.clear();
		this.model = taskModel;
		this.setCreator();
	},

	// 显示创建任务的记录， 该记录可以从任务的model获取数据
	setCreator: function(){
		var templateData = {};

		templateData.name = this.model.get("creator_info").name;
		templateData.content = "创建任务";
		templateData.time = this.convertDate( this.model.get("date_added") );
		this.$list.html(this.template(templateData));
	},

	add: function(data) {
		var templateData = {};

		switch(data.operation_code){
			case TASK_TYPE.CREATE_TASK:
			  templateData.content = "创建任务";
			  break;
			case TASK_TYPE.ADD_ATTACHMENT:
			  templateData.content = "添加了附件" + data.content.filename;
			  break;
			case TASK_TYPE.DEL_ATTACHMENT:
			  templateData.content = "删除了附件" + data.content.filename;
			  break;
			case TASK_TYPE.ADD_TAG:
			  templateData.content = "添加了标签" + data.content.name;
			  break;
			case TASK_TYPE.DEL_TAG:
			  templateData.content = "删除了标签" + data.content.name;
			  break;
			case TASK_TYPE.UPDATE_TASK_ATTRIBUTE:
			  templateData.content = this.getAttrDescription(data);
			  break;
			case TASK_TYPE.ADD_ATTACHMENT:
			  templateData.content = "添加了附件" + data.content.filename;
			  break;
			default:
			  templateData.content = "无";
		}

		templateData.time = this.convertDate(data.create_time);
		templateData.name = data.operator.name;


		this.$list.append(this.template(templateData));
	},

	getAttrDescription: function(data){

		switch(data.content.field){
			case "subject":
				return "修改了标题" + data.content.after;
				break;
			case "content":
				return "修改了描述" + data.content.after;
				break;
			case "spent_hours":
				return "修改了实际耗时" + data.content.after + "小时";
				break;
			case "date_due":
			  	if ( data.content.after ) {
					return "修改了预计完成时间" + this.convertDate(data.content.after);
				} else {
					return "清除预计完成时间";
				}
				break;
			case "expected_hours":
				return "修改了预计耗时" + data.content.after + "小时";
				break;
			case "assignee":
				return "修改了负责人为" + data.content.after_info.name;
				break;
			case "is_completed":
				if ( data.content.after === 1 ) {
					return "标记任务完成";
				} else {
					return "标记任务未完成";
				}
				break;
			default:
			  return "无";
		}
		
	},

	clear:function(){
		if ( this.loading ) {
			this.ajax.abort();
		}
		this.loaded = false;

		this.$loading.hide();
		this.$loadError.hide();
		this.$list.html("");
		this.$el.removeClass("more");
	},

	destroy: function() {
		this.remove();
	}
});

module.exports = View;