var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
	tagName: "li",

	template: __inline("item.tmpl"),

	attributes: {
		class: "item"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		var obj = this.model.toJSON();
		obj.cid = this.model.cid;
		if ( obj.installed ) {
			obj.buttonText = "卸载";
		} else {
			obj.buttonText = "安装";
		}
		this.$el.append( this.template(obj));

		this.$button = this.$el.find("button");
		this.$el.data("view", this);
	},

	initEvent: function() {
		var that = this;

		this.listenTo(this.model, "change:installed", function(model, value){
			if ( value ) {
				that.$button.html("卸载");
			} else {
				that.$button.html("安装");
			}
		});

		this.$button.on("click", function(){
			if ( that.model.get("installed") ) {
				confirm.show({
					text:"卸载后组织成员将不能使用此应用， 是否继续卸载？",
					callback: _.bind(that.toggleInstall, that)
				});
			} else {
				that.toggleInstall();
			}
		});
	},

	toggleInstall: function(){
		var that = this;
		if ( this.toggleInstalling )  {
			return;
		}
		this.toggleInstalling = true;
		this.$button.addClass("loading");
		var installed = this.model.get("installed"),
			handledValue = installed ? 0 : 1; //处理成功后的installed的值
		$.ajax({
			url:global.data.org.get("domain")  + "/orgs/"+global.data.org.get("id")+"/apps/global",
			type:"POST",
			data:JSON.stringify({
				app: that.model.get("id"),
				install: handledValue
			}),
			success: function(response){
				if ( response.errcode === 0 ) {
					if (handledValue) {
						point.shortShow({
							type:"success",
							text:"安装成功"
						});
					} else {
						point.shortShow({
							type:"success",
							text:"卸载成功"
						});
					}
					that.model.set("installed", handledValue);
				} else if ( response.errcode === 4 ) {
					point.shortShow({
						type:"error",
						text:"你没有此操作权限" 
					});
				} else {
					point.shortShow({
						type:"error",
						text:"操作失败, 错误码：" + response.errcode
					});
				}
			},
			error: function(){
				point.shortShow({
					type:"error",
					text:"操作失败, 请检查网络"
				});
			},
			complete: function(){
				that.toggleInstalling = false;
				that.$button.removeClass("loading");
			}
		});
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}

	
});

module.exports = View;