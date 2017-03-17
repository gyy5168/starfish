var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js");

// Backbone.$ = $;

// 设置全局ajax
$.ajaxSetup({
	timeout: 8000,
	contentType: "application/json",
	xhrFields: {
		withCredentials: true
	}
});

// 定义全局对象
window.global = window.global || {};

global.$doc = $("#wraper");

// 定义 系统类型
// 消息类型
global.messageType = {
	taskShare: 5,
	fileShare: 48
};

// 成员、组织、部门类型
global.destType = {
	member: 0,
	group: 1,
	org: 2,
	department: 3
};

// 会话类型
global.peerType = {
	member: 0,
	group: 1,
	contacts: 2,
	department: 3
};

// 定义 url前缀
global.baseUrl = "https://api.starfish.im/v1";

// 定义模块空间
global.modules = global.modules || {};

// 定义事件对象
global.event = $.extend({}, Backbone.Events);

// 定义全局数据
global.data = global.data || {};

// 从框架获取组织信息
var info = window.starfish.getInfo();
info = JSON.parse(info);
global.data.org = new Backbone.Model({
    id: info.orgId,
    domain: info.domain,
    isAdmin: isAdmin
});

// 加载页面UI， 加载初始化信息（当前用户、当前组织）
var View = Backbone.View.extend({
	attributes: {
		"class": "init"
	},

	initialize: function(option){
		option = option || {};
		this.callback = option.callback;
		this.render();
		this.initEvent();
		this.fetchInfo();
	},

	render: function(){
		this.$el.html(__inline("init.html"));
		this.$loading = this.$el.find(".JS-loading");
		this.$loadError = this.$el.find(".JS-error");
		global.$doc.append( this.$el );
	},

	initEvent: function(){
		var that = this;
		this.$loadError.find(".JS-btn").on("click", function(){
			that.fetchInfo();
		});
	},

	fetchInfo: function(){
		var that = this;
		if ( this.fetchInfoing ) {
			return;
		}
		this.fetchInfoing = true;

		this.$loading.show();
		this.$loadError.hide();

		return $.ajax({
			url: global.baseUrl + "/users/self",
			type:"GET",
			async:false,
			success: function(response){
				if ( response.errcode === 0 ) {
					global.data.user = new Backbone.Model(response.data);
					//global.data.org = new Backbone.Model(response.data.last_org);

					// for test
					// global.data.user.set("is_admin", 1);
					
					that.callback && that.callback();				
					that.destroy();
				} else {
					that.$loadError.show();
					point.shortShow({
						type:"error",
						text:"初始化时失败， 错误码是：" + response.errcode
					});
				}
			},

			error: function(){
				that.$loadError.show();
				point.shortShow({
					type:"error",
					text:"加载失败， 请检查网络"
				});
			},

			complete: function(){
				that.fetchInfoing = false;
				that.$loading.hide();
			}
		});
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = function( fn ) {
	var view = new View({
		callback: fn
	});
}





