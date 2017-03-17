var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js");

var List = Backbone.Collection.extend({
	modelId: function( attrs ) {
		return attrs.type +""+ attrs.id;
	}
});

var FilterPanel = Backbone.View.extend({
	tagName:"ul",

	attributes: {
		class: "form-filter-panel"
	},

	template: __inline("form-filter-panel.tmpl"),

	initialize: function(options) {
		this.list = new List();
		this.selectedList = options.list;
		this.render();
		this.initEvent();
	},

	render: function() {
		
	},

	initEvent: function() {
		var that = this;

		this.listenTo( this.list, "reset", function(){
			that.$el.html("");
			that.list.each(function(model){
				that.addItem(model);
			});

			if ( that.list.length === 0 ) {
				that.hide();
			} else {
				that.show();
			}
		});

		this.$el.on("click", ".JS-filter-item", function(event) {
			event.stopPropagation();
			event.preventDefault();
			that.select();
		});

		this.$el.on("mouseenter", ".JS-filter-item", function(event) {
			var $this = $(this);
			that.selectItem($this);
		});

		this.$el.on("click mousedown", function(event){
			event.stopPropagation();
			event.preventDefault();
		})

		// this.$el.on("click", function(event) {
		// 	event.preventDefault();
		// 	event.stopPropagation();
		// });

		this.docHandle = function(){
			that.hide();
		}

		$(document).on("click.form-filter-panel", this.docHandle);
	},

	select: function(){
		var that = this,
			id = this.$el.find(".selected").data("id"),
			obj = this.list.get(id).toJSON();

		that.trigger("select");
		if ( obj.type !== "group" ) {
			that.selectedList.add(obj);
			that.hide();
			return;
		}

		$.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/discussion_groups/"+obj.id+"/members?detail=2&page=1&count=100",
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					obj.members = response.data;
					that.selectedList.add(obj);
				} else {
					point.shortShow({
						type:"error",
						text:global.tools.getErrmsg(response.errcode)
					});
				}
			},
			error: function(){
				point.shortShow({
					type:"error",
					text:"请检查网络"
				});
			},

			complete: function(){
				that.hide();
			}
		});

	},

	addItem: function(model){
		var obj = model.toJSON(),
			id = this.list.modelId(obj);

		obj.uuid = id;
		if ( obj.work_mail ) {
			obj.text = "&lt;" + obj.work_mail + "&gt;";
		} else {
			obj.text = "";
		}
		
		this.$el.append( this.template(obj) );
	},

	set: function( option ) {
		this.$el.css("top", option.top);	
		this.searchThrottle(option.value);
	},

	searchThrottle: _.throttle(function(value){
		var that = this;
		
		if ( this.ajaxObj ) {
			this.ajaxObj.abort();
		}

		that.hide();

		return this.ajaxObj = $.ajax({
			url:global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/search?q="+value+"&type=100&page=1&count=10",
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
					var data = [];
					_.each( response.data, function(obj) {
						if ( obj.type === "group" || obj.work_mail ) {
							var id = that.selectedList.modelId(obj),
								hasEmail = that.selectedList.get(id);
							if ( !hasEmail ) {
								data.push(obj);
							}
							
						}
					});
					that.list.reset(data);
				} 
			},

			error: function( jqHXR, status ){
			},

			complete: function(){
				that.ajaxObj = null;
			}
		});
	}, 800, {leading: false} ),

	isShow: function(){
		return this.showing;
	},

	getSelected: function() {
		this.$el.find(".selected");
	},

	selectNextItem: function() {
		var $node = this.$el.find(".selected").next();
		if ( $node.length ) {
			this.selectItem( $node );
		}
	},

	selectPrevItem: function() {
		var $node = this.$el.find(".selected").prev();
		if ( $node.length ) {
			this.selectItem( $node );
		}
	},

	selectItem: function($node) {
		if (this.$selected) {
			this.$selected.removeClass("selected");
		}
		this.$selected = $node.addClass("selected");
	},

	show: function() {
		if (this.showing) {
			return;
		}
		this.$el.show();
		this.showing = true;
		this.selectItem( this.$el.find("li:first"));
	},

	hide: function() {
		if (this.showing) {
			this.$el.hide();
			this.showing = false;
		}
	},

	destroy: function(){
		this.remove();
		$(document).off("click.form-filter-panel", this.docHandle);
	}

	
});

module.exports = FilterPanel;