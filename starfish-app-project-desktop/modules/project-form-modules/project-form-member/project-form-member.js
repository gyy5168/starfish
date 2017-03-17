var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	_ = require("modules-common/underscore/underscore.js"),
	peopleTool = require("modules-common/tools/people.js"),
	PeopleSelect = require("modules-common/people-select-organization/people-select-organization.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	template:__inline("project-form-member.tmpl"),

	attributes: {
		class: "project-form-member"
	},

	pageSize: 30,

	initialize: function(option) {
		option = option || {};
		this.type = option.type || "create";

		this.list = new Backbone.Collection();
		this.render();
		this.hideAllPanel();
		this.initEvent();

		if ( this.type === "create") {
			this.$list.show();
		}
	},

	render: function() {
		this.$el.html(__inline("project-form-member.html"));
		this.$add = this.$el.find(".JS-add-button");
		this.$remove = this.$el.find(".JS-remove-button");
		this.$list = this.$el.find("ul");
		this.$listWraper = this.$el.find(".JS-list-wraper");
		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$moreError = this.$el.find(".JS-more-error");
		this.$noMore = this.$el.find(".JS-no-more");
	},

	initEvent: function() {
		var that = this;

		this.$add.on("click", function( event ){

			var offset = that.$add.offset(),
				left = offset.left,
				top = offset.top + that.$add.height();

			if ( !that.peopleSelect ) {
				that.peopleSelect = new PeopleSelect({
					onlySelect: true  //只能选择， 不能反选
				});

				that.listenTo( that.peopleSelect, "select", function(obj){
					add( obj );
				});

				that.listenTo( that.peopleSelect, "unselect", function( obj ) {
					remove( obj );
				});

				that.listenTo( that.peopleSelect, "hide", function(){
					that.stopListening(that.peopleSelect);
					that.peopleSelect.destroy();
					that.peopleSelect = null;
				});
			}

			that.peopleSelect.toggle({
				css:{
					left:left,
					top:top
				}
			});

			event.stopPropagation();
		});

		this.$remove.on("click", function( event ){
			that.$list.toggleClass("removing");
		});

		this.$list.on("click", ".JS-remove", function(){
			var id = $(this).parent().data("id"),
				data = that.list.get(id).toJSON();
			if ( that.type === "create" ) {
				that.removeData(data);
			} else {
				that.trigger("remove",{
					data:data
				});
			}
		});

		function add(obj){
			if ( that.hasItem(obj.id) ) {
				// point.shortShow({
				// 	text:"该成员已存在"
				// });
				return;
			}

			if ( that.type === "create" ) {
				that.list.unshift(obj);
			} else {
				that.trigger("add", {
					data:obj
				});
			}
		}

		function remove(obj) {
			if ( that.type === "create" ) {
				that.list.remove( obj.id );
			} else {
				that.trigger("remove",{
					data:obj
				});
			}
		}

		this.initErrorEvent();
		this.initScrollEvent();
		this.initListEvent();
	},

	initErrorEvent: function(){
		var that = this;
		this.$error.on("click", function(){
			that.fetchData();
		});

		this.$moreError.on("click", function(){
			that.fetchMoreData();
		});
	},

	initScrollEvent: function(){
		var that = this;
		this.$listWraper.on("scroll", function(){

			if (that.noMore) {
				return;
			}

			var scrollTop = that.$listWraper.scrollTop();
			// 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
			if ( scrollTop === 0 ) {
				return;
			}

			var height = that.$listWraper.outerHeight();

			if (scrollTop + height == this.scrollHeight) {
				that.fetchMoreData();
			}
		});
	},

	initListEvent: function(){
		var that = this;
		this.listenTo( this.list, "add", this.addItem);
		this.listenTo( this.list, "remove", this.removeItem);
		this.listenTo( this.list, "reset", function(collection,option){
			_.each( option.previousModels, function(model){
				that.removeItem( model );
			});

			collection.each(function(model){
				that.addItem(model, "later");
			});
		});
	},

	fetchData: function(){
		var that = this;
		if ( this.fetchDataing ) {
			return;
		}
		this.fetchDataing = true;
		this.$loading.show();
		this.$list.hide();
		this.$error.hide();
		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/"+
				this.projectId+"/members?detail=1&page=1&count=" + this.pageSize,
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ){
				that.$list.show();
				that.list.reset(response.data);
				that.page = 1;

				if ( response.data.length < that.pageSize ) {
					that.noMore = true;
					that.$moreLoading.hide();
				} else {
					that.noMore = false;
					that.$moreLoading.show();
				}
			} else {
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(response.errcode)
				});
			}
		}

		function error(){
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
			});
		}

		function complete(){
			that.$loading.hide();
			that.fetchMoreDataing = false;
		}
	},

	fetchMoreData: function(){
		var that = this;
		if ( this.fetchMoreDataing ) {
			return;
		}
		this.fetchMoreDataing = false;
		this.$moreLoading.show();
		this.$moreError.hide();
		this.$noMore.hide();

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/"+
				this.projectId+"/members?detail=1&page="+(this.page + 1)+"&count=" + this.pageSize,
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				that.page++;

				_.each( response.data, function(obj){
					that.list.add(obj);
				});
				if ( response.data.length < that.pageSize ) {
					that.noMore = true;
					that.$moreLoading.show();
					that.$noMore.show();
				} else {
					that.noMore = false;
					that.$moreLoading.hide();
				}
			} else {
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(response.errcode)
				});
			}
		}

		function error(){
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
			});
		}

		function complete(){
			that.fetchMoreDataing = false;
			that.$moreLoading.hide();
		}
	},

	hasItem: function(id){
		var model = this.list.get(id);
		return !!model;
	},

	addData: function(obj){
		this.list.add( obj );
	},

	unshiftData: function(obj){
		this.list.unshift( obj );
	},

	removeData: function(obj){
		this.list.remove(obj.id);
	},

	addItem: function(model, list, option){
		var data = model.toJSON();

		option = option || {};

		if ( option.at === 0 ) {
			this.$list.prepend(this.template(data));
		} else {
			this.$list.append(this.template(data));
		}
	},

	removeItem: function(model){
		var id = model.get("id");
		this.$list.find("li[data-id="+id+"]").remove();
	},

	hideAllPanel: function(){
		this.$list.hide();
		this.$loading.hide();
		this.$error.hide();
		this.$moreLoading.hide();
		this.$moreError.hide();
		this.$noMore.hide();
	},

	get: function(){
		return this.list.pluck("id");
	},

	set: function(id){
		this.projectId = id;
		this.fetchData();
	},

	clear: function(){
		this.$list.html("");
		this.list.reset([]);
	},

	destroy: function(){
		if ( this.peopleSelect ) {
			this.peopleSelect.destroy();
			this.peopleSelect = null;

		}
		this.$el.removeData();
		this.remove();
	}
});

module.exports = View;