/*
 * @file 获取当前用户信息
 */
var $ = require("modules-common/zepto/zepto.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	topBar = require("modules-common/top-bar/top-bar.js"),
	point = require("modules-common/point/point.js");

// 获取当前用户的信息，并显示加载中的UI
var View = Backbone.View.extend({
	attributes: {
		"class": "init"
	},

	initialize: function(option) {
		option = option || {};
		this.callback = option.callback;
		this.render();
		this.initEvent();
		this.fetchInfo();

		topBar.setTitle("加载中");
		topBar.setBack(function(){
			global.starfishBridge("finish");
		});
	},

	render: function() {
		this.$el.html(__inline("init.html"));
		this.$loading = this.$el.find(".JS-loading");
		this.$loadError = this.$el.find(".JS-error");
		global.$doc.append(this.$el);
	},

	initEvent: function() {
		var that = this;
		this.$loadError.find(".JS-btn").on("click", function() {
			that.fetchInfo();
		});
	},

	fetchInfo: function() {
		var that = this;
		if (this.fetchInfoing) {
			return;
		}
		this.fetchInfoing = true;

		this.$loading.show();
		this.$loadError.hide();

		return $.ajax({
			url: global.baseUrl + "/users/self",
			type: "GET",
			success: function(response) {
				if (response.errcode === 0) {
					global.data.user = new Backbone.Model(response.data);
                    that.callback && that.callback();
					that.destroy();
				} else {
					that.$loadError.show();
				}
			},

			error: function() {
				that.$loadError.show();
				point.shortShow({
					type: "error",
					text: "加载失败， 请检查网络"
				});
			},

			complete: function() {
				that.fetchInfoing = false;
				that.$loading.hide();
			}
		});
	},

	destroy: function() {
		this.remove();
	}
});

module.exports = View;