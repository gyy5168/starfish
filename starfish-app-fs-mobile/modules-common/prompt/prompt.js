/*
 * @file 确认输入框
 * @version 0.0.1
 */
var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules-common/router/router.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	topBar = require("modules-common/top-bar/top-bar.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
	attributes: {
		class: "prompt"
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
		this.$el.append(__inline("prompt.html"));
		this.$text = this.$el.find(".JS-text");
		this.$input = this.$el.find(".JS-input");
		this.$ok = this.$el.find(".JS-ok");
		this.$cancel = this.$el.find(".JS-cancel");
		global.$doc.append(this.$el);
	},

	// 初始化，确定和取消按钮事件
	initEvent: function() {
		var that = this;

		this.$ok.on("click", function() {
			var text = that.$input.val();
			text = text.replace(/(^\s*)|(\s*$)/g, "");
			if ( text === "" ) {
				point.shortShow({
					text:"内容不能为空"
				});
				return;
			}
			that.destroy();

			if ( that.okCallback ) {
				that.okCallback(text);
			} else if ( that.callback ){
				that.callback(text);
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

	show: function() {
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