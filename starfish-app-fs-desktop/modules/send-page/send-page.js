var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	router = require("modules/routers/router.js"),
	urlTool = require("modules-common/tools/url.js"),
	// Crumb = require("modules/crumb/crumb.js"),
	Filelist = require("modules/filelist/filelist.js");


require("modules/download/download.js");
require("modules/menu/menu.js");

var View = Backbone.View.extend({
	tagName: "div",

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("send-page.html"));

		// this.crumb = new Crumb();
		this.filelist = new Filelist();

		// this.$el.find(".JS-cr").append(this.crumb.$el);
		this.$el.find(".JS-list").append(this.filelist.$el);

		$("#wraper").append(this.$el);
	},

	initEvent: function() {
		var that = this;
		
		this.listenTo(router, "route", function(__, param) {
			var url = param[0] || "",
				share = urlTool.getParam(url, "share")[0],
				parent = urlTool.getParam(url, "parent")[0];

			this.filelist.setShare(share, parent);
		});

	},

	attributes: {
		class: "index"
	}
});

module.exports = View;