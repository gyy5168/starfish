var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Uri = require("modules-common/uri/uri.js"),
	TreeNode = require("../tree-node/tree-node.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	tagName:"li",

	template: __inline("tree-parent.tmpl"),

	attributes: {
		"class":"group JS-group"
	},

	initialize: function(option, setting){
		this.option = option;
		this.setting = setting;
		this.selectedList = this.setting.selectedList;
		this.render();
		this.initEvent();

		// if ( this.model.get("children") ) {
		// 	this.addChildren(this.model.get("children") );
		// }
	},

	render: function(){
		var obj = this.model.toJSON();

		obj.enableSelectParent = this.setting.enableSelectParent || false;

		this.$el.html(this.template(obj));

		// 根据节点的数据和选中的列表来判断是否选中节点
		if ( this.setting.enableSelectParent) {
			var model = this.selectedList.get( this.selectedList.modelId(obj) );

			if ( model ){
				this.$el.addClass("selected");
			}
		}

		this.$el.attr("data-id", this.selectedList.modelId( obj ));

		this.$loadMore = this.$el.find(">.JS-group-bd>.JS-load-more");
		this.$moreLoading = this.$el.find(">.JS-group-bd>.JS-more-loading");
		this.$moreError = this.$el.find(">.JS-group-bd>.JS-more-error");
		
		this.$el.data("view", this);
	},

	initEvent: function(){
		var that = this;

		// 点击加载更多数据
		this.$loadMore.on("click", function(event){
			that.fetchMoreData();
			event.stopPropagation();
		});

		this.$moreError.on("click", function(event){
			that.fetchMoreData();
			event.stopPropagation();
		});
		
		this.$el.find(">.JS-group-hd>.JS-arrow").on("click", function(event){
			if ( that.setting.createUrl && !that.fetchDataed ) {
				that.fetchData();
			} else {
				that.$el.toggleClass("open");
			}
			event.stopPropagation();
		});

		if ( this.setting.enableSelectParent ) {
			this.$el.on("click", function(){
				var obj = that.model.toJSON();
				var model = that.selectedList.get( that.selectedList.modelId(obj) );
				if ( model ) {
					if (!that.setting.onlySelect) {
						that.selectedList.remove( model );
					}
				} else {
					that.selectedList.add( that.model );
				}
			});
		}
		
		this.$el.on("click", function(event){
			event.stopPropagation();
		});
		
	},

	fetchData: function(){
		var that = this,
			url;

		if ( this.fetchDataing ) {
			return;
		}

		this.fetchDataing = true;

		this.$el.addClass("loading");

		url = this.setting.createUrl( this.model.toJSON(), this.$el, this);

		if ( this.setting.isPaging ) {
			var uri = new Uri(url).replaceQueryParam("page", 1)
			 	.replaceQueryParam("count", this.setting.pageSize);
			url = uri.toString();
		}
		
		return $.ajax({
			url: url,
			type: "get",
			dataFilter: this.setting.dataFilter,
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				that.addChildren( response.data );
				that.page = 1;

				if ( that.setting.isPaging ) {
					if ( response.data.length < that.setting.pageSize ) {
						that.noMore = true;
						that.$loadMore.hide();
					} else {
						that.noMore = false;
						that.$loadMore.show();
					}
					
				}
				that.fetchDataed = true;
				that.$el.addClass("open");
			} else {
				point.shortShow({
					type:"error",
					text:"加载失败，错误码： " + response.errcode
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
			that.$el.removeClass("loading");
			that.fetchDataing = false;
		}
	},

	fetchMoreData: function(){
		var that = this,
			url;

		if ( this.fetchMoreDataing ) {
			return;
		}

		this.fetchMoreDataing = true;

		url = this.setting.createUrl( this.model.toJSON(), this.$el, this);

		var uri = new Uri(url).replaceQueryParam("page", this.page + 1)
			 	.replaceQueryParam("count", this.setting.pageSize);
		url = uri.toString();

		this.$loadMore.hide();
		this.$moreLoading.show();
		this.$moreError.hide();
		
		return $.ajax({
			url: url,
			type: "get",
			dataFilter: this.setting.dataFilter,
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				that.addChildren( response.data );
				that.page++;
			
				if ( response.data.length < that.setting.pageSize ) {
					that.noMore = true;
					that.$loadMore.hide();
				} else {
					that.noMore = false;
					that.$loadMore.show();
				}
				
			} else {
				point.shortShow({
					type:"error",
					text:"加载失败，错误码： " + response.errcode
				});

				that.$moreError.show();
			}
		}

		function error(){
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
			});
			that.$moreError.show();
		}

		function complete(){
			that.$moreLoading.hide();
			that.fetchMoreDataing = false;
		}
	},

	isParent: function(){
		return true;
	},

	addChildren: function(list){
		var that = this,
			$list = this.$el.find(">.JS-group-bd>ul");

		_.each( list, function(obj){
			var view;
			if ( obj.isParent ) {
				view = new View({
					model: new Backbone.Model(obj)
				}, that.setting);
			} else {
				view = new TreeNode({
					model: new Backbone.Model( obj )
				}, that.setting);
			}

			$list.append(view.$el);
		});
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}
});

module.exports = View;