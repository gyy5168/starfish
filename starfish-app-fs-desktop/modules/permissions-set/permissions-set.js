var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js"),
	point = require("modules-common/point/point.js"),
	PermissionsList = require("modules/permissions-list/permissions-list.js"),
	Modal = require("modules-common/modal/modal.js");


var View = Modal.extend({

	title:"权限设置",

	content: __inline("permissions-set.html"),

	initialize: function() {
		View.__super__.initialize.call(this);
		this.render();
		this.initEvent();
	},

	render: function() {
		View.__super__.render.call(this);
		this.$search = this.$el.find("input");
		this.$content = this.$el.find(".JS-content");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");

		this.permissionsList = new PermissionsList({
			type: "detail"
		});
		this.$el.find(".JS-set").append( this.permissionsList.$el);
		$("#wraper").append( this.$el );
	},

	initEvent: function() {
		var that = this;
		View.__super__.initEvent.call(this);
		this.listenTo( this, "hide", function(){
			that.clear();
		});

		this.$error.on("click", function(){
			that.loadPermissions( that.fileId );
		});

		this.$search.on("input", _.throttle(function(){
			var value = that.$search.val();
			that.permissionsList.search(value);

		},200, {
			leading: false
		}));

		this.listenTo( this.permissionsList, "addRole", function( option ){
			handle( option );
		});

		this.listenTo( this.permissionsList, "updateRole", function( option ){
			handle(option);
		});

		this.listenTo( this.permissionsList, "removeRole", function( option ){
			handle(option);
		});

		function handle(option){
			return $.ajax({
				url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/roles",
				type:"POST",
				data: JSON.stringify({
					file_id: that.id,
					roles:[{
						name: option.data.name,
						owner: option.data.id,
						role: option.data.role,
						owner_type: option.data.type
					}]
				}),

				success: function( response ) {
					if ( response.errcode === 0 ) {
						option.success();
					} else{
						point.shortShow({
							text: global.tools.getErrmsg(data.errcode),
							type: 'error'
						});
					}
				},

				error: function(){
					point.shortShow({
						type:"error",
						text:"操作失败，请稍后重试"
					});
				}
			});
		}
	},

	clear: function(){
		this.$search.val("");
		this.permissionsList.clear();
	},

	loadPermissions: function(){
		if ( this.loading ) {
			return;
		}

		var that = this;
		this.loading = true;

		this.$loading.show();
		this.$content.hide();
		this.$error.hide();
		$.ajax({
			url:global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/roles?file_id=" + this.fileId,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					that.$content.show();
					var arr = [];
					_.each(response.data, function(obj){
						arr.push({
							id: obj.owner_info.id,
							name: obj.owner_info.name,
							avatar: obj.owner_info.avatar,
							role: obj.role,
							owner_type: obj.owner_type
						})
					});
					that.permissionsList.set(arr);
				} else {
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
					that.$error.show();
				}
			},
			error: function(){
				that.$error.show();
			},
			complete: function(){
				that.$loading.hide();
				that.loading = false;
			}
		});
	},

	setFileId: function(id) {
		this.fileId = id;
		this.loadPermissions();
		this.permissionsList.setFileId(id);
	},

	set: function(id){
		this.fileId = id;
		this.loadPermissions();
		this.permissionsList.setFileId(id);
		
	},

	destroy: function(){
		this.permissionsList.destroy();
		this.remove();
	},

	attributes: {
		class: "permissions-set"
	}
});

var permissionSet;
global.event.on("permissions", function(data){
	var $nodes = global.modules.fileList.getSelectedNode(),
		id = $nodes.first().data("id");

	if ( !permissionSet ) {
		permissionSet = new View();
	}

	permissionSet.show();
	permissionSet.set( id );
});

module.exports = View;