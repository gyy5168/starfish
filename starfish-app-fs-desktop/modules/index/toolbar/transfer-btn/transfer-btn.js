var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js");
	// Transfer = require("modules/transfer/transfer.js");

var View = Backbone.View.extend({

	attributes: {
		class: "transfer-btn"
	},
	
	initialize: function() {
		// if ( !global.modules.transfer ) {
		// 	global.modules.transfer = new Transfer();
		// }
		this.render();
		this.initEvent();
		this.handleText();
	},

	render: function() {
		this.$el.html(__inline("transfer-btn.html"));
		this.$text = this.$el.find(".JS-text");
	},

	initEvent: function() {
		var that = this;

		// 点击切换transfer列表
		this.$el.on("click", function(){
			global.event.trigger("transferToggle");
		});

		// 如果上传列表发生变化，更新UI文本
		this.listenTo(global.data.uploadList, "change:state remove add reset", function(){
			that.handleText();
		});

		// 如果下载列表发生变化，更新UI文本
		this.listenTo(global.data.downloadList, "change:state remove add reset", function(){
			that.handleText();
		});
	},

	// 更新UI文本
	handleText: function(){
		var obj = this.getState(),
			num = obj.progress + obj.wait + obj.error;

		this.$el.removeClass("loading error");

		if ( num !== 0 ) {
			this.$el.addClass("loading");
			this.$text.html("正在传输("+num+")");
			return;
		}

		this.$text.html("传输列表");
		if ( obj.error !== 0 ) {
			this.$el.addClass("error");
		}
	},

	// 获取上传和下载列表的状态
	getState: function(){
		var result = {
			success: 0,
			error: 0,
			progress:0,
			wait: 0
		};

		global.data.uploadList.each(function(model){
			var state = model.get("state");
			
			result[state]++;
		});

		global.data.downloadList.each(function(model){
			var state = model.get("state");
			result[state]++;
		});

		return result;
	}

	
});


module.exports = View;