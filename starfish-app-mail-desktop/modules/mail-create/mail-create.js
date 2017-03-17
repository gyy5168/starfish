var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js"),
	CreateForm = require("./create-form/create-form.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	date = require("modules-common/tools/date.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "mail-create"
	},

	initialize: function() {
		this.render();
		this.initEvent();

		global.modules.mailCreate = this;
	},

	render: function(){
		this.$el.html(__inline("mail-create.html"));

		this.$ok = this.$el.find(".JS-ok");
		this.$cancel = this.$el.find(".JS-cancel");

		this.createForm = new CreateForm();
		this.$el.find(".JS-bd").append(this.createForm.$el);
	},

	initEvent: function() {
		var that = this;

		this.$ok.on("click", function(){
			var data = that.createForm.get();
			
			if ( !that.verify( data ) ) {
				return;
			}

			// 判断附件模块是否有正在上传的文件
			var attachmentState = that.createForm.getAttachmentState();
			if ( attachmentState.progress + attachmentState.wait > 0 ) {
				point.shortShow({
					text: "附件正在上传"
				});
				return;
			}

			// 如果没有填写标题，默认赋值为“空标题”
			if ( data.subject === "") {
				data.subject = "空标题";
			}

			//添加新邮件的类型，1代表新建主题
			data.action_type = 1;

			that.send( data );
		});

		this.$cancel.on("click", function() {
			// 如果没有内容,隐藏创建面板，显示noSelect面板
			if (that.isEmpty()) {
				that.hide();
				that.clear();
				global.event.trigger("showNoSelect");
			} else {
				// 弹出确认框，提醒他们确认
				confirm.show({
					text: "放弃写邮件数据将丢失,确认继续？",
					callback: function() {
						that.hide();
						that.clear();
						global.event.trigger("showNoSelect");
					}
				});
			}
		});
	},

	// 发送邮件
	send: function(obj) {
		var that = this;

		if ( this.sending ) {
			return;
		}
		this.sending = true;

		point.show({
			text: "正在发送邮件",
			type: "loading"
		});

		$.ajax({
			type: "POST",
			url: global.baseUrl + "/orgs/" + global.data.org.get("id") + "/mail/mails",
			data: JSON.stringify(obj),
			contentType: "application/json",
			success: success,
			error: error,
			complete: complete
		});

		function success(data) {
			if (data.errcode === 0) {
				point.shortShow({
					text: "发送成功",
					type: "success"
				});

				global.event.trigger("mailSended", data.data);
				that.clear();
			} else {
				point.shortShow({
					text: global.tools.getErrmsg(data.errcode),
					type: "error"
				});
			}
		}

		function error() {
			point.shortShow({
				text: "发送失败，请稍后重试",
				type: "error"
			});
		}

		function complete(){
			that.sending = false;
		}
	},

	verify: function(data) {
		if (data.to.length === 0) {
			point.shortShow({
				text: "收件人不能为空"
			});
			return false;
		}
		return true;
	},

	isEmpty: function() {
		return this.createForm.isEmpty();
	},

	isShow: function(){
		return this.$el.css("display") !== "none";
	},

	// 清空表单
	clear: function() {
		this.createForm.clear();
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		this.createForm.destroy();
		this.createForm = null;
		this.remove();
		global.modules.mailCreate = null;
	}
});

module.exports = View;