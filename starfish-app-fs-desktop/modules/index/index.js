var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	router = require("modules/routers/router.js"),
	urlTool = require("modules-common/tools/url.js"),
	Crumb = require("modules/crumb/crumb.js"),
	Filelist = require("modules/filelist/filelist.js"),
	// functions = require("modules/function/function.js"),
	Toolbar = require("./toolbar/toolbar.js");

require("modules/upload/upload.js");
require("modules/download/download.js");
require("modules/new-folder/new-folder.js");
require("modules/menu/menu.js");
require("modules/move/move.js");
require("modules/permissions-set/permissions-set.js");
require("modules/send/send.js");
require("modules/transfer-panel/transfer-panel.js");

var View = Backbone.View.extend({

	attributes: {
		class: "index"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("index.html"));

		this.crumb = new Crumb();
		this.toolbar = new Toolbar();
		this.filelist = new Filelist();

		this.$el.find(".JS-hd").append(this.toolbar.$el);
		this.$el.find(".JS-cr").append(this.crumb.$el);
		this.$el.find(".JS-list").append(this.filelist.$el);

		$("#wraper").append(this.$el);
	},

	initEvent: function() {
		var that = this;
		
		// 路由改变时，触发文件列表改变
		this.listenTo(router, "route", function(__, param) {
			var url = param[0] || "",
				parent = urlTool.getParam(url, "parent")[0];

			parent = parent || 0;
			this.filelist.set(parent);
		});
	}
});

module.exports = View;