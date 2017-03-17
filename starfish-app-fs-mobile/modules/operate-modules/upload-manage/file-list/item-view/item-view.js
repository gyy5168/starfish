var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	tools = require("modules-common/tools/tools.js"),
	router = require("modules-common/router/router.js"),
	topbar = require("modules-common/top-bar/top-bar.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	fileIcon = require("modules/file-icon/file-icon.js"),
	file = require("modules-common/file/file.js");

var uploadList = global.data.uploadList || (global.data.uploadList = new Backbone.Collection());

var View = Backbone.View.extend({

	template: __inline("item-view.tmpl"),

	attributes: {
		class: "file-list-item"
	},

	initialize: function() {
		this.render();
		this.initEvent();
		this.changeState();
		this.changeProgress();
	},

	render: function() {
		var modelData = this.model.toJSON(),
			data = {};

		data.name = modelData.fileName;
		data.size = tools.formatSize( modelData.fileSize );

		// 设置文件图标
		data.icon = fileIcon.getClassName(modelData.fileName);
		
		this.$el.html( this.template(data) );

		this.$progressInner = this.$el.find(".JS-progress-inner");
		this.$progressNum = this.$el.find(".JS-progress-num");
		this.$remove = this.$el.find(".JS-remove");
	},

	initEvent: function() {
		var that = this;

		this.listenTo( this.model, "change:state", function(model, value){
			that.changeState();
		});

		this.listenTo( this.model, "change:progress", function(value){
			that.changeProgress();
		});

		this.$remove.on("click", function(){
			confirm.show({
				text:"确定要取消该文件的上传操作？",
				callback: function(){
					var isUploaded = (that.model.get("state") === "success");

					// 如果没有上传成功,则取消上传
					if ( !isUploaded ) {
						file.cancelUpload({
							uuid: that.model.get("uuid")
						});
						uploadList.remove(that.model);
					} else {
						point.shortShow({
							text:"该文件已上传已经成功"
						});
					}
				}
			});
			
		});

	},

	changeState: function(){
		this.$el.removeClass("wait success error progress");
		this.$el.addClass( this.model.get("state"));
	},

	changeProgress: function(){
		var value = this.model.get("progress") || 0;
		this.$progressInner.css("width", value + "%");
		this.$progressNum.html(value + "%");
	},

	destroy: function(){
		this.remove();
	}
	
});


module.exports = View;

