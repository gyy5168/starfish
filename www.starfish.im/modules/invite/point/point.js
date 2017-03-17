var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var Point = Backbone.View.extend({
	attributes: {
		"class": "point"
	},

	showTime: 2000,

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

module.exports = new Point();