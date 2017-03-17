var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	mailList = require("modules/collections/mail-list.js"),
	subjectList = require("modules/collections/subject-list.js"),
	MailListView = require("./email-list/email-list.js"),
	router = require("modules/routers/router.js"),
	DetailForm = require("modules/detail-form/detail-form.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "subject-detail"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("subject-detail.html"));

		this.$content = this.$el.find(".JS-content");
		this.$title = this.$el.find(".JS-main-title");
		this.$list = this.$el.find(".JS-main-list");
		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$errorBtn = this.$error.find(".JS-btn");

		this.mailListView = new MailListView();
		this.$list.append(this.mailListView.$el);
	},

	initEvent: function() {
		var that = this;

		// 如果邮件列表中的邮件全部删除，删除对应的主题
		this.listenTo( mailList, "remove", function(){
			if ( mailList.length === 0 ) {
				global.event.trigger("subjectRemoved", that.model);
			}
		});

		this.listenTo( mailList, "change:is_read", function(){
			var model = mailList.find( function(model){
				return model.get("is_read") === 0;
			});

			// 如果不存在未读的邮件，则设置对应的主题已读
			if ( !model ) {
				global.event.trigger("subjectReaded", that.model.get("id"));
			}
			
		});

		// 如果主题被删除， 且主题详情的内容是这个主题的详情， 则隐藏主题详情
		this.listenTo(global.event, "subjectRemoved", function(model){
			if ( that.isShow() && (that.model.get("id") == model.get("id")) ) {
				that.hide();
				global.event.trigger("showNoSelect");
			}
		});

		this.$errorBtn.on("click", function(){
			// 如果有ID，说明是调用setId接口失败，否则是调用set接口
			if ( that.id ) {
				that.setId( that.id );
			} else {
				that.set( that.model );
			}
		});
	},

	// 根据主题的model，显示主题详情
	set: function(model){
		var that = this,
			obj = model.toJSON();

		this.model = model;
		this.clear();
		
		this.$loading.show();

		$.ajax({
			url:global.baseUrl + "/orgs/" + global.data.org.get("id") + "/mail/subjects/" + obj.id + "/mails?ps=1000",
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(data){
			if ( data.errcode === 0 ) {
				that.$title.html(obj.subject);
				
				that.$content.show();
				mailList.reset(data.data);
			} else {
				that.$error.show();
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(data.errcode)
				})
			}
		}

		function error(){
			that.$error.show();
		}

		function complete(){
			that.$loading.hide();
		}
	},

	// 根据邮件的ID，显示邮件详情
	// 根据邮件的ID，获取邮件所在的主题的邮件列表
	setId: function(id){
		var that = this;

		this.id = id;

		this.clear();
		this.$loading.show();

		// $.when( function(){
		// 	return $.ajax({
		// 		url: global
		// 	})
		// }, function(){})

		$.ajax({
			url:global.baseUrl + "/orgs/" + global.data.org.get("id") + "/members/"+global.data.user.get("id")+"/mail/subjects?mail_id=" + id + "&ps=1000",
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(data){
			if ( data.errcode === 0 ) {
				that.model = new Backbone.Model(data.data);

				that.$content.show();
				mailList.reset(data.data);
				// 滚动到指定邮件的位置
				that.mailListView.scrollTo(id);

				// 取第一封邮件的主题，作为主题
				if ( data.data.length !== 0 ) {
					that.$title.html(data.data[0].meta.subject);
				} else {
					that.$title.html("没有邮件");
				}
				
			} else {
				that.$error.show();
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(data.errcode)
				});
			}
		}

		function error(){
			that.$error.show();
		}

		function complete(){
			that.$loading.hide();
		}
	},

	isEmpty: function(){
		return that.mailListView.isEmpty();
	},

	// 隐藏所有面板
	clear: function(){
		this.$content.hide();
		this.$loading.hide();
		this.$error.hide();
	},

	// 视图是否显示
	isShow: function(){
		return this.$el.css("display") !== "none";
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
		this.mailListView.destroy();
		this.mailListView = null;
	}
	
});

module.exports = View;