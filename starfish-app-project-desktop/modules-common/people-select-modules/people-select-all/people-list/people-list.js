var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	PeopleTree = require("modules-common/people-select-modules/people-tree/people-tree.js");

var View = Backbone.View.extend({

	attributes:{
		"class": "people-list-all"
	},

	pageSize: 20,

	initialize: function(option){
		this.option = option.option;
		this.modules = {};
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
		this.$content = this.$el.find(".JS-list-content");
		this.$tabContent = this.$el.find(".JS-tab-content");
		
		this.renderPeople();
		this.renderDepartment();
		this.renderDiscussionGroups();
	},

	renderPeople: function(){
		var that = this;
		this.modules.people = new PeopleTree({
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
							type:"department",
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
		this.$content.append( this.modules.people.$el );
		this.$tabContent.find(".JS-tab-panel[data-id=people]")
			.append( this.modules.people.$el );
	},

	renderDepartment: function(){
		var that = this;
		this.modules.department = new PeopleTree({
			dataFilter: function( response ) {
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				response = JSON.parse( response );
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				var arr = [];
				_.each( response.data, function(obj){
					arr.push( {
						id: obj.id,
						name: obj.name,
						avatar: obj.avatar,
						type:"department",
						isParent: obj.children_count ? true: false
					});
				});

				response.data = arr;
				return JSON.stringify( response );
			},
			isPaging: true,
			enableSelectParent: true,
			createUrl: function(data, $node, view){
				return global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +
					 "/departments?parent="+data.id
			},
			selectedList: this.selectedList
		});
		this.$tabContent.find(".JS-tab-panel[data-id=department]")
			.append( this.modules.department.$el );
	},

	renderDiscussionGroups: function(){
		var that = this;
		this.modules.discussionGroup = new PeopleTree({
			dataFilter: function( response ) {
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				response = JSON.parse( response );
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				var list = [];
				_.each(response.data, function(obj){
					list.push({
						id:obj.id,
						name:obj.name,
						avatar: obj.avatar,
						type:"discussionGroup"
					});
				});

				response.data = list;
				return JSON.stringify(response);
			},
			isPaging: true,
			createUrl: function(data, $node, view){
				return global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +  
				"/members/" + global.data.user.get("id") +
				"/discussion_groups?normal=1"
			},
			selectedList: this.selectedList
		});
		this.$tabContent.find(".JS-tab-panel[data-id=discussionGroup]")
			.append( this.modules.discussionGroup.$el );
	},

	initEvent: function(){
		var that = this;

		this.$error.on("click", function(){
			that.fetchRoot();
		});

		// this.listenTo( this.modules.people, "select", function(obj) {
		// 	that.selectedList.add(obj);
		// });

		// this.listenTo( this.modules.people, "unselect", function(obj) {
		// 	that.selectedList.remove(  that.selectedList.modelId(obj) );
		// });

		// this.listenTo( this.modules.department, "select", function(obj) {
		// 	that.selectedList.add(obj);
		// });

		// this.listenTo( this.modules.department, "unselect", function(obj) {
		// 	that.selectedList.remove(that.selectedList.modelId(obj));
		// });

		// this.listenTo( this.modules.discussionGroup, "select", function(obj) {
		// 	that.selectedList.add(obj);
		// });

		// this.listenTo( this.modules.discussionGroup, "unselect", function(obj) {
		// 	that.selectedList.remove(that.selectedList.modelId(obj));
		// });

		// this.listenTo( this.selectedList, "add", function(model){
		// 	var obj = model.toJSON();
		// 	if ( obj.type === "people" ) {
		// 		that.modules.people.select(obj);
		// 	} else if ( obj.type === "department" ){
		// 		that.modules.department.select(obj);
		// 	} else if ( obj.type === "discussionGroup" ) {
		// 		that.modules.discussionGroup.select(obj);
		// 	}
			
		// } );

		// this.listenTo( this.selectedList, "remove", function(model){
		// 	var obj = model.toJSON();
		// 	if ( obj.type === "people" ) {
		// 		that.modules.people.unselect(obj);
		// 	} else if ( obj.type === "department" ){
		// 		that.modules.department.unselect(obj);
		// 	} else if ( obj.type === "discussionGroup" ) {
		// 		that.modules.discussionGroup.unselect(obj);
		// 	}
		// } );

		this.initTabEvent();
	},

	initTabEvent: function(){
		var that = this;

		this.$tabNav = this.$el.find(".JS-tab-nav");
		this.$tabNav.on("click", "li", function(){
			var id = $(this).data("id");
			that.$tabNav.find("li").removeClass("active");
			$( this ).addClass("active");
			that.$tabContent.find(".JS-tab-panel").hide();
			that.$tabContent.find(".JS-tab-panel[data-id="+id+"]").show();
		});
	},

	setRootData: function( option ) {

		this.modules.people.loadData([{
			name: option.name,
			id: option.id,
			avatar: option.avatar,
			type:"department",
			isParent: true
		}]);
		this.modules.people.openRoot();
		this.modules.department.loadData([{
			name: option.name,
			id: option.id,
			type:"department",
			avatar: option.avatar,
			isParent: true
		}]);
		this.modules.department.openRoot();
		this.modules.discussionGroup.loadData([{
			id:0,
			name: "讨论组",
			isParent: true
		}]);
		this.modules.discussionGroup.openRoot();
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
		this.$content.hide();

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
				that.setRootData( rootData );
				that.$content.show();
				
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
		this.modules.people.destroy();
		this.remove();
	}
});

module.exports = View;