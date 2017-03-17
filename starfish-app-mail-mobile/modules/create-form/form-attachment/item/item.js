var $ = require("modules-common/zepto/zepto.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js"),
	tools = require("modules/tools/tools.js"),
	file = require("modules-common/file/file.js"),
	fileIcon = require("modules/file-icon/file-icon.js");

var View = Backbone.View.extend({

	template: __inline("item.tmpl"),

	tagName:"li",

	attributes: {
		class: "form-attachment-item"
	},

	initialize: function(option) {
		this.parentView = option.parentView;
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

	initEvent: function(){
		var that = this;
		this.listenTo( this.model, "change:state", function(model, value){
			that.changeState();
		});

		this.listenTo( this.model, "change:progress", function(value){
			that.changeProgress();
		});

		this.$remove.on("click", function(){
			var isUploaded = (that.model.get("state") === "success");
			
			// 如果没有上传成功,则取消上传
			if ( !isUploaded ) {
				file.cancelUpload({
					uuid: that.model.get("uuid")
				});
			} 
			that.parentView.list.remove(that.model);
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