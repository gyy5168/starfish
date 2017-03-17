var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js"),
	point = require("modules-common/point/point.js"); 

var View = Backbone.View.extend({
	tagName:"ul",
	initialize: function(option) {

		this.render();
		this.initEvent();
		if ( option ) {
			this.set(option);
		}
	},

	render: function() {
		this.$el.html( __inline("role-panel.html"));
	},

	initEvent: function() {
		var that = this;

		this.$el.on("click", "li", function(){
			var value = $(this).data("value");
			that.callback && that.callback(value);
			that.hide();
		});

		// 将回调关联到自身，以便在组件摧毁时移除
		this.docHandle = function(){
			that.hide();
		}
		$(document).on("click.role-panel", this.docHandle);
		
	},

	set: function(option){
		if (option.callback) {
			this.callback = option.callback;
		}

		if ( option.css ) {
			this.$el.css( option.css );
		}
	},

	show: function(option) {
		if ( option ) {
			this.set(option);
		}
		
		if (this.showing) {
			return;
		}
		this.$el.show();
		this.showing = true;
	},

	hide: function() {
		if (this.showing) {
			this.$el.hide();
			this.showing = false;
		}
	},

	destroy: function(){
		$(document).off("click.role-panel", this.docHandle);
		this.remove();
	},

	attributes: {
		class: "role-panel"
	}
});

module.exports = View;