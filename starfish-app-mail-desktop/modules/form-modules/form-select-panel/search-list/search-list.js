var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js");

var List = Backbone.Collection.extend({
	modelId: function( attrs ) {
		return attrs.type +""+ attrs.id;
	}
});

var View = Backbone.View.extend({

	attributes: {
		"class": "form-search-list"
	},

	pageSize: 30,

	template: __inline("item.tmpl"),

	initialize: function(option) {
		this.selectedList = option.selectedList;
		this.list = new List();
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("search-list.html"));

		this.$list = this.$el.find("ul");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");
		this.$empty = this.$el.find(".JS-empty");
	},

	initEvent: function() {
		var that = this;

		this.listenTo( this.list, "reset", function(option){
			that.$list.find(".JS-item").remove();

			that.list.each(function(model){
				that.addItem(model);
			});

			if( that.list.length === 0 ) {
				that.$empty.show();
				that.$list.hide();
			} else {
				that.$empty.hide();
				that.$list.show();
			}
		});

		this.listenTo( this.selectedList, "add", function(model){
			var id = that.selectedList.modelId( model.toJSON() );
			that.$list.find(".JS-item[data-id="+id+"]").addClass("selected");
		});

		this.listenTo( this.selectedList, "remove", function(model){
			var id = that.selectedList.modelId( model.toJSON() );
			that.$list.find(".JS-item[data-id="+id+"]").removeClass("selected");
		});

		this.$list.on("click", "li", function(){
			var id = $(this).data("id"),
				isSelected = that.selectedList.get(id);

			if ( isSelected ) {
				that.selectedList.remove(id);
			} else {
				that.selectedList.add( that.list.get(id) );
			}
		});

		this.$error.on("click", function(){
			that.search( that.value);
		});

		this.listenTo(this.list, "add", this.addItem);
	},

	search: function(value){
		this.value = value;
		this.showLoading();
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
				"/search?q="+value+"&type=100&page=1&count=30",
			type:"GET",
			dataFilter: function(response){
				response = JSON.parse(response);
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				var arr = [];
				_.each(response.data.data, function(data){
					if ( data.type === 101 ) {
						data.source.type = "member";
					} else if ( data.type === 102 ) {
						data.source.type = "group";
					} else if ( data.type === 103 ) {
						data.source.type = "department";
					}

					arr.push( data.source );
				});

				response.data = arr;

				response = JSON.stringify(response);
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				
				return response;
			},
			
			success: function(response){
				if ( response.errcode === 0 ) {
					that.list.reset(response.data);
					that.showList();
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
					text:"请检查网络"
				});
			},

			complete: function(){
				that.ajaxObj = null;
			}
		});
	}, 800, {leading: false} ),

	addItem: function(model){
		var obj = model.toJSON(),
			id = this.selectedList.modelId(obj),
			isSelected = this.selectedList.get(id);

		obj.uuid = id;
		var	$node = $(this.template(obj));

		if ( isSelected ) {
			$node.addClass("selected");
		}
		this.$list.append($node);
	},

	showLoading: function(){
		this.$loading.show();
		this.$error.hide();
		this.$list.hide();
	},

	showError: function(){
		this.$loading.hide();
		this.$error.show();
		this.$list.hide();
	},

	showList: function(){
		this.$loading.hide();
		this.$error.hide();
		this.$list.show();
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
	
});

module.exports = View;