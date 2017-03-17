var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	confirm = require("modules-common/confirm/confirm.js"),
    point = require("modules-common/point/point.js"),
    tools = require("modules/tools/tools.js"),
	topBar = require("modules-common/top-bar/top-bar.js"),
	FormPeople = require("./form-people/form-people.js"),
	FormSubject = require("./form-subject/form-subject.js"),
	FormAttachment = require("./form-attachment/form-attachment.js"),
	FormContent = require("./form-content/form-content.js");

var View = Backbone.View.extend({

	uuid: 1,

	template:__inline("create-form.tmpl"),

	attributes: {
		"class":"create-form"
	},

	back: function(){
		var that = this;
		if ( this.hasData() ) {
			confirm.show({
				text:"离开该页面， 内容会丢失，确定离开？",
				callback: function(){
					that.destroy();
				}
			});
		} else {
			this.destroy();
		}
	},

	initialize: function(){
		this.render();
		this.initEvent();

		this.prevTitle = topBar.getTitle();
		topBar.setTitle( "新邮件" );

		this.prevBack = topBar.getBack();
		topBar.setBack(_.bind(this.back, this));
		
		this.prevMenu = topBar.getMenu();
		topBar.setMenu([{
			name:"发送",
			callback: _.bind( this.send, this )
		}]);
	},

	render: function(){
		this.modules = {};
		this.modules.to = new FormPeople({
			label:"收件人:"
		});
		this.modules.cc = new FormPeople({
			label:"抄送:"
		});
		this.modules.bcc = new FormPeople({
			label:"密送:"
		});

		this.modules.subject = new FormSubject();
		this.modules.attachments = new FormAttachment();
		this.modules.content = new FormContent();

		this.$el.append(this.modules.to.$el);
		this.$el.append(this.modules.cc.$el);
		this.$el.append(this.modules.bcc.$el);
		this.$el.append(this.modules.subject.$el);
		this.$el.append(this.modules.attachments.$el);
		this.$el.append(this.modules.content.$el);
		
		global.$doc.append( this.$el );
	},

	initEvent: function(){
		var that = this;
	},

	verify: function(){
		if ( !this.modules.attachments.hasAllUpload() ) {
			point.shortShow({
				type:"error",
				text:"附件还没有上传完毕"
			});
			return false;
		}
		
		var to = this.modules.to.get();
		if ( to.length === 0 ) {
			point.shortShow({
				type:"error",
				text:"至少需要一个收件人"
			});
			return false;
		}
		return true;
	},

	hasData: function(){
		var data = this.get();

		if ( data.subject !== "" || data.content !== ""
			|| data.attachments.length !== 0 ) {
			return true;
		}
		return false;
	},

	analyzePeople: function(option){
		var that = this,
			obj = {};
		if ( option.from_detail.type !== undefined) {
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
			if ( data.owner_type !== undefined ) {
				data.work_mail = option.to[i];
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
			if ( data.owner_type !== undefined ) {
				data.work_mail = option.cc[i];
				data.type = getType(data.owner_type);
			} else {
				data.work_mail = option.cc[i];
				data.type = "external";
				data.id = that.uuid++;
			}
			obj.cc.push( data );
		});

		console.log(obj)

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

	//获取表单的数据
	get: function() {
		var data = {};
		$.each(this.modules, function(key, module) {
			data[key] = module.get();
		});

		if ( this.type === "new" ) {
			return data;
		}

		data.content = data.content + this.getOriginContent( this.model.toJSON(), this.type );

		//填充reply_to 和 action_type， 分别是回复的邮件id和邮件的类型，用于后台生成推送消息
		if (this.type === "reply" || this.type === "replyAll") {
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

	// get: function(){
	// 	var data = {};

	// 	_.each(this.modules, function(module, key){
	// 		data[key] = module.get();
	// 	});

	// 	return data;
	// },

	set: function(type, model){
		this.model = model;
		this.type = type || "new";

		if ( this.type === "new" ) {
			return;
		}

		var obj = model.toJSON();
		var peopleObj = this.analyzePeople(obj.meta);

		if (type === "reply") {
			this.modules.to.set([peopleObj.from]);
            if ( obj.meta.subject.indexOf("reply") < 0 ) {
                this.modules.subject.set("reply: " + obj.meta.subject);
            } else {
                this.modules.subject.set(obj.meta.subject);
            }
			// this.$origin.html( this.getContent(obj, type) );
		} else if (type === "replyAll") {
			var to = peopleObj.to.slice();
			to.push(peopleObj.from);
			this.modules.to.set(to);
			this.modules.cc.set(peopleObj.cc);
            if ( obj.meta.subject.indexOf("reply") < 0 ) {
                this.modules.subject.set("reply: " + obj.meta.subject);
            } else {
                this.modules.subject.set(obj.meta.subject);
            }
			// this.$origin.html( this.getContent(obj, type) );
		} else if (type === "forward") {
            if ( obj.meta.subject.indexOf("forward") < 0 ) {
                this.modules.subject.set("forward: " + obj.meta.subject);
            } else {
                this.modules.subject.set(obj.meta.subject);
            }
			// this.$origin.html( this.getContent(obj, type) );
		}
		
	},

	//根据原始邮件生成引用内容
	getOriginContent: function(obj, type){
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
            if ( obj.meta.subject.indexOf("reply") < 0 ) {
                option.subject = "reply: " + obj.meta.subject;
            } else {
                option.subject = obj.meta.subject;
            }
		} else if (type === "replyAll") {
			option.title = "原始邮件";
            if ( obj.meta.subject.indexOf("reply") < 0 ) {
                option.subject = "reply: " + obj.meta.subject;
            } else {
                option.subject = obj.meta.subject;
            }
		} else if (type === "forward") {
			option.title = "转发邮件";
            if ( obj.meta.subject.indexOf("forward") < 0 ) {
                option.subject = "forward: " + obj.meta.subject;
            } else {
                option.subject = obj.meta.subject;
            }
		}

		option.content = obj.content;

		return this.template(option);
	},

	send: function(){
		var that = this;

		var obj = this.get();

		if ( !this.verify(obj) ) {
			return;
		}

		if ( this.sending ) {
			return;
		}

		this.sending = true;

		point.show({
			type:"loading",
			text:"正在发送邮件"
		});

		$.ajax({
			type: "POST",
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/mail/mails",
			data: JSON.stringify(obj),
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
				that.destroy();
			} else {
				point.shortShow({
					text: global.tools.getErrmsg(data.errcode),
					type: "error"
				});
			}
		}

		function error() {
			point.shortShow({
				text: "发送失败，请检查网络",
				type: "error"
			});
		}

		function complete(){
			that.sending = false;
		}
		
	},
	
	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();

		topBar.setTitle( this.prevTitle );
		topBar.setBack( this.prevBack );
		topBar.setMenu( this.prevMenu );
	}
});



module.exports = View;