var Backbone = require("modules-common/backbone/backbone.js");
var $ = require("modules-common/zepto/zepto.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "confirm"
	},

	initialize: function() {
		this.render();

		this.$text = this.$el.find(".JS-text");
		this.$ok = this.$el.find(".JS-ok");
		this.$cancel = this.$el.find(".JS-cancel");

		this.initEvent();
	},

	render: function() {
		this.$el.append(__inline("confirm.html"));
		$("#wraper").append(this.$el);
	},

	initEvent: function() {
		var that = this;
		this.$ok.on("click", function() {
			that.hide();
			that.callback();
		});

		this.$cancel.on("click", function() {
			that.hide();
		});
	},

	show: function(option) {
		this.initialize();
		if (this.showing) {
			return;
		}

		this.$text.text(option.text);
		this.$text.addClass(option.type);
		this.callback = option.okCallback;
		this.$el.show();

		this.showing = true;

		if (window.starfishBack) {
			this._starfishBack = window.starfishBack;
			window.starfishBack = $.proxy(this.hide, this);
		}
	},

	hide: function() {
		if (this.showing) {
			this.$el.remove();
			this.showing = false;

			if (window.starfishBack) {
				window.starfishBack = this._starfishBack;
			}
		}
	}
});

module.exports = new View();