var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	template: __inline("permissions-item.tmpl"),

	initialize: function(option) {
		this.parentView = option.parentView;
		this.render();
		this.initEvent();
		this.changeRole();
	},

	render: function() {
		var obj = this.model.toJSON();

		// 获取list的modelId方法， 生成唯一的ID
		obj.id = this.parentView.list.modelId(obj);
		this.$el = $( this.template(obj) );
		this.$role = this.$el.find(".JS-role");
		this.$rolePanel = this.$el.find(".JS-role-panel");
		this.$el.data("view", this);
	},

	initEvent: function() {
		var that = this;
		this.listenTo( this.model, "change:role", function(model, value){
			that.changeRole();
		});

		this.$role.on("click", function(event) {
			that.parentView.toggleRolePanel(that);
			event.stopPropagation();
		});

		this.$rolePanel.on("click", "li", function( event ){
			var value = $(this).data("value"),
				role = that.model.get("role");

			if ( value === role ) {
				that.$rolePanel.hide();
				event.stopPropagation();
				return;
			}
			
			that.parentView.changeRole(that.model.toJSON(), value);
			
			that.$rolePanel.hide();
			event.stopPropagation();
		});

		this.docHandle = function(){
			that.$rolePanel.hide();
		}

		$(document).on("click.role-select", this.docHandle);
	},

	updateRole: function(value){
		var that = this;

		if ( this.changeRoling ) {
			return;
		}

		this.changeRoling = true;

		// 构建参数
		var obj = this.model.toJSON(),
			data = {
			file_id: this.parentView.fileId,
			roles: {
				name: obj.name,
				owner: obj.owner,
				owner_type: obj.owner_type,
				role: value
			}
		};

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/roles",
			type:"PATCH",
			data: JSON.stringify(data),
			success: function(response){
				if ( response.errcode === 0 ) {
					that.model.set("role", value);
				}else{
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
				}
			},

			error: function(){
				point.shortShow({
					type:"error",
					text:"网络异常，请检查您的网络设置"
				});
			},

			complete: function(){
				that.changeRoling = false;
			}
		});
	},

    toggleRolePanel:function(){
        this.$rolePanel.toggle();
    },
    showRolePanel:function(){
        this.$rolePanel.show();
    },
    hideRolePanel:function(){
        this.$rolePanel.hide();
    },

	changeRole: function(){
		var value = this.model.get("role");
		this.$role.removeClass("warn");
		switch(value)
		{
		case 1:
			this.$role.html("所有者")
			break;
		case 2:
			this.$role.html("编辑者");
			break;
		case 3:
			this.$role.html("查看者");
			break;
		default:
			this.$role.addClass("warn");
		 	this.$role.html("设置权限级别");
		}
	},

	destroy: function(){
		this.$el.removeData();
		this.parentView = null;
		this.remove();
		$("document").off("click.role-select", this.docHandle);
	},

	attributes: {
		class: "permissions-item"
	}
});

module.exports = View;
