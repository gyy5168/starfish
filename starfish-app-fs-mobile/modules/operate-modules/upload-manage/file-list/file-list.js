var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/zepto/zepto.js"),
    file = require("modules-common/file/file.js"),
	ItemView = require("./item-view/item-view.js");

var uploadList = global.data.uploadList || (global.data.uploadList = new Backbone.Collection());

var View = Backbone.View.extend({

	attributes: {
		class: "file-list"
	},

	initialize: function() {
		this.itemViews = [];//缓存列表项实例
		this.render();
		this.initListEvent();

		var that = this;
		uploadList.each(function(model){
			that.addItem(model);
		});

		if ( uploadList.length !== 0 ) {
			// 很奇怪， 这里调用show方法， 没有效果
			that.$list.css("display", "block");
			// that.$list.show();
			that.$empty.hide();
		}

	},

	render: function() {
		this.$el.append(__inline("file-list.html"));
		this.$list = this.$el.find(".JS-list");
		this.$empty = this.$el.find(".JS-empty");
	},

	// 初始化list事件
	initListEvent: function() {
		var that = this;

		this.listenTo(uploadList, "add", that.addItem);
		this.listenTo(uploadList, "remove", this.removeItem);

		this.listenTo(uploadList, "reset", function(models, options) {
			_.each(options.previousModels, function(model) {
				that.removeItem(model);
			});

			uploadList.each(function(model) {
				that.addItem(model);
			});
		});

		this.listenTo(uploadList, "add reset remove destroy", function(){
			if ( uploadList.length === 0 ) {
				that.$empty.show();
				that.$list.hide();
			} else {
				that.$list.show();
				that.$empty.hide();
			}
		});
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

	// 清除所有完成的
	clearSuccess: function(){
		var arr = [];
		uploadList.each( function(model){
			if ( model.get("state") === "success" ) {
				arr.push(model);
			}
		});
		_.each( arr, function(model) {
			uploadList.remove( model );
		});
	},

	clearAll: function(){
        uploadList.each(function(model){
            file.cancelUpload({
                uuid: model.get("uuid")
            });
        })
        uploadList.reset([]);
	},

	get: function(){

	},

	destroy: function(){
		this.remove();
	}
	
});


module.exports = View;

