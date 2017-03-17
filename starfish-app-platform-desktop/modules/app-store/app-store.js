var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	ItemView = require("./item/item.js");

var View = Backbone.View.extend({

	attributes: {
		class: "app-store"
	},

	initialize: function() {

		this.list = new Backbone.Collection();
		this.render();
		this.initEvent();
		this.loadData();
	},

	render: function() {
		this.$el.html(__inline("app-store.html"));
		this.$content = this.$el.find(".JS-content");
		this.$loading = this.$el.find(".JS-loading");
		this.$empty = this.$el.find(".JS-empty");
		this.$error = this.$el.find(".JS-error");
		this.$list = this.$content.find("ul");
		$("#wraper").append( this.$el );
	},

	initEvent: function() {
		var that = this;

		this.listenTo( this.list, "add remove reset", function(){
			if ( that.list.length === 0 ) {
				that.$empty.show();
				that.$content.hide();
			} else {
				that.$content.show();
				that.$empty.hide();
			}
		});

		this.listenTo( this.list, "add", this.addItem);
		this.listenTo( this.list, "remove", this.removeItem);

		this.listenTo( this.list, "reset", function(models, option){
			$.each(option.previousModels, function( index, model) {
				that.removeItem(model);
			});

			that.list.each(function(model){
				that.addItem(model);
			});
		});

		this.$error.find(".JS-btn").on("click", function(){
			that.loadData();
		});
	},

	addItem: function(model){
		var itemView = new ItemView({
			model: model
		});
		this.$list.append(itemView.$el);
	},

	removeItem: function(model){
		var cid = model.cid;

		var itemView = this.$list.find("li[data-cid="+cid+"]").data("view");
		itemView.destroy();
	},

	loadData: function(){
		if ( this.loading ) {
			return;
		}

		this.loading = true;

		this.clear();
		this.$loading.show();

		var that = this;

		this.ajaxObj = $.ajax({
			url: global.data.org.get("domain")  + "/orgs/"+ global.data.org.get("id") +"/apps/global",
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					var data = handle(response.data);
					that.list.reset(data);
					that.$content.show();
				} else {
					that.$error.show();
				}
			},

			error: function(){
				that.$error.show();
			},

			complete: function(){
				that.$loading.hide();
				that.loading = false;
				that.ajaxObj = null;
			}
		});


		// 根据安装应用列表的数据，为所有应用列表添加是否安装属性
		function handle(arr){
			var result = [],
				cache = {};

			$.each( arr, function(index, obj){
				cache[obj.app] = true;
			});

			$.each(global.allApps, function(index, obj) {
				var data = $.extend({}, obj);
				if ( cache[data.id] ) {
					data.installed = 1;
				} else {
					data.installed = 0;
				}
				result.push(data);
			});

			return result;
		}
	},

	clear: function(){
		this.$content.hide();
		this.$loading.hide();
		this.$error.hide();
		this.$empty.hide();
	},

	destroy: function(){
		this.list.reset([]);
		this.remove();
	}
	
});

module.exports = View;