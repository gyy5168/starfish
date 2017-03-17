var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	file = require("modules-common/file/file2.js"),
	tools = require("modules/tools/tools.js");

var View = Backbone.View.extend({
	tagName: "li",

	template:__inline("form-attachment-item.tmpl"),

	initialize: function() {
		this.render();
		this.$progressInner = this.$el.find(".JS-progress-inner");
		this.$progressNum = this.$el.find(".JS-num");
		this.$progress = this.$el.find(".JS-progress");
		this.$stateError = this.$el.find(".JS-state-error");
		this.$stateWait = this.$el.find(".JS-state-wait");
		this.$stateSuccess = this.$el.find(".JS-state-success");
		this.$re = this.$el.find(".JS-re");
		this.$cancel = this.$el.find(".JS-cancel");
		this.initEvent();
	},

	render: function() {
		var option = this.model.toJSON(),
			data = {};

		data.name = option.fileName;

		data.type = tools.getFileType(option.fileName);
		this.$el.html(this.template(data));

		this.$el.data("view", this);
		this.model.view = this;
		return this.$el;
	},

	initEvent: function(){
		var that = this;
		this.listenTo( this.model, "change:progress", function(model, value){
			that.changeProgress(value);
		});
		this.listenTo( this.model, "change:state", function( model, value) {
			that.changeState( value );
		});
	},

	changeProgress: function(num){
		this.$progressInner.css("width", num + "%");
		this.$progressNum.html(num + "%");
	},

	changeState: function( state ){

		var state = this.model.get( "state" );

		this.$el.removeClass("wait progress success error");

		if ( state === "wait" ) {
			this.$el.addClass("wait");
		} else if ( state === "progress" ) {
			this.$el.addClass("progress");
		} else if ( state === "success" ) {
			this.$el.addClass("success");
		} else if ( state === "error" ) {
			this.$el.addClass("error");
		}
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	},

	attributes: {
		class: "form-attachment-item"
	}
});


module.exports = View;