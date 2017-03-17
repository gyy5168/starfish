var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	ItemView = require("./item/item.js");

var View = Backbone.View.extend({

	tagName:"ul",

	attributes: {
		class: "set-search-list"
	},

	pageSize: 30,

	initialize: function() {
		this.list = new Backbone.Collection();
		this.itemViews = [];//缓存列表项实例
		this.render();
		this.initListEvent();
		this.initOkEvent();
	},

	render: function() {
		this.$el.append(__inline("search-list.html"));
		this.$list = this.$el.find("ul");
		this.$empty = this.$el.find(".JS-empty");
		this.$loading = this.$el.find(".JS-loading");

		this.$error = this.$el.find(".JS-error");
		this.$errorBtn=this.$error.find(".JS-btn");

		this.$okBtn=this.$el.find(".JS-ok")
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
			that.search(that.value)
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
				if ( itemView.isChange() ) {
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
					return;
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

	search: function(value){
		this.showLoading();
		this.value=value
		this.searchThrottle(value);
	},

	searchThrottle: _.throttle(function(value){
		var that = this;
		
		if ( this.ajaxObj ) {
			this.ajaxObj.abort();
		}

		this.showLoading();
		return this.ajaxObj = $.ajax({
			url:global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/search?q="+value+"&type=101&page=1&count="+that.pageSize,
			type:"GET",
			dataFilter: function(response){
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");

				// response = JSON.parse(response);
				return response;
			},
			
			success: function(response){
				if ( response.errcode === 0 ) {
                    that.$empty.show()
					if(response.data.total===0){
						that.$empty.show();
                        that.$loading.hide();
                        return
					}else{
						var list=[]
						_.each(response.data.data,function(model){
							list.push(model.source)
						});
						that.list.reset(list);
                        that.showList();
					}

				} else {
					that.showError();
					point.shortShow({
						type:"error",
						text:global.tools.getErrmsg(response.errcode)
					});
				}
			},

			error: function( jqHXR, status ){
				if ( status === "abort" ) {
					return;
				}
				that.showError();
				point.shortShow({
					type:"error",
					text:"网络异常，请稍后重试"
				});
			},

			complete: function(){
				that.ajaxObj = null;
			}
		});
	}, 800, {leading: false} ),

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	showLoading: function(){
		this.$list.hide();
		this.$error.hide();
		this.$loading.show();
		this.$empty.hide();
	},

	showError: function(){
		this.$list.hide();
		this.$error.show();
		this.$loading.hide();
		this.$empty.hide();
	},

	showEmpty: function(){
		this.$list.hide();
		this.$error.hide();
		this.$loading.hide();
		this.$empty.show();
	},

	showList: function(){
		this.$list.show();
		this.$error.hide();
		this.$loading.hide();
		this.$empty.hide();
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
			this.$list.append(view.$el);
			// this.$moreLoading.before(view.$el);
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


	destroy: function(){
		this.list.reset([]);
		this.remove();
	}

});

module.exports = View;