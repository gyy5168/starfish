var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "task-form-time"
	},

	template: __inline("task-form-time.tmpl"),

	initialize: function(option) {
		this.option = option;
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(this.template({
			label: this.option.label
		}));

		this.$input = this.$el.find(".JS-input");
	},

	initEvent: function() {
		var that = this;

		this.$input.on("keypress", function(event) {
			var key = event.keyCode || event.which
			if ((key < 48 || key > 57) && key !== 45 && key !== 46) {
				event.preventDefault();
			}
		});

		this.$input.on("blur", function() {
			if (that.oldData != that.$input.val()) {
				that.trigger("blur");
			}
		});
	},

	get: function() {
		var time = parseFloat(this.$input.val());
		if (isNaN(time)) {
			time = 0;
		}
		return time;
	},

	set: function(value) {
		if (value > 0) {
			this.oldData = value;
			this.$input.val(value);
		} else {
			this.oldData = "";
			this.$input.val("");
		}
	},

	clear: function() {
		this.set(0);
	},

	destroy: function() {
		this.remove();
	}
});

module.exports = View;