var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	ItemView = require("./item/item.js");

var View = Backbone.View.extend({

	tagName:"ul",

	attributes: {
		class: "set-email-list"
	},

	pageSize: 30,

	initialize: function() {
		this.list = new Backbone.Collection();
		this.itemViews = [];//缓存列表项实例
		this.render();
		this.initListEvent();
		this.initScrollEvent();
		this.initOkEvent();
	},

	render: function() {
		this.$el.append(__inline("email-list.html"));
		this.$list = this.$el.find("ul");
		this.$empty = this.$el.find(".JS-empty");
		this.$okBtn = this.$el.find(".JS-ok");

		this.$error=this.$el.find(".JS-error");
        this.$errorBtn=this.$error.find(".JS-btn")

		this.$loading=this.$el.find(".JS-loading");
		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$moreError = this.$el.find(".JS-more-error");
		this.$noMore = this.$el.find(".JS-no-more");
	},

	// 初始化list事件
	initListEvent: function() {
		var that = this;

		this.listenTo(this.list, "add", that.addItem);
		this.listenTo(this.list, "remove", this.removeItem);

		this.listenTo(this.list, "reset", function(models, options) {
			_.each(options.previousModels, function(model) {
				that.removeItem(model);
			});

			that.list.each(function(model) {
				that.addItem(model);
			});

			if ( that.list.length === 0 ) {
				that.$okBtn.hide();
			} else {
				that.$okBtn.show();
			}
		});

		this.listenTo(this.list, "add reset remove destroy", function(){
			if ( that.list.length === 0 ) {
				that.$empty.show();
				that.$list.hide();
			} else {
				that.$list.show();
				that.$empty.hide();
			}
		});

        this.$errorBtn.on("click",function(){
            that.load(that.id)
        });
	},

	initScrollEvent: function(){
		var that = this;
		var moreHeight;
		this.$list.on("scroll", function(event) {
	
			if (that.noMore) {
				return;
			}

			// 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
			if ( that.$list.scrollTop() === 0 ) {
				return;
			}

			var height = that.$list.height();
			moreHeight = moreHeight || that.$moreLoading.height();


			if (this.scrollTop + that.$list.height() + moreHeight >= this.scrollHeight) {
				that.loadMore();
			}
		});

		this.$moreError.on("click", function(){
			that.loadMore();
		});
	},

	initOkEvent: function(){
		var that = this;

		this.$okBtn.on("click", function(){
			var changes = [],
                wrongItem=[];

            _.each( that.itemViews, function(itemView) {
                if ( !itemView.verify()) {
                    wrongItem.push( itemView );
                }
            });

            if(wrongItem.length>0){
                return
            }

			_.each( that.itemViews, function(itemView) {
				if ( itemView.isChange()) {
					changes.push( itemView );
				}
			});

			if ( changes.length === 0 ) {
				point.shortShow({
					text:"没有任何修改"
				});

				return;
			}

			changeEamil(changes);
		});

		var changing = false;
		function changeEamil(itemViews){
			if ( changing ) {
				return;
			}
			changing = true;
			point.show({
				type:"loading",
				text:"正在设置..."
			});
			var data = [];
			_.each(itemViews, function(itemView){
				data.push(itemView.get())
			});

			return $.ajax({
				url: global.baseUrl + "/orgs/"+global.data.org.get("id")+"/members",
				type:"PATCH",
				data: JSON.stringify( data ),
				success: function(response){
					if ( response.errcode === 0 ) {
						handlerResponse(response.data, data, itemViews);
					} else {
						point.shortShow({
							type:"error",
							text: global.tools.getErrmsg(response.errcode)
						});
						return;
					}
				},

				error: function(){
					point.shortShow({
						type:"error",
						text:"网络异常，请稍后重试"
					});
				},

				complete: function(){
					changing = false;
				}
			});
		}

		function handlerResponse(responseData, arr, itemViews) {
			var errNum = 0;
			_.each( responseData, function(data, i){
				if( data.errcode === 0 ) {
					itemViews[i].updateModel()
					itemViews[i].hideInfo()
				} else {
					errNum++;
					itemViews[i].showInfo( global.tools.getErrmsg(data.errcode));
				}
			});

			if ( errNum > 0 ) {
				point.shortShow({
					type:"error",
					text:"邮件设置失败"
				});
			} else {
				point.shortShow({
					type:"success",
					text:"邮件地址修改成功"
				});
			}
		}
	},

	load:function(id){
		var that = this;
		this.id=id

		this.$empty.hide()
		this.$error.hide();
		this.$list.hide();
		this.$loading.show();

		this.ajaxObj && this.ajaxObj.abort();

		return this.ajaxObj = $.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
			"/departments/"+that.id+"/members?direct_in=1&detail=2&page=1&count="+that.pageSize,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					that.$list.show();
					that.set( response.data, that.id);

				} else {
					var text = global.tools.getErrmsg( response.errcode );
					that.$error.find(".JS-text").html(text);
					that.$error.show();
				}
				that.$loading.hide();
			},

			error: function(jqXHR, status){
				if ( status === "abort" ) {
					return;
				}
				var text = "网络异常，请稍后重试";
				that.$error.find(".JS-text").html(text);
				that.$error.show();
				that.$loading.hide();
			},

			complete: function(){
				that.ajaxObj = null;
			}
		});
	},

	loadMore: function(){
		var that = this;

		if ( this.loadMoring ) {
			return;
		}
		this.loadMoring = true;
		this.showMoreLoading();

		return $.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/departments/"+that.id+"/members?direct_in=1&detail=2&page="+
				(that.page + 1)+"&count=" + that.pageSize,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					that.page++;
					that.list.set( response.data , {
						remove: false
					});
					if ( response.data.length < that.pageSize ) {
						that.showNoMore();
						that.noMore = true;
					} else {
						that.showMoreLoading();
						that.noMore = false;
					}
				} else {
					point.shortShow({
						type:"error",
						text: global.tools.getErrmsg( response.errcode )
					});
					that.showMoreError();
				}
			},

			error: function(jqXHR, status){
				point.shortShow({
					type:"error",
					text:"网络异常，请稍后重试"
				});
				that.showMoreError();
			},

			complete: function(){
				that.loadMoring = false;
			}
		})
	},

	// 根据ID获取列表项
	getItem: function(id){
		var view = _.find( this.itemViews, function( view ) {
			return id === view.model.get("id");
		});

		return view;
	},

	// 添加列表项
	addItem: function(model, collection, options) {
		var view = new ItemView({
			model: model
		});

		options = options || {};

		if ( options.at !== undefined ) {
			if ( options.at === 0 ) {
				this.$list.prepend(view.$el);
				this.itemViews.unshift(view);
			} else {
				var id = collection.at(options.at - 1).get("id"),
					itemview = this.getItem(id);
				itemview.$el.after(view.$el);
				this.itemViews.splice( options.at, 0, view );
			}
		} else {
			// this.$list.append(view.$el);
			this.$moreLoading.before(view.$el);
			this.itemViews.push(view);
		}
	},

	// 删除列表项
	removeItem: function(model){
		var view = this.getItem(model.get("id")),
			that = this;

		if ( !view ) {
			return;
		}
		view.destroy();

		_.find( this.itemViews, function(itemView, index){
			if ( itemView === view ) {
				that.itemViews.splice(index, 1);
				return true;
			}
		});
	},

	// 根据id，加载数据
	set: function(data, id){
		this.id = id;
		this.page = 1;
		if ( data.length < this.pageSize ) {
			this.$moreLoading.hide();
			this.$moreError.hide();
			this.$noMore.hide();
			this.noMore = true;
		} else {
			this.showMoreLoading();
			this.noMore = false;
		}
		this.list.reset( data );
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	hideAllInfo:function(){
		var that=this
		_.each(that.itemViews,function(view){
			view.hideInfo()
		})
	},

	showMoreError: function(){
		this.$moreLoading.hide();
		this.$moreError.show();
		this.$noMore.hide();
	},

	showMoreLoading: function(){
		this.$moreLoading.show();
		this.$moreError.hide();
		this.$noMore.hide();
	},

	showNoMore: function(){
		this.$moreLoading.hide();
		this.$moreError.hide();
		this.$noMore.show();
	},

	destroy: function(){
		this.list.reset([]);
		this.remove();
	}
});

module.exports = View;

