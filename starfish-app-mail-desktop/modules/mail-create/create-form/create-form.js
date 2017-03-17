var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	FormPeople = require("modules/form-modules/form-people/form-people.js"),
	FormSubject = require("modules/form-modules/form-subject/form-subject.js"),
	FormContent = require("modules/form-modules/form-content/form-content.js"),
	FormCombin = require("modules/form-modules/form-combin/form-combin.js"),
	FormAttachment = require("modules/form-modules/form-attachment/form-attachment.js");

var CreateForm = Backbone.View.extend({

	tagName:"form",

	attributes:{
		class:"create-form"
	},

	initialize: function(){
		this.render();
		this.initEvent();
	},

	render: function(){
		this.modules = {
			to: new FormPeople({
				label:"收件人 : ",
				class:"form-to"
			}),
			cc: new FormPeople({
				label:"抄　送 : ",
				class:"form-cc"
			}),
			bcc: new FormPeople({
				label:"密　送 : ",
				class:"form-bcc"
			}),
			subject: new FormSubject(),
			content: new FormContent(),
			attachments: new FormAttachment({
				class:"attachment"
			})
		};

		this.combin = new FormCombin({
			cc: this.modules.cc,
			bcc: this.modules.bcc
		});

		this.$el.append(this.modules.to.$el);
		this.$el.append(this.modules.cc.$el);
		this.$el.append(this.modules.bcc.$el);
		this.$el.append(this.combin.$el);
		this.$el.append(this.modules.subject.$el);
		this.$el.append(this.modules.content.$el);
		this.$el.append(this.modules.attachments.$el);
	},

	initEvent: function(){

	},

	// 表单是否有数据
	isEmpty: function(){
		var data = this.get(),
			flag = true;

		// 判断附加模块是否为空
		if ( !this.modules.attachments.isEmpty() ) {
			return false;
		}

		// 判断模块是否为空
		$.each( data, function( key, value ) {
			if ( value === "" || value.length === 0 ) {
				return;
			}

			flag = false;
			
			return false;
		});

		return flag;
	},

	// 返回附件模块的状态
	getAttachmentState: function(){
		return this.modules.attachments.getState();
	},

	get: function(){
		var data = {};
		$.each(this.modules, function(key, module) {
			data[key] = module.get();
		});

		return data;
	},

	// 清空表单
	clear: function(){
		$.each( this.modules, function( key, module) {
			module.clear();
		});
		this.combin.clear();
	},

	destroy: function(){
		$.each( this.modules, function( key, module) {
			module.destroy();
		});
		this.combin.destroy();
		this.remove();
	}
});


module.exports = CreateForm;