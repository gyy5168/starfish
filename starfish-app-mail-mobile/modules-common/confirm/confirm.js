var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules-common/router/router.js"),
	$ = require("modules-common/zepto/zepto.js"),
	topBar = require("modules-common/top-bar/top-bar.js"),
	_ = require("modules-common/underscore/underscore.js");

var View = Backbone.View.extend({
	attributes: {
		class: "confirm"
	},

	back: function(){
		this.destroy();
		this.cancelCallback && this.cancelCallback();
	},

	initialize: function(option) {
		this.render();
		this.initEvent();
		this.set(option);

		this.prevBack = topBar.getBack();
		topBar.setBack(_.bind(this.back, this));
	},

	render: function() {
		this.$el.html(__inline("confirm.html"));
		this.$text = this.$el.find(".JS-text");
		this.$ok = this.$el.find(".JS-ok");
		this.$cancel = this.$el.find(".JS-cancel");
		global.$doc.append(this.$el);
	},

	// 初始化，确定和取消按钮事件
	initEvent: function() {
		var that = this;

		this.$ok.on("click", function() {
			that.destroy();
			if ( that.okCallback ) {
				that.okCallback();
			} else if ( that.callback ){
				that.callback();
			}
		});

		this.$cancel.on("click", function() {
			that.destroy();
			that.cancelCallback && that.cancelCallback();
		});
	},

	// 单例模式， 每次重新render和initEvent，并渲染UI
	set: function(option){
		this.$text.html(option.text || "无内容");
		this.callback = option.callback;
		this.okCallback = option.okCallback;
		this.cancelCallback = option.cancelCallback;
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
		topBar.setBack( this.prevBack );
	}
});


module.exports = {
	show: function(option){
		new View(option);
	}
};