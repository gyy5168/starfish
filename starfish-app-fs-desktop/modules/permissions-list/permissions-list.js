var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	ItemView = require("./permissions-item/permissions-item.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	PeopleSelect = require("modules/people-select-permissions/people-select-permissions.js");

var List = Backbone.Collection.extend({
	// 部门、讨论组和人员的id可能有重复， 需要根据type 生成唯一ID
	// 否则列表自动合并掉ID相同的数据
	modelId: function(attrs){
		return attrs.owner + "t" + attrs.owner_type;
	}
});

var View = Backbone.View.extend({

	template: __inline("permissions-list.tmpl"),

	attributes: {
		class: "permissions-list"
	},

	initialize: function(option) {
		this.option = option || {};
		this.type = this.option.type || "create";

		this.list = new List();
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.append( __inline("permissions-list.html"));
		this.$add = this.$el.find(".JS-add");
		this.$list = this.$el.find("ul");
	},

	initEvent: function(){
		var that = this;

		this.$add.on("click", function(){
			that.showPeoplePanel();
		});

		this.initListEvent();
	},

	initListEvent: function(){
		var that = this;

		this.listenTo( this.list, "add", this.addItem);
		this.listenTo( this.list, "remove", this.removeItem);
		this.listenTo( this.list, "reset", function(list, option){

			$.each(option.previousModels, function(index, model) {
				that.removeItem(model);
			});

			that.list.each( function(model){
				that.addItem(model);
			});
		});

		// 如果role的值为0， 则删除
		this.listenTo( this.list, "change:role", function(model, value){
			if( value === 0 ) {
				that.list.remove(model);
			}
		});
	},

	setFileId: function(id){
		this.fileId = id;
	},

    //权限编辑效果
    toggleRolePanel: function( view ){
        //如果点击的同一个权限编辑列表,当前列表就来回显示隐藏
        if(_.isEqual(this.rolePanelShowed,view)){
            view.toggleRolePanel()
            return
        }
        //隐藏上一个显示的权限编辑列表
        if ( this.rolePanelShowed ) {
            this.rolePanelShowed.hideRolePanel();
        }
        //显示当前的权限编辑列表
        view.showRolePanel()
        this.rolePanelShowed=view
    },

	changeRole: function( data, value ){
		var that = this;
		
		// 所有者必须是单个的成员
		if ( value === 1 && data.owner_type !== 0 ) {
			point.shortShow({
				text:"所有者必须是单个的成员"
			});
			return false;
		}

		// 不能将所有者更改为其他
		if( data.role === 1 ) {
			point.shortShow({
				text:"必须有一个所有者"
			});
			return;
		}

		var model = this.list.get( this.list.modelId(data) );

		// 如果修改成所有者，将吧目前的所有者改成编辑者
		if ( value === 1 ) {
			var owner = this.getOwner();
			if ( owner ) {
				confirm.show({
					text:"所有者权限只能有一个人，将所有者权限分配给其他用户后，您将不再有分配的权限，确定继续？",
					callback: function(){
						if ( that.type === "create" ) {
							owner.set("role", 2);
							model.set("role", 1);
						} else {
							that.updateServerRole(data, value).success(function(response){
								if ( response.errcode === 0 ) {
									owner.set("role", 2);
									model.set("role", 1);
								}
							});
						}
					}
				});
				return;
			}
		}
		
		if ( this.type === "create" ) {
			model.set("role", value);
			return;
		} else {
			return this.updateServerRole(data, value).success(function(response){
				if ( response.errcode === 0 ) {
					model.set( "role", value );
				}else{
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
				}
			});
		}
	},

	addDatas: function(list){
		if ( this.type === "create" ) {
			this.list.add(list, {
				merge: true
			});
		} else if ( this.type === "detail" ) {
			return this.addServerDatas(list);
		}
	},

	verifyDatas: function(list){
		var that = this,
			ownerNum = 0,
			owner = this.getOwner(),
			flag = false;

		if ( owner ) {
			ownerNum++ ;
		}

		_.each( list, function(obj) {
			if ( obj.role === 1 ) {
				ownerNum++;
			}

			if ( obj.role === 1 && obj.owner_type !== 0 ) {
				flag = true;
			}
		});

		if ( ownerNum > 1 ) {
			point.shortShow({
				text:"只能有一个所有者"
			});
			return false;
		}

		if ( flag ) {
			point.shortShow({
				text:"所有者必须是单个的成员"
			});
			return false;
		}


		flag = false;

		var ownerId = this.list.modelId( owner.toJSON() );
		_.find( list, function(obj){
			var id = that.list.modelId(obj);
			if ( ownerId === id ) {
				if ( obj.role !== 1 ) {
					point.shortShow({
						text:obj.name + "已经是所有者"
					});
					flag = true;
				}
				return true;
			}
		});

		if ( flag ) {
			return;
		}

		return true;
	},

	addServerDatas: function(list){
		var that = this;

		if( this.addDatasing ) {
			return;
		}
		this.addDatasing = true;
		// 构建参数
		var obj = {
			file_id: this.fileId,
			roles: list
		};

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/roles",
			type:"POST",
			data: JSON.stringify(obj),
			success: function(response){
				if ( response.errcode === 0 ) {
					that.list.add(list,{
						merge: true
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
					text:"网络异常，请检查您的网络设置"
				});
			},

			complete: function(){
				that.addDatasing = false;
			}
		});
	},

	updateServerRole: function(data, role){
		var that = this;

		var id  = this.list.modelId( data );

		if ( this["changeRoling" + id ] ) {
			return;
		} 

		this["changeRoling" + id ] = true;

		// 构建参数
		var obj = {
			file_id: this.fileId,
			roles: [{
				name: data.name,
				owner: data.owner,
				owner_type: data.owner_type,
				role: role
			}]
		};

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/roles",
			type:"POST",
			data: JSON.stringify(obj),
			success: function(response){
				if(response.errcode!=0){
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
				that["changeRoling" + id ] = false;
			}
		});
	},

	showPeoplePanel: function(){
		var that = this;
		this.peopleSelect = new PeopleSelect();
		this.listenTo( this.peopleSelect, "ok", function(data){
			if ( data.selectedList.length === 0 ) {
				point.shortShow({
					text:"请选择一个部门、人员或者讨论组"
				});
				return;
			}

			var arr = [];
			_.each( data.selectedList, function(obj) {
				arr.push({
					name: obj.name,
					owner: obj.id,
					owner_type: transfer(obj.type),
					role: data.role,
					avatar: obj.avatar
				});
			});

			function transfer(type) {
				if ( type === "department" ) {
					return 1;
				} else if ( type === "people" ) {
					return 0;
				} else if ( type === "discussionGroup" ) {
					return 2;
				}
			}

			if ( that.verifyDatas(arr) ) {
				if ( that.type == "create" ) {
					that.addDatas(arr);
					that.peopleSelect.hide();
				} else if ( that.type === "detail" ) {
					that.peopleSelect.setLoading();
					that.addDatas(arr).success(function(response) {
						if ( response.errcode === 0 ) {
							that.peopleSelect.unsetLoading();
							that.peopleSelect.hide();
						} else {
							that.peopleSelect.unsetLoading();
						}
					}).error( function(){
						point.shortShow({
							text: global.tools.getErrmsg(data.errcode),
							type: 'error'
						});
						that.peopleSelect.unsetLoading();
					});
				}
			}
		});

		this.listenTo( this.peopleSelect, "hide", function(){
			that.peopleSelect.destroy();
			// that.peopleSelect = null;
		});
	},

	change: function(id, role){
		var model = this.list.get(id);
		if ( model ) {
			model.set("role", role);
		}
	},

	verify: function(){		
		var model = this.list.find(function(model){
			return model.get("role") === 1;
		});

		if ( model ) {
			return true;
		} else {
			return false;
		}

		return true;
	},

	// 获取所有者
	getOwner: function(){
		var model = this.list.find(function(model){
			return model.get("role") === 1;
		});

		return model;
	},

	// 添加
	addItem: function(model){
		var itemView = new ItemView({
			model:model,
			parentView: this
		});

		this.$list.append(itemView.$el);
	},

	// 删除
	removeItem: function(model){
		var id = this.list.modelId(model.toJSON());
		this.$list.find("li[data-id="+id+"]").data("view").destroy();
	},

	// 搜索关键字
	search: function( value ) {
		this.$list.find(">li").each(function(){
			var $this = $( this ),
				name = $this.data("name");

			if ( name.indexOf( value ) >= 0 ) {
				$this.show();
			} else {
				$this.hide();
			}
		});
	},

	// 返回列表数据
	get: function(){
		var result = [];
		this.list.each( function(model) {
			if (!model.get("role")) {
				return;
			}

			var obj = model.toJSON();

			result.push({
				name: obj.name,
				owner: obj.owner,
				owner_type: obj.owner_type,
				role: obj.role
			});
		});

		return result;
	},

	// 设置列表数据
	set: function( arr ){
		_.each( arr, function(obj){
			obj.owner = obj.id;
		});
		this.list.reset(arr);
	},

	// 清空数据
	clear: function(){
		this.list.reset([]);
	},

	destroy: function(){
		this.list.reset([]);
		this.remove();
	}
});

module.exports = View;