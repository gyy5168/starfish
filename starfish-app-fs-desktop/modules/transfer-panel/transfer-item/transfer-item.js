var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	file = require("modules-common/file/file2.js"),
	$ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({

	attributes:{
		class:"transfer-item"
	},
	
	tagName:"li",

	uploadTemplate: __inline("upload-item.tmpl"),

	downloadTemplate: __inline("download-item.tmpl"),
	
	initialize: function( option, type ){
		this.render( option, type);
		this.initEvent();

		this.model.view = this;
		this.changeProgress();
		this.changeState();
	},

	render: function( option ){
		var obj = this.model.toJSON();

		if ( option.type === "upload" ){
			obj.filePath = obj.extra && obj.extra.filePath || "无";
			this.$el.html(this.uploadTemplate(obj));
		} else {
			this.$el.html(this.downloadTemplate(obj));
		}

		this.$progressInner = this.$el.find(".JS-progress-inner");
		this.$progressNum = this.$el.find(".JS-num");
		this.$re = this.$el.find(".JS-re");
		this.$cancel = this.$el.find(".JS-cancel");

		this.$el.attr("data-uuid", obj.uuid);
		this.$el.data("view", this);
	},

	initEvent: function(){
		var that = this;
		this.listenTo( this.model, "change:progress", function(model, value){
			that.changeProgress();
		});
		this.listenTo( this.model, "change:state", function( model, value) {
			that.changeState();
		});
	},

	changeProgress: function(num){
		
		var num = this.model.get("progress");
		num = num || 0;
		if ( num == 100 ) {
			num = 99;
		}

		this.$progressInner.css("width", num + "%");
		this.$progressNum.html(num + "%");
	},

	changeState: function(){
		var state = this.model.get( "state" );
		state = state || "wait";

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
		this.$el.remove();
	}

	
});

module.exports = View;