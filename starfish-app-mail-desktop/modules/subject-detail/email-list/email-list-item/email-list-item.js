var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	_ = require("modules-common/underscore/underscore.js"),
	dateTools = require("modules-common/tools/date.js"),
	tools = require("modules/tools/tools.js"),
	DetailForm = require("modules/detail-form/detail-form.js"),
	point = require("modules-common/point/point.js"),
	mailList = require("modules/collections/mail-list.js"),
	file = require("modules-common/file/file2.js"),
	confirm = require("modules-common/confirm/confirm.js");

var ItemView = Backbone.View.extend({
	tagName: "li",

	attributes: {
		class: "email-list-item"
	},

	hdTemplate: __inline("item-hd.tmpl"),

	bdTemplate: __inline("item-bd.tmpl"),

	infoTemplate: __inline("item-info.tmpl"),

	initialize: function() {
		this.renderHd();
		this.renderInfo();
		this.renderBd();
		this.initEvent();
		this.initReplyEvent();

		this.$infoPanel = this.$el.find(".JS-info-panel");
		this.$actionPanel = this.$el.find(".JS-action-panel");
		this.$originContent = this.$el.find(".JS-origin-content");
	},

	// 渲染邮件头部
	renderHd: function(){
		var data = this.model.toJSON(),
			obj = {};

		this.$el.attr("data-id", data.id);

		if( !data.is_read ) {
			this.$el.addClass("unread");
		}

		obj.name = data.meta.from_detail.value.name + "&lt;" + data.meta.from + "&gt;";

		// 邮件时间
		obj.time = dateTools.convertDate(data.date);

		// 操作是否显示回复所有
		if ( data.meta.to.length + data.meta.cc.length > 1 ) {
			obj.replyAllClass = "";
		} else {
			if ( data.meta.to_info[0].owner_type === 0 ) {
				obj.replyAllClass = "hide";
			} else {
				obj.replyAllClass = "";
			}
		}

		this.$el.append( this.hdTemplate(obj));
		
	},

	// 渲染邮件的发送人等信息
	renderInfo: function(){
		var modelData = this.model.toJSON(),
			obj = {};

		obj.info = "发送给 ";
		_.find( modelData.meta.to_info, function( data, index ){
	
			// 最多显示两个
			if ( index === 2 ) {
				obj.info += "...";
				return true;
			}

			if ( index !== 0 ) {
				obj.info += " , ";
			}

			if ( data.name ) {
				obj.info += data.name;
			} else {
				obj.info += modelData.meta.to[index];
			}
		});

		// 信息面板
		// 获取发件人信息
		if ( modelData.meta.from_detail.value ) {
			obj.infoForm = modelData.meta.from_detail.value.name + "&lt;" + modelData.meta.from + "&gt;";
		} else {
			obj.infoForm = modelData.meta.from;
		}

		
		obj.infoTo = "";
		_.each( modelData.meta.to_info, function( data, index ){
	
			if ( index !== 0 ) {
				obj.infoTo += " , ";
			}

			if ( data.name ) {
				obj.infoTo += data.name + "&lt;" + modelData.meta.to[index] + "&gt;";
			} else {
				obj.infoTo += modelData.meta.to[index];
			}
		});

		obj.infoCC = false;
		if ( modelData.meta.cc.length ) {

			obj.infoCC = "";
			_.each( modelData.meta.cc_info, function( data, index ){
	
				if ( index !== 0 ) {
					obj.infoCC += " , ";
				}

				if ( data.name ) {
					obj.infoCC += data.name + "&lt;" + modelData.meta.cc[index] + "&gt;";
				} else {
					obj.infoCC += modelData.meta.cc[index];
				}
			});
		}

		obj.infoDate = tools.convertDate(modelData.date);
		obj.infoSubject = modelData.meta.subject;

		this.$el.append( this.infoTemplate(obj));

		this.$infoPanel = this.$el.find(".JS-info-panel");
	},

	// 渲染邮件内容和附件
	renderBd: function(){
		var data = this.model.toJSON(),
			obj = {};
		// 附件
		if ( data.attachments.length > 0 ) {
			obj.attachmentsClass = "show";
			obj.attachments = [];
			$.each(data.attachments, function(index, attachment){
				var o = {};
				o.id = attachment.id;
				o.minitype = attachment.minitype;
				o.name = attachment.filename;
				o.type = tools.getFileType( attachment.filename );
				o.url = global.baseUrl + "/orgs/"+global.data.org.get("id")+"/mail/mails/"+data.id+"/attachments/" + attachment.id +"?width=70&height=70";
				obj.attachments.push(o);
			});
		} else {
			obj.attachmentsClass = "";
			obj.attachments = [];
		}

		data.content = global.tools.decodeHtml(data.content);
		// 邮件内容只需要转义scrpit标签，保留格式标签
		data.content = data.content.replace(/<script(\s+[^>]*)?>/ig, "&lt;script $1 &gt; ");
		data.content = data.content.replace(/<\/script\s*>/ig, "&lt;/script&gt; ");
		// 邮件内容和原始邮件
		var $node = $("<div>" + data.content + "</div>"),
			$origin = $node.find(".JS-orgin:first");

		if ( $origin.length > 0 ) {
			obj.originContent = $origin.html();
			$origin.remove();
			obj.content = $node.html();
			obj.switchClass = "show";
		} else {
			obj.content = $node.html();
			obj.switchClass = "";
			obj.originContent = "";
		}

		this.$el.append(this.bdTemplate(obj));
	},

	initEvent: function() {
		var that = this;

		// 下载附件
		this.$el.on("click", ".JS-download", function(){
			var data = $(this).closest("li").data(),
				obj = file.selectPath();

			if ( !obj.path ){
				return;
			}

			file.download({
				url: global.baseUrl + "/orgs/"+global.data.org.get("id")+"/mail/mails/"+that.model.get("id")+"/attachments/" + data.id,
				path: obj.path,
				fileName: data.name
			});
		});

		// 预览附件
		this.$el.on("click", ".JS-preview", function(){
			var data = $(this).closest("li").data();

			file.openRemote({
				fileName: data.name,
				url:global.baseUrl + "/orgs/"+global.data.org.get("id")+"/mail/mails/"+that.model.get("id")+"/attachments/" + data.id
			});
		});

		// 切换邮件信息
		this.$el.find(".JS-info-icon").on("click", function( event ){
			that.$infoPanel.toggle();
			event.stopPropagation();
		});

		// 切换邮件下拉操作菜单
		this.$el.find(".JS-drop-btn").on("click", function( event ){
			that.$actionPanel.toggle();
			event.stopPropagation();
		});

		// 切换邮件的原始邮件
		this.$el.find(".JS-origin-switch").on("click", function(){
			that.$originContent.toggle();
		});

		// 如果邮件标记已读，隐藏未读图标
		this.listenTo( this.model, "change:is_read", function(){
			that.$el.find(".JS-read").hide(500);
		});

		this.listenTo(this, "reply", function(action){
			that.addForm( action, that.model);
		});

	},

	// 操作菜单事件
	initReplyEvent: function(){
		var that = this;
		this.$el.find(".JS-action-panel").on("click", "li", function(){
			var action = $( this ).data("action");
			// 如果是删除，需要询问
			if ( action === "remove" ){
				confirm.show({
					text:"确定要删除该邮件？",
					callback: function(){
						that.removeMail();
					}
				});
				return;
			}
			
			that.addForm(action, that.model);
		});

		// 快捷回复操作
		this.$el.find(".JS-reply").on("click", function(){
			that.addForm("reply", that.model);
		});
	},

	addForm: function(type, model){
		var that = this;
		if ( !this.formModule ) {
			this.formModule = new DetailForm();
			this.formModule.parent = this;
			this.$el.after( this.formModule.$el );

			this.listenTo(this.formModule, "destroy", function(){
				that.formModule = null;
			});
		}
		this.formModule.set( type, model );
	},

	removeForm: function(){
		if ( this.formModule ) {
			this.formModule.destroy();
			this.formModule = null;
		}
	},

	isEmpty: function(){
		if ( this.formModule ) {
			return this.formModule.isEmpty();
		}
		return true;
	},

	removeMail: function(){
		var that = this;

		if ( this.removeMailing ) {
			return;
		}
		this.removeMailing = true;

		point.show({
			type:"loading",
			text:"删除中"
		});

		$.ajax({
			url:global.baseUrl + "/orgs/"+global.data.org.get("id")+"/mail/mails/" + this.model.get("id"),
			type:"DELETE",
			success: success,
			error: error
		});

		function success(data){
			if ( data.errcode === 0 ) {
				point.shortShow({
					type:"success",
					text:"删除成功"
				});

				mailList.remove(that.model);
			} else {
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(data.errcode)
				});
			}
		}

		function error(){
			point.shortShow({
				type:"error",
				text:"删除失败, 请检查网络"
			});
		}

		function complete(){
			that.removeMailing = false;
		}
	},

	hidePanel: function(){
		this.hideInfo();
		this.hideActionPanel();
	},

	showInfo: function(){
		this.$infoPanel.show();
	},

	hideInfo: function(){
		this.$infoPanel.hide();
	},

	showActionPanel: function(){
		this.$actionPanel.show();
	},

	hideActionPanel: function(){
		this.$actionPanel.hide();
	},

	destroy: function(){
		this.$el.removeData();
		this.removeForm();
		this.remove();
	}

	
});

module.exports = ItemView;