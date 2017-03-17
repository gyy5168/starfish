var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "common-panel"
	},

	title:"没有标题",

	content:"",

	initialize: function(){
		this.render();
		this.initEvent();
	},

	render: function(){
		this.$el.html(__inline("panel.html"));
		this.$panelTitle = this.$el.find(".JS-panel-title");
		this.$panelBd = this.$el.find(".JS-panel-bd");
		this.$panelClose = this.$el.find(".JS-panel-close");
		this.$el.addClass("common-panel");

		this.$panelTitle.html( this.title );
		this.$panelBd.html( this.content );
		global.$doc.append(this.$el);
	},

	initEvent: function(){
		var that = this;

		this.$panelClose.on("click", function(){
			that.hide();
		});

		this.$el.on("click", function(event){
			event.stopPropagation();
		});

		this.panelDocHandle = function(){
			that.hide();
		}

		$(document).on("click.panel", this.panelDocHandle);
	},

	setTitle: function(title){
		this.$panelTitle.html( title );
	},

	setContent: function($node){
		this.$panelBd.html("");
		this.$panelBd.append( $node );
	},

	appendContent: function($node){
		this.$panelBd.append( $node );
	},

	// 设置位置, 防止超出DOM
	setPosition: function(option) {
		var left = option.left,
			top = option.top,
			right = option.right,
			bottom = option.bottom,
			width = this.$el.outerWidth(),
			height = this.$el.outerHeight(),

			parentWidth = global.$doc.width(),
			parentHeight = global.$doc.height();

		// 相对边界的距离
		var borderDistance = 20;

		if ( left && (left + width > parentWidth) ) {
			option.left = parentWidth - width - borderDistance;
		}

		if ( right && ( right + width > parentWidth )) {
			option.right = parentWidth - width - borderDistance;
		}

		if ( top && ( top + height > parentHeight )) {
			option.top = parentHeight - height - borderDistance
		}

		if ( bottom && ( bottom + height > parentHeight )) {
			option.bottom = parentHeight - height - borderDistance;
		}

		this.$el.css( option );
	},

	set: function(option){
		if ( !option ) {
			return;
		}
		if ( option.css ) {
			this.setPosition( option.css );
		}
	},

	toggle: function(option){
		var display = this.$el.css("display");
		if ( !display || display === "none" ) {
			this.show();
			this.set(option);
		} else {
			this.hide();
		}
	},

	show: function(){
		this.$el.show();
		this.trigger("show");
	},

	hide: function(){
		this.$el.hide();
		this.trigger("hide");
	},

	destroy: function(){
		$(document).off("click.panel", this.panelDocHandle);
		this.remove();
	}
});

module.exports = View;