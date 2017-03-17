var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules-common/router/router.js"),
	$ = require("modules-common/zepto/zepto.js");

var uploadList = global.data.uploadList || (global.data.uploadList = new Backbone.Collection());

var View = Backbone.View.extend({
	attributes: {
		class: "upload-state"
	},

	initialize: function(option) {
		this.parentView = option.parentView;
		this.render();
		this.initEvent();
		this.changeState();
	},

	render: function() {
		this.$el.html(__inline("upload-state.html"));
		this.$progress = this.$el.find(".JS-progress");
		this.$progressText = this.$progress.find(".JS-text");
		this.$error = this.$el.find(".JS-error");
	},

	initEvent: function(){
		var that = this;

		this.listenTo( uploadList, "add remove reset change:state", function(){
			that.changeState();
		});

		this.$el.on("click", function(){
			global.event.trigger("showUploadManage");
		});
	},

	changeState: function(){
		var data = this.getState();

		if ( (data.progress + data.wait) > 0 ) {
			this.$el.removeClass("error-state");
			this.$progressText.html("正在上传 " + (data.progress + data.wait) + " 个文件");
			this.parentView.showUploadState();
		} else if ( data.error > 0 ) {
			this.$el.addClass("error-state");
			this.parentView.showUploadState();
		} else {
			this.parentView.hideUploadState();
		}
	},

	getState: function(){
		var result = {
			progress: 0,
			error: 0,
			wait:0
		};

		uploadList.each(function(model){
			var state = model.get("state");
			if ( state === "progress" ) {
				result.progress++;
			} else if ( state === "error" ) {
				result.error++;
			} else if ( state === "wait" ) {
				result.wait++;
			}
		});

		return result;
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
	
});


module.exports = View;

