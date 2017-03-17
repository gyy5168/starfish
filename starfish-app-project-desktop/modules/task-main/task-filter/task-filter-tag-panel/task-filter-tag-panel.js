var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	_ = require("modules-common/underscore/underscore.js");

var View = Backbone.View.extend({
	tagName: "div",

	template:__inline("task-filter-tag-panel.tmpl"),

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		var that = this;
		this.$el.html(__inline("task-filter-tag-panel.html"));
		this.$list = this.$el.find("ul");
		this.$empty = this.$el.find(".JS-empty");
		$("#wraper").append(this.$el);
	},

	load: function( list ){
		var that = this;
		this.$list.html("");

		$.each(list, function( index, obj ){
			that.$list.append( that.template(obj) );
		});
	},

	initEvent: function() {
		var that = this;
		this.$list.on("click", "li", function(event){
			var id = $(this).data("id");
			that.callback && that.callback(id);
			// that.hide();
			event.stopPropagation();
		});

		this.$el.on("click", function(event){
			event.stopPropagation();
		});

		this.docHandle = function(){
			that.hide();
		}

		$(document).on("click.task-filter-tag-panel", this.docHandle);
	},

	setCallback: function(fn){
		this.callback = fn;
	},

	set: function( option ){
		this.$el.css({
			left:option.left || 0,
			top: option.top || 0
		});

		if ( option.list ) {
			this.load(option.list );
		}

		this.callback = option.callback;
	},

	toggle: function(option){
		if ( this.showing ) {
			this.hide();
		} else {
			this.show(option);
		}
	},

	show: function( option ){
		if (this.showing){
			return;
		}
		this.set( option );
		this.$el.show();
		this.showing = true;
	},

	hide: function(){
		if ( this.showing ) {
			this.$el.hide();
			this.showing = false;
		}
	},

	destroy: function(){
		$(document).off("click.task-filter-tag-panel", this.docHandle);
		this.$el.remove();
	},

	attributes: {
		class: "task-filter-tag-panel"
	}
});

module.exports = View;