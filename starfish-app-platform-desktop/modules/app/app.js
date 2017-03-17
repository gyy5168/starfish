var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	ItemView = require("./item/item.js");
	// Menu = require("./menu/menu.js");

var View = Backbone.View.extend({

	attributes: {
		class: "app"
	},

	initialize: function() {

		this.list = new Backbone.Collection();
		this.render();
		this.initEvent();
		this.loadData();
	},

	render: function() {
		this.$el.html(__inline("app.html"));
		if ( global.data.org.get("isAdmin")) {
			this.$el.addClass("admin");
		}
		
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

		// this.$list.on("mousedown", "li", function( event ) {

		// 	if ( event.button !== 2 ) {
		// 		return;
		// 	}
		// 	if ( !that.menu ) {
		// 		that.menu = new Menu();
		// 	}
		// 	var view = $( this ).data("view"),
		// 		model = view.model,
		// 		inNav = model.get("inNav"),
		// 		id = model.get("id"),
		// 		shows;

		// 	if ( inNav ) {
		// 		shows = ["removeNav"];
		// 	} else {
		// 		shows = ["addNav"];
		// 	}
		// 	that.menu.set({
		// 		css:{
		// 			left: event.pageX,
		// 			top: event.pageY
		// 		},

		// 		shows: shows,

		// 		data: id
		// 	});
		// 	that.menu.show();
		// });

		this.$error.find(".JS-btn").on("click", function(){
			that.loadData();
		});

		// global.event.on("addNav removeNav", function(data){
		// 	var view = that.$list.find("li[data-id="+data+"]").data("view");
		// 	view.toggleNav();
		// });

		document.oncontextmenu = function(){return false};
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
		this.ajaxObj = $.when($.ajax({
			url: global.data.org.get("domain") + "/orgs/"+ global.data.org.get("id") +"/apps/global",
			type:"GET"
		}), $.ajax({
			url: global.data.org.get("domain")  + "/orgs/"+global.data.org.get("id")+"/members/"+global.data.user.get("id")+"/apps"
		})).done( function(data1, data2){
			var response1 = data1[0],
				response2 = data2[0];

			if ( response1.errcode !== 0 || response2.errcode !== 0 ) {
				that.$error.show();
				return;
			}

			if ( response1.data.length === 0 ) {
				that.$empty.show();
				return;
			}

			var data = handle(response1.data, response2.data);
			fill(data);
			that.list.reset(data);

		}).fail( function(){
			that.$error.show();
		}).always( function(){
			that.$loading.hide();
			that.loading = false;
			that.ajaxObj = null;
		});

		// 根据导航的数据，为应用列表添加是否存在导航属性
		function handle(arr, navArr){
			var cache = {};

			$.each( navArr, function(index, id){
				cache[id] = true;
			});

			$.each( arr, function(index, obj) {
				if ( cache[obj.app] ) {
					obj.inNav = true;
				} else {
					obj.inNav = false;
				}
			});

			return arr;
		}

		// 将app名称、图标、描述数据填进去
		function fill(arr) {
			$.each( arr, function(index, obj) {
				$.each(global.allApps, function(index2, data) {
					if ( obj.app === data.id ) {
						arr[index] = $.extend(obj, data);
						return false;
					}
				});
			});
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