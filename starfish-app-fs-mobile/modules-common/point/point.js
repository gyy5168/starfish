var $ = require("modules-common/zepto/zepto.js"),
	Backbone = require("modules-common/backbone/backbone.js");
	
var mask = {
	init: function() {
		this.$el = $("<div class='point-mask'></div>");
		$("#wraper").append(this.$el);
		this.$el.on("touchstart touchmove touchend", function( event ) {
			event.stopPropagation();
		});
	},

	show: function() {
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
	}
};

mask.init();
var point = {
	init: function() {
		this.$el = $(__inline("point.html"));
		this.$text = this.$el.find(".JS-text");
		this.$icon = this.$el.find(".JS-icon");
		$("#wraper").append(this.$el);
	},

	showTime: 3000,

	clearTime: function() {
		if (this.timeFn) {
			clearTimeout(this.timeFn);
			this.timeFn = null;
		}
	},

	clear: function() {
		this.clearTime();
		this.$icon.hide();
		mask.hide();
	},

	show: function( text, type ){
		if ( $.type(text) === "object" ){
			var option = text;
			text = option.text;
			type = option.type;
		}
		this.clearTime();
		if ( type ) {
			this.$icon.attr("class", "point-icon " + type).css("display", "inline-block");
			if( type === "loading" ){
				mask.show();
			} else {
				mask.hide();
			}
		} else {
			mask.hide();
			this.$icon.hide();
		}

		this.$text.html(text);
		this.$el.show();	
	},

	shortShow: function( text, type, time ){
		if ( $.type(text) === "object" ){
			var option = text;
			text = option.text;
			type = option.type;
			time = option.time;
		}
		var that = this;
		this.clearTime();
		mask.hide();
		if ( type ) {
			this.$icon.attr("class", "point-icon " + type).css("display", "inline-block");
		} else {
			this.$icon.hide();
		}

		this.$text.html(text);
		this.$el.show();

		this.timeFn = setTimeout(function() {
			that.hide();
		}, time || this.showTime);
	},

	hide: function() {
		mask.hide();
		this.$el.hide();
	}
};

point.init();

module.exports = point;