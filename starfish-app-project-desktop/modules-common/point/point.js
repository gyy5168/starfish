var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var Point = Backbone.View.extend({
	attributes: {
		"class": "point"
	},

	showTime: 1500,

	initialize: function(){
		this.$el = null;
	},

	render: function(){
		this.$el = $(__inline("point.html"));
		this.$text = this.$el.find(".JS-text");
		this.$icon = this.$el.find(".JS-icon");
		this.$close = this.$el.find(".JS-close");
		$("#wraper").append(this.$el);
	},

	initEvent: function(){
		var that = this;
		this.$close.on("click", function(){
			that.hide();
		});
	},

	set: function(option){
		this.$el.attr("class", "point " + (option.type || ""));
		this.$text.html(option.text || "没有信息");
	},

	show: function(option){
		if ( !this.$el ) {
			this.render();
			this.initEvent();
		}
		this.set(option);
		this.clearTimeFn();
		this.$el.show();
	},

	shortShow: function(option){
		var that = this;
		this.show(option);
		this.timeFn = setTimeout(function() {
			that.hide();
		}, option.time || this.showTime);
	},

	hide: function(){
		this.clearTimeFn();
		this.$el.hide();
		this.$el.remove();
		this.$el = null;
	},

	clearTimeFn: function(){
		if ( this.timeFn ) {
			clearTimeout(this.timeFn);
			this.timeFn = null;
		}
	},

	destroy: function(){
		this.clearTimeFn();
		this.remove();
		this.$el = null;
	}
});
	
// var point = {
// 	init: function() {
// 		var that = this;
// 		this.$el = $(__inline("point.html"));
// 		this.$text = this.$el.find(".JS-text");
// 		this.$icon = this.$el.find(".JS-icon");
// 		this.$close = this.$el.find(".JS-close");
// 		$("#wraper").append(this.$el);

// 		this.$close.on("click", function(){
// 			that.hide();
// 		});
// 	},

// 	showTime: 1500,

// 	clearTime: function() {
// 		if (this.timeFn) {
// 			clearTimeout(this.timeFn);
// 			this.timeFn = null;
// 		}
// 	},

// 	clear: function() {
// 	},

// 	show: function( option ){
// 		// 修正参数
// 		if ( $.type(option) === "string" ) {
// 			var text = option;
// 			option = {};
// 			option.text = text;
// 		}

// 		this.clearTime();

// 		this.$el.attr("class", "point " + option.type || "");
// 		this.$text.html(option.text || "");
// 		this.$el.show();
// 	},

// 	shortShow: function( option ){
// 		// 修正参数
// 		if ( $.type(option) === "string" ) {
// 			var text = option;
// 			option = {};
// 			option.text = text;
// 		}

// 		var that = this;

// 		this.clearTime();

// 		this.$el.attr("class", "point " + option.type || "");
// 		this.$text.html(option.text || "");
// 		this.$el.show();

// 		this.timeFn = setTimeout(function() {
// 			that.$el.hide();
// 		}, option.time || this.showTime);
// 	},

// 	hide: function(){
// 		this.clearTime();
// 		this.$el.hide();
// 	}
// };

// point.init();

var view = new Point();

module.exports = view;