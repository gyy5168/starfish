var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		"class": "modal"
	},

	title:"无标题",

	backdrop: true,

	content: "",

	initialize: function(){
		this.render();
		this.initEvent();
	},

	render: function() {
		// 防止class属性被覆盖
		this.$el.addClass("modal");
		this.$el.html(__inline("modal.html"));
		this.$modalBd = this.$el.find(".JS-modal-bd");
		this.$modalTitle = this.$el.find(".JS-modal-title");
		
		this.$modalTitle.html( this.title );
		this.$modalBd.html( this.content );

		if ( this.backdrop ) {
			this.$el.addClass("backdrop");
		}
		global.$doc.append(this.$el);
	},

	initEvent: function() {
		var that = this;
		this.$el.on("click", ".JS-modal-close", function(){
			that.hide();
		});
	},

	setTitle: function(title){
		this.$modalTitle.html( title );
	},

	setContent: function($node){
		this.$modalBd.html("");
		this.$modalBd.append( $node );
	},

	appendContent: function($node){
		this.$modalBd.append( $node );
	},

	show: function(){
		this.$el.show();
		this.trigger("show");
	},

	hide: function(){
		this.$el.hide();
		this.trigger("hide");
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = View;