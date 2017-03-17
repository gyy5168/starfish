var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	jqueryAutoSize = require("modules-common/autosize/autosize.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "task-form-title"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("task-form-title.html"));
		this.$textarea = this.$el.find(".JS-input");
		this.$add = this.$el.find(".JS-add");
	},

	initEvent: function() {
		var that = this;

		this.$add.on("click", function() {
			var oldValue = that.$textarea.val();
			var newValue = "#标签# " + oldValue;
			that.setText(newValue);
			that.$textarea.focus();
			that.$textarea[0].selectionStart = 1;
			that.$textarea[0].selectionEnd = 3;
			that.trigger("input");

		});

		this.$textarea.one("focus", function() {
			that.autosize();
		});

		this.$textarea.on("input", function() {
			that.trigger("input");
		});

		this.$el.on("click", ".JS-tag", function() {
			var tag = $(this).text();
			var oldValue = that.$textarea.val();
			var start = that.$textarea[0].selectionStart;
			var s1 = oldValue.substr(0, start);
			var s2 = oldValue.substr(start);
			var newValue = s1 + tag + s2;
			that.$textarea.val(s1 + tag + s2);
			that.$textarea[0].focus();
			that.$textarea[0].selectionStart = newValue.length;
		});
	},

	get: function() {
		var text = this.$textarea.val().trim();

		this.tags = [];
		this.text = "";

		var patten = /#.*?#/;
		while (text.indexOf("#") === 0) {
			var result = patten.exec(text);
			if (!result || result.length === 0) {
				break;
			} else {
				var tag = result[0];
				var tagText = tag.replace(/#/g, "");
				if (tagText.length > 0) {
					this.tags.push(tagText);
				}
				text = text.replace(tag, "").trim();
			}
		}

		this.text = text.trim();

		return this.text;
	},

	getTags: function() {
		return this.tags;
	},

	set: function(value) {
		this.autosize();
		var str = "";
		if (value.tags) {
			$.each(value.tags, function(i, tag) {
				str += "#" + tag.name + "# ";
			});
		}

		var text = value.text;
		if (text) {
			str += value.text;
		}
		this.oldValue = str;
		this.setText(str);
	},

	setText: function(value) {
		value = global.tools.decodeHtml(value);
		this.$textarea.val(value);
		this.updateSize();
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

	clear: function() {
		this.setText("");
	},

	destroy: function() {
		this.$textarea.trigger("autosize:destroy");
		this.$textarea.off();
		this.remove();
	}
});

module.exports = View;