var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	List = require("./file-list/file-list.js"),
	router = require("modules-common/router/router.js"),
	point = require("modules-common/point/point.js"),
	topBar = require("modules-common/top-bar/top-bar.js");

var uploadList = global.data.uploadList || (global.data.uploadList = new Backbone.Collection());

var View = Backbone.View.extend({
	attributes: {
		class: "upload-manage"
	},

	back: function(){
		if ( this.operatePanelShowed ) {
			this.hideOperatePanel();
		} else {
			this.destroy();
		}
	},

	initialize: function() {
		this.render();
		this.initInfoEvent();
		this.initOperateEvent();

		this.changeInfo();
		
		this.prevBack = topBar.getBack();
        this.prevTitle = topBar.getTitle();
        this.prevMenu = topBar.getMenu();

        var that = this;
        topBar.setBack(_.bind(this.back, this));
        topBar.setTitle("上传管理");
		topBar.setMenu([{
			name: "操作",
			callback: function(){
				that.operate();
			}
		}]);
	},

	render: function() {
		this.$el.append(__inline("upload-manage.html"));
		this.$info = this.$el.find(".JS-info");
		this.$operatePanel = this.$el.find(".JS-operate-panel");

		this.modules = {};
		this.modules.list = new List();
		this.$el.append( this.modules.list.$el );

		global.$doc.append(this.$el);
	},

	initInfoEvent: function(){
		var that = this;
		this.listenTo(uploadList, "add remove change:state", function(){
			that.changeInfo();
		});
	},

	initOperateEvent: function(){
		var that = this;
		

		this.$operatePanel.on("click", "li", function(){
			var action = $(this).data("action");
			if ( action === "clear" ) {
				that.hideOperatePanel();
				that.modules.list.clearAll();
			} else if ( action === "cancel" ) {
				that.hideOperatePanel();
			}
		});
	},

	changeInfo: function(){
		var state = this.getState();

		if (state.progress === 0 ) {
			this.$info.html("没有正在上传的文件");
		} else {
			this.$info.html("正在上传"+state.progress+"个文件");
		}

	},

	getState: function(){
		var result = {
			progress: 0,
			error: 0
		};

		uploadList.each(function(model){
			var state = model.get("state");
			if ( state === "progress" ) {
				result.progress++;
			} else if ( state === "error" ) {
				result.error++;
			}
		});

		return result;
	},

	show: function() {
		var that = this;

		this.$el.show();
		this.trigger("show");
	},

	hide: function() {
		this.$el.hide();
		this.trigger("hide");
	},

	operate: function(){
		if ( this.operatePanelShowed ) {
			this.hideOperatePanel();
		} else {
			this.showOperatePanel();
		}
	},

	// 显示操作面板
	showOperatePanel: function(){
		if ( this.operatePanelShowed ) {
			return;
		}
		this.operatePanelShowed = true;
		this.$operatePanel.show();
	},

	// 隐藏操作面板
	hideOperatePanel: function(){
		if ( this.operatePanelShowed ) {
			this.operatePanelShowed = false;
			this.$operatePanel.hide();
		}
	},

	destroy: function(){
		this.modules.list.destroy();
		this.remove();

		topBar.setTitle(this.prevTitle);
        topBar.setMenu(this.prevMenu);
        topBar.setBack(this.prevBack);
	}
	
});

global.event.on("showUploadManage", function() {
    var uploadManage = new View();
});

module.exports = View;

