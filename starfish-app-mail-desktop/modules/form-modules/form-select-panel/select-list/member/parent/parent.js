var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Node = require("../node/node.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "form-select-parent JS-parent"
	},

	tagName:"li",

	template: __inline("parent.tmpl"),

	pageSize: 30,

	initialize: function(option) {
		this.parentView = option.parentView;
		this.selectedList = option.selectedList;
		this.render();
		this.initEvent();
	},

	render: function() {
		var obj = this.model.toJSON();

		this.$el.html( this.template(obj) );
		this.$list = this.$el.find("ul");
		this.$hd = this.$el.find(".JS-group-hd");
		this.$moreError = this.$el.find(".JS-more-error");
		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$loadMore = this.$el.find(".JS-load-more");
		this.$noMore = this.$el.find(".JS-no-more");
	},

	initEvent: function() {
		var that = this;

		this.$hd.on("click", function(){
			// 如果没有children， 则返回
			if ( that.model.get("children_count") === 0 && that.model.get("all_members_count") === 0) {
				return;
			}

			// 如果that.page存在， 说明已经加载过了
			if ( that.page ) {

				that.$el.toggleClass("open");
				return;
			}

			// 加载children
			that.load().success(function(response){
				if ( response.errcode === 0 ) {
					that.$el.addClass("open");
				}
			});
		});

		this.$loadMore.on("click", function(){
			that.loadMore();
		});

		this.$moreError.on("click", function(){
			that.loadMore();
		});
	},

	open: function(){
		var that = this;
		if ( this.page || (this.model.get("children_count") === 0)) {
			return;
		}

		this.load().success(function(response){
			if ( response.errcode === 0 ) {
				that.$el.addClass("open");
			}
		});
	},

	load: function(){
		var that = this;
		if ( this.loading ) {
			return;
		}
		this.loading = true;
		this.$el.addClass("state-loading");

		return $.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/departments/"+this.model.get("id")+"/items?page=1&count=" + this.pageSize,
			type:"GET",
			dataFilter: function(response){
				response = JSON.parse(response);
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				var arr = [];
				_.each( response.data, function(data){
					if ( data.item_type === 1 ) {
						data.item.type = "department";
						arr.push( data.item )
					} else {
						data.item.type = "member";
						arr.push( data.item )
					}
				});

				response.data = arr;
				response = JSON.stringify(response);
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				return response;
			},

			success: function(response){
				if ( response.errcode === 0 ) {
					that.page = 1;
					that.addChildren( response.data );
					if ( response.data.length < that.pageSize ) {
						that.hideLoadMore();
					} else {
						that.showLoadMore();
					}
				} else {
					point.shortShow({
						type:"error",
						text: global.tools.getErrmsg(response.errcode)
					});
				}
			},

			error: function(){
				point.shortShow({
					type:"error",
					text: "加载失败，请检查网络"
				});
			},

			complete: function(){
				that.$el.removeClass("state-loading");
				that.loading = false;
			}
		});
	},

	loadMore: function(){
		var that = this;
		if ( this.loadMoring ) {
			return;
		}
		this.loadMoreing = true;

		that.showMoreLoading();

		return $.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/departments/"+this.model.get("id")+"/items?page="+
				(this.page + 1)+"&count=" + this.pageSize,
			type:"GET",
			dataFilter: function(response){
				response = JSON.parse(response);
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				var arr = [];
				_.each( response.data, function(data){
					if ( data.item_type === 1 ) {
						data.item.type = "department";
						arr.push( data.item )
					} else {
						data.item.type = "member";
						arr.push( data.item )
					}
				});

				response.data = arr;
				response = JSON.stringify(response);
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				return response;
			},
			success: function(response){
				if ( response.errcode === 0 ) {
					that.page++;
					that.addChildren( response.data );
					if ( response.data.length < that.pageSize ) {
						that.showNoMore();
					} else {
						that.showLoadMore();
					}
				} else {
					that.showMoreError();
					point.shortShow({
						type:"error",
						text: global.tools.getErrmsg(response.errcode)
					});
				}
			},

			error: function(){
				that.showMoreError();
				point.shortShow({
					type:"error",
					text: "加载失败， 请检查网络"
				});
			},

			complete: function(){
				that.loadMoring = false;
			}
		});
	},

	addChildren: function(list){
		var that = this;
		_.each(list, function(data){
			var itemView;
			if ( data.type === "department" ) {
				itemView = new View({
					model: new Backbone.Model(data),
					parentView: that.parentView,
					selectedList: that.selectedList
				});
			} else {
				itemView = new Node({
					model: new Backbone.Model(data),
					parentView: that.parentView,
					selectedList: that.selectedList
				});
			}
			
			that.$list.append( itemView.$el );
		});
	},

	showLoadMore: function(){
		this.$loadMore.show();
		this.$moreLoading.hide();
		this.$moreError.hide();
		this.$noMore.hide();
	},

	showMoreLoading: function(){
		this.$loadMore.hide();
		this.$moreLoading.show();
		this.$moreError.hide();
		this.$noMore.hide();
	},

	showMoreError: function(){
		this.$loadMore.hide();
		this.$moreLoading.hide();
		this.$moreError.show();
		this.$noMore.hide();
	},

	hideLoadMore: function(){
		this.$loadMore.hide();
		this.$moreLoading.hide();
		this.$moreError.hide();
		this.$noMore.hide();
	},

	showNoMore: function(){
		this.$loadMore.hide();
		this.$moreLoading.hide();
		this.$moreError.hide();
		this.$noMore.show();
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}
	
});

module.exports = View;