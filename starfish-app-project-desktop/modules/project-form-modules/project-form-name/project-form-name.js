var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	jqueryAutoSize = require("modules-common/autosize/autosize.js");

var View = Backbone.View.extend({
	tagName: "div",

	initialize: function(option) {
		option = option || {};
		this.type = option.type || "create";

		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("project-form-name.html"));
		this.$textarea = this.$el.find("textarea");
	},

	initEvent: function() {
		var that = this;
		this.$textarea.one("focus", function(){
			that.autosize();
		});

		if ( this.type === "create" ) {
			return;
		}

		this.$textarea.on("change", function(){
			var value = that.get();
			that.trigger("change", {
				data:value
			});
		});

		this.$textarea.on("input", function(){
			var value = that.get();
			that.trigger("input", {
				data:value
			});
		});
	},

	autosize: function(){
		if ( this.autosized ) {
			return;
		}
		jqueryAutoSize(this.$textarea);
		this.autosized = true;
	},

	get: function(){
		return this.$textarea.val();
	},

	set: function(value){
		this.autosize();
		value = global.tools.decodeHtml(value);
		this.$textarea.val(value);
		this.updateSize();
	},

	updateSize: function(){
		var evt = document.createEvent('Event');
		evt.initEvent('autosize:update', true, false);
		this.$textarea[0].dispatchEvent(evt);
	},

	clear: function(){
		this.$textarea.val("");
		this.updateSize();
	},

	attributes: {
		class: "project-form-name form-group"
	},

	destroy: function(){
		this.$textarea.trigger("autosize:destroy");
		this.$textarea.off();
		this.remove();
	},
    select:function(){
        this.$textarea.focus()
    }
});

module.exports = View;