var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	urlTool = require("modules-common/tools/url.js"),
	SubjectDetail = require("modules/subject-detail/subject-detail.js");

var View = Backbone.View.extend({
	tagName: "div",

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("subject-detail-integration.html"));
		this.$loading = this.$el.find(".JS-loading");
		this.$loaderror = this.$el.find(".JS-error");
		this.$errorBtn = this.$loaderror.find(".JS-btn");
		this.$empty = this.$el.find(".JS-empty");
		this.subjectDetail = new SubjectDetail();
		this.$el.append( this.subjectDetail.$el );

		$("#wraper").append( this.$el );

		var href = window.location.href;
		href = href.substr( href.indexOf("?") );
		this.set(href);
	},

	initEvent: function() {
		var that = this;

	},

	set: function(param){
		this.param = param;
		this.id = urlTool.getParam(param, "id")[0];

		this.subjectDetail.setId( this.id )
		// this.load();
	},

	clear: function(){
		this.$loading.hide();
		this.$loaderror.hide();
		this.$empty.hide();
		this.detailView.hide();
	},

	show: function() {
		if (!this.showing) {
			this.$el.show();
			this.showing = true;
		}
	},

	hide: function() {
		if (this.showing) {
			this.$el.hide();
			this.showing = false;
		}
	},

	destroy: function(){
		this.remove();
		this.subjectDetail.destroy();
		this.subjectDetail = null;
	},

	attributes: {
		"class": "subject-detail-integreation"
	}
});

module.exports = View;