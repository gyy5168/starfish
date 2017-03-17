var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	Toolbar = require("./toolbar/toolbar.js"),
	SubjectList = require("./subject-list/subject-list.js"),
	router = require("modules/routers/router.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "mail-left-panel"
	},

	initialize: function(option) {

		this.option = option || {};
		this.render();
		this.initEvent();

		this.load();
	},

	render: function() {
		this.toolbar = new Toolbar();
		this.subjectList = new SubjectList();
		this.$el.append(this.toolbar.$el);
		this.$el.append(this.subjectList.$el);

		if ( this.option.class ) {
			this.$el.addClass(this.option.class);
		}
	},

	initEvent: function() {

	},

	load: function() {
		this.subjectList.load();
	},

	destroy: function(){
		this.toolbar.destroy();
		this.subjectList.destroy();
		this.remove();
	}
});

module.exports = View;