var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "form-select-node JS-node"
	},

	template: __inline("node.tmpl"),

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
		this.$noMore = this.$el.find('.JS-no-more');
		this.$check = this.$el.find(".JS-check");

		var id = this.selectedList.modelId( obj ),
			isSelected = this.selectedList.get(id);

		if ( isSelected ) {
			this.$el.addClass("selected");
		}

		if ( obj.work_mail === "" ) {
			this.$el.addClass("disabled");
		}

		this.$el.attr( "data-id", id );
	},

	initEvent: function() {
		var that = this;

		this.$hd.on("click", function(){
			// 看是否选中
			var id = that.selectedList.modelId( that.model.toJSON()),
				isSelected = that.selectedList.get(id);

			// 如果有children， 就在加载
			if ( that.model.get("children_count") === 0 ) {
				if ( !that.$el.hasClass("disabled") ) {
					// 如果选中的后， 就反选
					if ( isSelected ) {
						that.selectedList.remove(that.model);
					} else {
						that.selectedList.add(that.model);
					}
				}
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

			// if ( !that.$el.hasClass("disabled") ) {
			// 	// 如果选中的后， 就反选
			// 	if ( isSelected ) {
			// 		that.selectedList.remove(that.model);
			// 		return;
			// 	} else {
			// 		that.selectedList.add(that.model);
			// 	}
			// }
			
			// // 如果有children， 就在加载
			// if ( that.model.get("children_count") === 0 ) {
			// 	return;
			// }

			// // 如果that.page存在， 说明已经加载过了
			// if ( that.page ) {
			// 	that.$el.addClass("open");
			// 	return;
			// }

			// // 加载children
			// that.load().success(function(response){
			// 	if ( response.errcode === 0 ) {
			// 		that.$el.addClass("open");
			// 	}
			// });
		});

		this.$check.on("click", function(event){
			var id = that.selectedList.modelId( that.model.toJSON()),
				isSelected = that.selectedList.get(id);

			if ( !that.$el.hasClass("disabled") ) {
				// 如果选中的后， 就反选
				if ( isSelected ) {
					that.selectedList.remove(that.model);
				} else {
					that.selectedList.add(that.model);
				}
			}

			event.stopPropagation();
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
				"/departments?parent="+this.model.get("id")+"&page=1&count=" + this.pageSize,
			type:"GET",
			dataFilter: function(response){
				response = JSON.parse(response);
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				_.each( response.data, function(data){
					data.type = "department";
				});
				response = JSON.stringify(response);
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				return response;
			},

			success: function(response){
				if ( response.errcode === 0 ) {
					that.page = 1;
					that.addChildren( response.data );
					console.log( response.data.length )
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
				"/departments?parent="+this.model.get("id")+"&page="+
				(this.page + 1)+"&count=" + this.pageSize,
			type:"GET",
			dataFilter: function(response){
				response = JSON.parse(response);
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				_.each( response.data, function(data){
					data.type = "department";
				});
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
			var itemView = new View({
				model: new Backbone.Model(data),
				parentView: that.parentView,
				selectedList: that.selectedList
			});
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