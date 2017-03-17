var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		"class": "modal"
	},

	initialize: function(){
		this._renderModal();
		this._initModalEvent();
	},

	_renderModal: function() {
		// 防止class属性被覆盖
		this.$el.addClass("modal");
		this.$el.html(__inline("modal.html"));
		// this.$title = this.$el.find(".JS-title");
		// this.$content = this.$el.find(".JS-bd");
		this.$el.find(".JS-modal-title").html(this.title || "无标题");
		this.$el.find(".JS-modal-bd").html( this.content || "" );
		$("#wraper").append(this.$el);
	},

	_initModalEvent: function() {
		var that = this;
		this.$el.on("click", ".JS-modal-close", function(){
			that.hide();
		});
	},

	show: function(){
		if ( this.showing ) {
			return;
		}

		// var transition = $.support.transition && that.$element.hasClass('fade');

		// if ( transition)
		this.showing = true;
		// this.showMask();
		this.$el.show();
		this.trigger("show");
	},

	hide: function(){
		if ( this.showing ) {
			this.showing = false;
			this.$el.hide();
			this.trigger("hide");
			// this.hideMask();
		}
	},

	showMask: function(){
		this.$mask = $("<div class='modal-mask'></div>");
		this.$el.before( this.$mask );
	},

	hideMask: function(){
		this.$mask.hide();
		this.$mask.remove();
		this.$mask = null;
	},

	destroy: function(){
		this.remove();
		this.$mask && this.$mask.remove();
	}
});

module.exports = View;