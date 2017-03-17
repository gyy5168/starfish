var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	jqueryAutoSize = require("modules-common/autosize/autosize.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "task-form-description"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("task-form-description.html"));
		this.$textarea = this.$el.find(".JS-input");
	},

	initEvent: function() {
		var that = this;

		this.$textarea.one("focus", function(){
			that.autosize();
		});

		this.$textarea.on("input", function() {
			that.trigger("input");
		});
	},

	autosize: function(){
		if ( this.autosized ) {
			return;
		}
		jqueryAutoSize(this.$textarea);
		this.autosized = true;
	},

	updateSize: function(){
		var evt = document.createEvent('Event');
		evt.initEvent('autosize:update', true, false);
		this.$textarea[0].dispatchEvent(evt);
	},

	get: function() {
		return this.$textarea.val();
	},

	set: function(value) {
		value = value || "";
		value = global.tools.decodeHtml(value);
		this.autosize();
		this.$textarea.val(value);
		this.updateSize();
	},

	clear: function() {
		this.set("");
	},

	destroy: function() {
		this.$textarea.trigger("autosize:destroy");
		this.$textarea.off();
		this.remove();
	}
});

module.exports = View;