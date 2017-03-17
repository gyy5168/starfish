var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	FormPeople = require("modules/form-modules/form-people/form-people.js"),
	point = require("modules-common/point/point.js"),
	mailList = require("modules/collections/mail-list.js"),
	tools = require("modules/tools/tools.js"),
	FormAttachment = require("modules/form-modules/form-attachment/form-attachment.js");

var View = Backbone.View.extend({
	tagName: "form",

	uuid: 1,

	attributes: {
		class: "detail-form"
	},

	template:__inline("detail-form.tmpl"),

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("detail-form.html"));
		this.$content = this.$el.find(".JS-content");
		this.$origin = this.$el.find(".JS-origin-content");
		this.$action = this.$el.find(".JS-action");
		this.$actionPanel = this.$el.find(".JS-action-panel");
		this.$form = this.$el.find(".JS-form");
		this.$send = this.$el.find(".JS-send");
		this.$replyAll = this.$el.find(".JS-reply-all");
		this.$peopleInfo = this.$el.find(".JS-people-info");
		this.$bd = this.$el.find(".JS-bd");

		this.modules = {
			to: new FormPeople({
				label: "收件人:",
				class: "form-to"
			}),
			cc: new FormPeople({
				label: "抄　送:",
				class: "form-cc"
			}),
			bcc: new FormPeople({
				label: "密　送:",
				class: "form-bcc"
			}),
			attachments: new FormAttachment({})
		};

		this.$form.append(this.modules.to.$el);
		this.$form.append(this.modules.cc.$el);
		this.$form.append(this.modules.bcc.$el);
		this.$bd.after( this.modules.attachments.$el);

		this.$origin.hide();
	},

	initEvent: function() {
		var that = this;

		// 切换操作菜单
		this.$el.find(".JS-action").on("click", function(event) {
			that.$actionPanel.toggle();
			event.stopPropagation();
		});

		// 删除
		this.$el.find(".JS-remove").on("click", function() {
			that.destroy();
		});

		// 点击操作菜单
		this.$el.find(".JS-action-panel").on("click", "li", function() {
			var action = $(this).data("action");
			that.setType(action);
		});

		// 显示收件人表单，隐藏人员信息
		this.$peopleInfo.on("click", function() {
			that.hidePeopleInfo();
		});

		// 显示人员信息，隐藏收件人表单
		this.$bd.on("click", function(){
			that.showPeopleInfo();
		});

		// 点击发送按钮
		this.$send.on("click", function() {
			var data = that.get();
			if ( that.verify(data) ){
				that.send(data);
			}
		});

		// 切换显示原始邮件
		this.$el.find(".JS-origin-switch").on("click", function(){
			that.$origin.toggle();
		});

		// 点击空白处，隐藏操作菜单
		this.docHandle = function() {
			that.hideAction();
		};
		$(document).on("click.detail-email", this.docHandle);
	},

	// 验证
	verify: function(data) {
	
		if (data.to.length === 0) {
			point.shortShow({
				text: "收件人不能为空"
			});
			return false;
		}

		var attachmentState = this.modules.attachments.getState();

		if (attachmentState.wait + attachmentState.progress > 0 ) {
			point.shortShow({
				text: "附件正在上传"
			});
			return false;
		}
		return true;
	},

	// 发送邮件
	send: function(data) {
		var that = this;

		if ( this.sending ) {
			return;
		}
		this.sending = true;
		
		this.$send.addClass("loading");

		$.ajax({
			url: global.baseUrl + "/orgs/" + global.data.org.get("id") + "/mail/mails",
			type: "POST",
			data: JSON.stringify(data),
			success: success,
			error: error
		});

		function success(data) {
			if (data.errcode === 0) {
				point.shortShow({
					type: "success",
					text: "发送成功"
				});

				that.destroy();
				// if ( that.type === "forward" ){
				// 	return;
				// }
				mailList.add(data.data);

				global.event.trigger("mailSended", data.data );

			} else {
				point.shortShow({
					type: "error",
					text: global.tools.getErrmsg(data.errcode)
				});
			}
		}

		function error(data) {
			point.shortShow({
				type: "error",
				text: "发送失败, 请检查网络"
			});
		}

		function complete(){
			that.sending = false;
			that.$send.removeClass("loading");
		}
	},

	// 设置表单
	set: function(type, model) {
		this.model = model;
		this.setType(type);
		this.$content.focus();
	},

	// 设置类型
	setType: function(type) {
		var obj = this.model.toJSON();

		// 如果收件人、抄送人大于1，则操作菜单中显示“回复所有人”
		if (obj.meta.to.length + obj.meta.cc.length > 1) {
			this.$replyAll.show();
		} else {
			// 如果收件人是人（不是组），隐藏操作菜单中的“回复所有人”，否则显示
			if ( obj.meta.to_info[0].owner_type === 0 ) {
				this.$replyAll.hide();

				// 如果没有replay-all, 则转换成reply
				if ( type === "reply-all" ) {
					type = "reply";
				}
			} else {
				this.$replyAll.show();
			}
		}

		// 清空内容
		this.clear();
		// 显示对应的操作图标
		this.$action.addClass(type);
		this.type = type;

		var peopleObj = this.analyzePeople(obj.meta);

		if (type === "reply") {
			this.modules.to.set([peopleObj.from]);
			this.subject = "reply: " + obj.meta.subject;
			this.$origin.html( this.getContent(obj, type) );
		} else if (type === "reply-all") {
			var to = peopleObj.to.slice();
			to.push(peopleObj.from);
			this.modules.to.set(to);
			this.modules.cc.set(peopleObj.cc);
			this.subject = "reply: " + obj.meta.subject;
			this.$origin.html( this.getContent(obj, type) );
		} else if (type === "forward") {
			this.hidePeopleInfo();
			this.subject = "forward: " + obj.meta.subject;
			this.$origin.html( this.getContent(obj, type) );
		}
		this.setPeopleInfo();
	},

	analyzePeople: function(option){
		var that = this,
			obj = {};
		if ( option.from_detail.type ) {
			obj.from = option.from_detail.value;
			obj.from.work_mail = option.from;
			obj.from.type = "member";
		} else {
			obj.from = {};
			obj.from.work_mail = option.from;
			obj.from.type = "external";
			obj.from.id = this.uuid++;
		}

		obj.to = [];
		_.each(option.to_info, function(data, i){
			if ( data.owner_type ) {
				data.work_mail = option.cc[i];
				data.type = getType(data.owner_type);
			} else {
				data.work_mail = option.to[i];
				data.type = "external";
				data.id = that.uuid++;
			}
			obj.to.push( data );
		});

		obj.cc = [];
		_.each(option.cc_info, function(data, i){
			if ( data.owner_type ) {
				data.work_mail = option.cc[i];
				data.type = getType(data.owner_type);
			} else {
				data.work_mail = option.cc[i];
				data.type = "external";
				data.id = that.uuid++;
			}
			obj.cc.push( data );
		});

		function getType(num){
			switch (num) {
				case 0:
					return "member";
				case 1:
					return "department";
				case 2:
					return "group";
				default:
					return "external"
			}
		}

		return obj;


	},

	//根据原始邮件生成引用内容
	getContent: function(obj, type){
		var option = {},
			people;

		if ( obj.meta.from_detail.value ) {
			option.from = obj.meta.from_detail.value.name + "&lt;" + obj.meta.from + "&gt;";
		} else {
			option.from = obj.meta.from;
		}


		option.date = tools.convertDate(obj.date);

		option.to = "";
		_.each( obj.meta.to_info, function( data, index) {
		
			if ( index !== 0 ) {
				option.to += " , ";
			}
			if ( data.name ){
				option.to += data.name + "&lt;" + obj.meta.to[index] + "&gt;";
			} else {
				option.to += obj.meta.to[index] ;
			}
		});

		if ( obj.meta.cc.length > 0 ) {
			option.cc = "";
			_.each( obj.meta.cc_info, function(data, index) {
				if ( index !== 0 ) {
					option.cc += " , ";
				}
				if ( data.name ){
					option.cc += data.name + "&lt;" + obj.meta.cc[index] + "&gt;";
				} else {
					option.cc += obj.meta.cc[index] ;
				}
			});
		} else {
			option.cc = false;
		}

		if (type === "reply") {
			option.title = "原始邮件";
			option.subject = "reply: " + obj.meta.subject;
		} else if (type === "reply-all") {
			option.title = "原始邮件";
			option.subject = "reply: " + obj.meta.subject;
		} else if (type === "forward") {
			option.title = "转发邮件";
			option.subject = "forward: " + obj.meta.subject;
		}

		option.content = obj.content;

		return this.template(option);
	},

	// 显示人员信息，隐藏人员表单
	showPeopleInfo: function() {
		this.$peopleInfo.show();
		this.setPeopleInfo();
		this.$form.hide();
	},

	// 隐藏人员信息，显示人员表单
	hidePeopleInfo: function() {
		this.$peopleInfo.hide();
		this.$form.show();
	},

	//将表单中的收件人显示到表单信息头上面
	setPeopleInfo: function() {
		var info = "",
			peoples = [];
		peoples = this.modules.to.get();
		// TODO

		this.$peopleInfo.html(peoples.join(","));
	},

	//判断表单是否为空
	isEmpty: function(){
		var data = this.get(),
			flag = true;
		$.each( data, function( key, value ) {
			//reply_to和action_type是填充的数据，不算表单的内容
			if ( key === "reply_to" || key === "action_type" ) {
				return;
			}
			if ( value === "" || value.length === 0 ) {
				return;
			}
			flag = false;
			
			return false;
		});

		return flag;
	},

	//获取表单的数据
	get: function() {
		var data = {};
		$.each(this.modules, function(key, module) {
			data[key] = module.get();
		});

		data.subject = this.subject;
		data.content = this.$content.html() + this.$origin.html();

		//填充reply_to 和 action_type， 分别是回复的邮件id和邮件的类型，用于后台生成推送消息
		if (this.type === "reply" || this.type === "reply-all") {
			data.reply_to = this.model.get("id");
			data.action_type = 2;
		} else if (this.type === "forward") {
			data.action_type = 4;
			var attachments = this.model.get("attachments");
			// 如果是转发， 带上附件
			$.each( attachments, function( index , option) {
				data.attachments.push({
					id:option.id,
					name:option.filename
				});
			});
		}

		return data;
	},

	// 显示回复、转发等的操作下拉列表
	showAction: function() {
		this.$actionPanel.show();
	},

	// 隐藏回复、转发等的操作下拉列表
	hideAction: function() {
		this.$actionPanel.hide();
	},

	//清除表单的内容和样式
	clear: function() {
		this.$action.removeClass("reply forward reply-all");
		$.each(this.modules, function(key, module) {
			module.clear();
		});
		this.$content.html("");
	},

	//销毁表单、清除表单的全局事件，附件模块需要单独调用destroy，以便让附件模块清除自己全局上传回调函数
	destroy: function() {
		this.trigger("destroy");
		this.modules.attachments.destroy();
		this.remove();
		$(document).off("click.detail-email", this.docHandle);
	}

});

module.exports = View;