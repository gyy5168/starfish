var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js");


var View = Backbone.View.extend({

	attributes:{
		"class": "search-list"
	},

	onlySelect: false,

	pageSize: 20,

	template: __inline("list-item.tmpl"),

	initialize: function(option){
		this.option = option.option;
		this.selectedList = option.parentView.selectedList;
		var List = Backbone.Collection.extend({
			modelId: this.selectedList.modelId
		});

		this.list = new List();

		this.render();
		this.initEvent();
	},

	render: function(){
		this.$el.html(__inline("search-list.html"));
		this.$list = this.$el.find("ul");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");
		this.$empty = this.$el.find(".JS-empty");
	},

	initEvent: function(){
		var that = this;
		this.$el.on("click", ".JS-item",function(){
			var id = $( this ).data("id"),
				obj = that.list.get(id).toJSON(),
				model = that.selectedList.get( that.selectedList.modelId(obj) );

			if ( model ) {
				// if ( !that.onlySelect ) {
					that.selectedList.remove(model);
				// }

			} else {
				that.selectedList.add(obj);
			}
		});

		this.$error.on("click", function(){
			that.search( that.value );
		});

		this.initListEvent();
	},

	initListEvent: function(){
		var that = this;

		this.listenTo( this.selectedList, "add", function(model){
			var obj = model.toJSON(),
				id = that.list.modelId( obj );

			that.$el.find(".JS-item[data-id="+id+"]").addClass("selected");
		});

		this.listenTo( this.selectedList, "remove", function(model){
			var obj = model.toJSON(),
				id = that.list.modelId( obj );

			that.$el.find(".JS-item[data-id="+id+"]").removeClass("selected");
		});

		this.listenTo( this.list, "add", this.addItem);
		this.listenTo( this.list, "reset", function(models, options){
			that.$list.html("");
			that.list.each( function(model){
				that.addItem( model );
			});
		});
	},

	createSearchUrl: function(value){
		return global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/search?q=" + value +
				"&type=101&page=1&count=" + this.pageSize;
	},

	ajaxDataFilter: function(response){
		return response;
	},

	search: function( value ) {
		this.$loading.show();
		this.$empty.hide();
		this.$list.hide();
		this.$error.hide();

		this.searchThrottle(value);
	},

	searchThrottle: _.throttle(function(value){
		var that = this;
        value = encodeURIComponent(value);
		this.value = value;

		this.$loading.show();
		this.$empty.hide();
		this.$list.hide();
		this.$error.hide();

		this.ajaxObj && this.ajaxObj.abort();
		this.ajaxObj = $.ajax({
			url: this.createSearchUrl(value),
			type:"GET",
			dataFilter: this.ajaxDataFilter,
			success: function(response){
				if (response.errcode === 0 ) {
					var data = response.data;
					if ( data.length === 0 ) {
						that.$empty.show();
					} else {
						that.list.reset( data );
						that.$list.show();
					}
					
				} else {
					that.$error.show();
					point.shortShow({
						text: global.tools.getErrmsg(response.errcode),
						type: 'error'
					});
				}
			},

			error: function(jqXHR, status){
				if ( status === "abort" ) {
					that.ajaxError = "abort";
					return;
				}
				that.ajaxError = "error";
				that.$error.show();
				point.shortShow({
					type:"error",
					text:"网络异常，请检查您的网络设置"
				});
			},

			complete: function(){
				that.ajaxObj = null;
				if ( that.ajaxError !== "abort" ) {
					that.$loading.hide();
				}
				that.ajaxError = "";
			}

		});
	}, 800, {leading: false} ),

	addItem: function(model){
		var obj = model.toJSON();

		obj.id = this.list.modelId( obj );
		obj.className = this.selectedList.get(obj.id) ? "selected" : "";
		this.$list.append( this.template( obj ));
	},

	clear: function(){
		this.$list.html("");
		this.$list.show();
		this.$loading.hide();
		this.$empty.hide();
		this.$error.hide();
		this.value = "";
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = View;