var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	PeopleTree = require("modules-common/people-select-modules/people-tree/people-tree.js");

var View = Backbone.View.extend({

	attributes:{
		"class": "people-list"
	},

	pageSize: 20,

	initialize: function(option){
		this.option = option.option;
		this.parentView = option.parentView;
		this.selectedList = this.parentView.selectedList;
		this.render();
		this.initEvent();
		this.fetchRoot();
	},

	render: function(){
		this.$el.html(__inline("people-list.html"));
		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		
		this.modules = {};
		this.modules.peopleTree = new PeopleTree({
			dataFilter: function( response ) {
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				response = JSON.parse( response );
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				var arr = [];
				_.each( response.data, function(obj){
					if ( obj.item_type === 1 ) {
						arr.push({
							isParent: true,
							avatar: obj.item.avatar,
							id: obj.item.id,
							type:"departments",
							name: obj.item.name
						});
					} else if ( obj.item_type === 2 ){
						arr.push({
							avatar: obj.item.avatar,
							id: obj.item.id,
							type:"people",
							name: obj.item.name
						});
					}
				});

				response.data = arr;

				return JSON.stringify( response );
			},
			isPaging: true,
			createUrl: function(data, $node, view){
				return global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/departments/"+data.id+"/items"
			},
			selectedList: this.selectedList
		});

		this.modules.peopleTree.hide();
		this.$el.append( this.modules.peopleTree.$el );
	},

	initEvent: function(){
		var that = this;

		this.$error.on("click", function(){
			that.fetchRoot();
		});

		// this.listenTo( this.modules.peopleTree, "select", function(obj) {
		// 	that.selectedList.add(obj);
		// });

		// this.listenTo( this.modules.peopleTree, "unselect", function(obj) {

		// 	that.selectedList.remove( this.selectedList.modelId(obj) );

		// });

		// this.listenTo( this.selectedList, "add", function(model){
		// 	var obj = model.toJSON();
		// 	obj.type = "people";
		// 	that.modules.peopleTree.select(obj);
		// } );

		// this.listenTo( this.selectedList, "remove", function(model){
		// 	var obj = model.toJSON();
		// 	obj.type = "people";
		// 	that.modules.peopleTree.unselect(obj);
		// } );
	},

	// 获取根节点
	fetchRoot: function(){
		var that = this;

		if ( this.fetchRooting ) {
			return;
		}
		this.fetchRooting = true;

		this.$loading.show();
		this.$error.hide();
		this.modules.peopleTree.hide();

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+ global.data.org.get("id") +"/departments?parent=0&page=1&count=1",
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if (response.errcode === 0) {

				// 添根节点到列表中， 并触发加载子数据
				var rootData = response.data[0];

				that.modules.peopleTree.loadData([{
					name: rootData.name,
					id: rootData.id,
					type:"departments",
					avatar: rootData.avatar,
					isParent: true
				}]);
				that.modules.peopleTree.show();
				that.modules.peopleTree.openRoot();
			} else {
				point.shortShow({
					type:"error",
					text:"加载根节点失败，错误码： " + response.errcode
				});
				that.$error.show();
			}
		}

		function error(){
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
			});
			that.$error.show();
		}

		function complete(){
			that.fetchRooting = false;
			that.$loading.hide();
		}
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.modules.peopleTree.destroy();
		this.remove();
	}
});

module.exports = View;