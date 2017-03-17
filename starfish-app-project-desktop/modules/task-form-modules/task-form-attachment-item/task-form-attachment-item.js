var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	file = require("modules-common/file/file2.js");

var View = Backbone.View.extend({
	tagName: "li",

	templateUpload:__inline("task-form-attachment-item.tmpl"),

	template: __inline("task-form-attachment-item.tmpl"),

	initialize: function(option) {
		this.type = option.type || "create";
		this.model.view = this;
		this.render();
		this.initEvent();
	},

	render: function(){
		var option = this.model.toJSON(),
			templateData = {};

		templateData.fileName = option.fileName;

		this.$el.html( this.template(templateData) );
		this.$loading = this.$el.find(".JS-loading");
		this.$progress = this.$el.find(".JS-progress");
		this.$reload = this.$el.find(".JS-reload");
		this.$download = this.$el.find(".JS-download");
		this.$cancel = this.$el.find(".JS-cancel");

		this.$el.data("uuid", option.uuid);
		this.$el.data("view", this);
		this.changeState();
		this.$progress.html( this.model.get("progress") || 0 + "%");
		// this.model.trigger("change:progress");
		// this.model.trigger("change:state");
	},

	initEvent: function(){
		var that = this;
		this.listenTo( this.model, "change:progress", function(model, value){
			value = value || 0;
			that.$progress.html( value + "%" );
		});
		this.listenTo( this.model, "change:state", function( model, value) {
			that.changeState( value );
		});

		this.listenTo( this.model, "reset", function(){
			that.render();
		});

		// this.listenTo( this.model, "destroy", this.destroy );
	},

	changeState: function(){
		var state = this.model.get( "state" );

		this.$el.removeClass("wait progress success error");

		if ( state === "wait" ) {
			this.$el.addClass("wait");
		} else if ( state === "progress" ) {
			this.$el.addClass("progress");
		} else if ( state === "success" ) {
			this.$el.addClass("success");

			// 如果是任务详情，将id放到data里面
			if ( this.type === "detail" ) {
				this.$el.data( "id", this.model.get("id"));
			}
		} else if ( state === "error" ) {
			this.$el.addClass("error");
		}
	},

	// renderUpload: function(){
	// 	var option = this.model.toJSON(),
	// 		data = {};

	// 	data.name = option.name;

	// 	this.$el.data({
	// 		view: this,
	// 		type:"upload"
	// 	});

	// 	this.$el.html(this.templateUpload(data));
	// 	this.$loading = this.$el.find(".JS-loading");
	// 	this.$progress = this.$el.find(".JS-progress");
	// 	this.$reload = this.$el.find(".JS-reload");
	// 	this.$download = this.$el.find(".JS-download");
	// 	this.$cancel = this.$el.find(".JS-cancel");
	// },

	// render: function(){
	// 	var data = {};
	// 	data.name = this.model.get("filename");
	// 	this.$el.html(this.template(data));

	// 	this.$el.data({
	// 		view: this,
	// 		id: this.model.get("id"),
	// 		type: "normal"
	// 	});
	// },

	// changeState: function( state ){

	// 	state = state || this.model.get( "state" );

	// 	this.$el.removeClass("wait progress success error");

	// 	if ( state === 1 ) {
	// 		this.state = "wait";
	// 		this.$el.addClass("wait");
	// 	} else if ( state === 2 ) {
	// 		this.$el.addClass("progress");
	// 	} else if ( state === 3 ) {

	// 		if ( this.type === "create" ) {
	// 			this.$el.addClass("success");
	// 		} else {
	// 			this.model.set( this.model.get("httpData").data[0]);
	// 			this.render();
	// 		}
			
			
	// 	} else if ( state === 4 ) {
	// 		this.$el.addClass("error");
	// 	}
	// },

	attributes: {
		class: "task-form-attachment-item"
	},


	destroy: function(){
		this.$el.removeData();
		this.remove();
	}
});


module.exports = View;