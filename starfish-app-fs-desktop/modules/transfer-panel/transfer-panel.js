var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	TransferDownload = require("./transfer-download/transfer-download.js"),
	TransferUpload = require("./transfer-upload/transfer-upload.js");

var View = Backbone.View.extend({
	
	interval: 1000, //进度和状态更新的时间间隔

	attributes: {
		class: "transfer-panel"
	},

	initialize: function() {
		
		this.render();
		this.initTabEvent();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("transfer-panel.html"));
		this.$tabHd = this.$el.find(".JS-tab-hd");
		this.$tabBd = this.$el.find(".JS-tab-bd");
		
		this.transferUpload = new TransferUpload();
		this.transferDownload = new TransferDownload();

		this.$tabBd.find(".JS-tab-item[data-item=upload]").append(this.transferUpload.$el);
		this.$tabBd.find(".JS-tab-item[data-item=download]").append(this.transferDownload.$el);
		$("#wraper").append( this.$el );
	},

	initEvent: function() {
		var that = this;
		this.$el.find(".JS-close").on("click", function(){
			that.hide();
		});
	},

	// 切换tab
	initTabEvent: function() {
		var that = this;

		this.$tabHd.on("click", ".JS-tab", function() {
			var $this = $(this),
				tab = $this.data("tab");

			that.$tabHd.find(".JS-tab").removeClass("selected");
			$this.addClass("selected");

			that.$tabBd.find(".JS-tab-item").hide();
			that.$tabBd.find(".JS-tab-item[data-item=" + tab + "]").show();
		});
	},

	// 根据规则来选择显示上传列表还是下载列表
	changePanel: function(){
		var uploading = false,
			downloading = false;

		// 如果上传列表有正在上传的文件，记录下
		global.data.uploadList.find(function(model){
			var state = model.get("state");
			if ( state === "progress" ) {
				uploading = true;
				return true;
			}
		});

		// 如果下载列表有正在下载的文件，记录下
		global.data.downloadList.find(function(model){
			var state = model.get("state");
			if ( state === "progress" ) {
				downloading = true;
				return true;
			}
		});

		// 优先显示上传列表
		if ( uploading ) {
			this.$tabHd.find(".JS-tab[data-tab=upload]").trigger("click");
		} else if ( downloading ) {
			this.$tabHd.find(".JS-tab[data-tab=download]").trigger("click");
		}
	},

	show: function(){
		this.showing = true;
		this.$el.show();
		this.changePanel();
	},

	hide: function() {
		this.showing = false;
		this.$el.hide();
		this.clearSuccess();
	},

	toggle: function(){
		if ( this.showing ) {
			this.hide();
		} else {
			this.show();
		}
	},

	// 将上传和下载成功的文件记录清除
	clearSuccess: function() {
		var arr = [];
		arr = global.data.uploadList.filter(function(model){
			var state = model.get("state");
			return state === "success";
		});

		$.each( arr, function( index, model){
			global.data.uploadList.remove( model );
		});

		arr = global.data.downloadList.filter(function(model){
			var state = model.get("state");
			return state === "success";
		});

		$.each( arr, function( index, model){
			global.data.downloadList.remove( model );
		});

	}
});

global.event.on("transferToggle", function(){
	if ( !global.modules.transferPanel ) {
		global.modules.transferPanel = new View();
	}
	global.modules.transferPanel.toggle();
});

module.exports = View;