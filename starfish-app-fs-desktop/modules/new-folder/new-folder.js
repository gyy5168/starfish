var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require('modules-common/underscore/underscore.js'),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	PermissionsList = require("modules/permissions-list/permissions-list.js"),
	Modal = require("modules-common/modal/modal.js");

var View = Modal.extend({

	attributes: {
		class: "new-folder"
	},

	title:"新建文件夹",

	content: __inline("new-folder.html"),

	initialize: function() {
		View.__super__.initialize.call(this);
		this.render();
		this.initEvent();
	},

	render: function() {
		View.__super__.render.call(this);
		this.$privacyOption = this.$el.find(".JS-privacy");
		this.$manageOption = this.$el.find(".JS-manage");
		this.$ok = this.$el.find(".JS-ok");
		this.$permissionsSet = this.$el.find(".JS-permissions-set");
		this.$name = this.$el.find(".JS-name");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");
		this.$content = this.$el.find(".JS-content");

		this.permissionsList = new PermissionsList();
		this.$permissionsSet.prepend( this.permissionsList.$el );		
	},

	initEvent: function() {
		var that = this;
		View.__super__.initEvent.call(this);
		this.$el.on("click", ".JS-option", function(){
			that.$el.find(".JS-option").removeClass("selected");
			$(this).addClass("selected");
		});

		this.$ok.on("click", function(){
			that.create();
		});

		this.listenTo( this, "hide", function(){
			that.clear();
		});

		this.listenTo( this, "show", function(){
			that.setById(global.currentPath[global.currentPath.length - 1].id);
		});

		this.$error.on("click", function(){
			that.loadPermissions( that.id );
		});
	},

	// 根据目录ID，来初始化组件
	setById: function(id){
		id = id || 0;
		this.id = id;

		// 如果在根目录
		if ( id === 0 ) {

			this.$error.hide();
			this.$loading.hide();
			this.$content.show();

			var arr = [];

			// 将自己设置为所有者
			var user = global.data.user.toJSON();
			arr.push({
				id: user.id,
				name: user.name,
				avatar: user.avatar,
				owner_type: 0,
				role: 1
			});
	
			this.permissionsList.set(arr);
		} else {
			this.loadPermissions( id );
		}
	},

	// 加载权限列表
	loadPermissions: function(id){

		this.id = id;
		if ( this.loading ) {
			return;
		}

		var that = this;
		this.loading = true;

		this.$loading.show();
		this.$content.hide();
		this.$error.hide();
		$.ajax({
			url:global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/roles?file_id=" + id,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					that.$content.show();

					var user = global.data.user.toJSON(),
						arr = [];

					//过滤自己,后面会将自己设置为所有者
					response.data = _.reject( response.data, function(obj){
						return obj.owner == user.id;
					});

					_.each(response.data, function(obj){
						arr.push({
							id: obj.owner_info.id,
							name: obj.owner_info.name,
							avatar: obj.owner_info.avatar,
							role: obj.role,
							owner_type: obj.owner_type
						});
					});

					// 将父元素的所有者，设置为编辑者
					_.each( arr, function( obj){
						if ( obj.role === 1 ) {
							obj.role = 2;
							return false;
						}
					});

					//添加自己为所有者
					arr.unshift({
						id: user.id,
						name: user.name,
						avatar: user.avatar,
						owner_type: 0,
						role: 1
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

	clear: function(){
		this.$name.val("");
		this.$manageOption.trigger("click");
		this.permissionsList.clear();
	},

	// 创建文件
	create: function(){

		if ( this.creating || !this.verify() ) {
			return;
		}

		this.creating = true;
		this.$ok.addClass("loading");

		var that = this;

		$.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/files",
			type:"POST",
			data: JSON.stringify( this.get() ),
			success: function(response){
				if ( response.errcode === 0 ) {
					global.event.trigger("folderNew", response.data);
					that.hide();
					point.shortShow({
						type:"success",
						text:"创建成功"
					});
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
					text: "网络异常，请检查您的网络设置" 
				});
			},

			complete: function(){
				that.$ok.removeClass("loading");
				that.creating = false;
			}

		});
	},

	// 获取表单数据
	get: function(){
		var result = {
				name: this.$name.val().trim(),
				parent: global.currentPath[global.currentPath.length -1 ].id,
				roles:[]
			};

		if ( this.$privacyOption.hasClass("selected") ) {
			return result;
		}

		result.roles = this.permissionsList.get();

		return result;
	},

	// 获取字符串实际长度，英文的长度算1，中文的长度算2
	getStrLength: function(str){
		var realLength = 0, len = str.length, charCode = -1;
	    for (var i = 0; i < len; i++) {
	        charCode = str.charCodeAt(i);
	        if (charCode >= 0 && charCode <= 128) realLength += 1;
	        else realLength += 2;
	    }
	    return realLength;
	},

	verify: function(){
		var name = this.$name.val();
		name = name.trim();
		if ( name === "" ) {
			point.shortShow({
				text:"请输入文件夹名称"
			});
			return false;
		}

		var length = this.getStrLength(name);
		if ( length > 100 ) {
			point.shortShow({
				text:"文件名称过长，字符不能超过50个"
			});
			return false;
		}

		if ( !this.$privacyOption.hasClass("selected") ) {
			if ( !this.permissionsList.verify() ) {
				return false;
			}
		}

		return true;
	},

	destroy: function(){
		this.permissionsList.destroy();
		View.__super__.destroy.call(this);
	}
});

// 查看用户在当前目录是否有相应的权限
function hasPermisssins(str) {
	// 获取当前目录的权限列表
	var permissions = global.currentPermissions;

	// 如果没有权限列表，说明在是根目录
	// 所有人对根目录有所有的权限
	if ( !permissions ) {
		return true;
	}

	// 判断权限列表中，室友含有相应的权限
	var flag = false;
	$.each(permissions, function(index, permission){
		if ( permission === str ) {
			flag = true;
			return false;
		}
	});

	return flag;
}


// 绑定创建文件夹事件
var newFolder;
global.event.on("new", function() {
	if( !global.currentPath ) {
		point.shortShow({
			text:"文件列表还没加载出来，稍等一下"
		});
		return;
	}

	if ( !hasPermisssins("upload") ) {
		point.shortShow({
			text:"在该目录下没有创建文件夹的权限",
			time: 2000
		});
		return;
	}

	if ( !newFolder ) {
		newFolder = new View();
	}
	
	newFolder.show();
});

module.exports = View;