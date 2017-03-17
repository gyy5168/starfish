// 右键菜单
var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
	tagName:"ul",

	attributes:{
		class:"menu"
	},

	initialize: function(){
		this.render();
		this.initEvent();
	},

	render: function(){
		this.$el.html(__inline("menu.html"));
		this.$changeName = this.$el.find(".JS-changeName");
		$("#wraper").append(this.$el);
	},

	initEvent: function(){
		var that = this;
		// 点击空白处，隐藏菜单
		this.donHandle = function(){
			that.hide();
		}
		$(document).on("mousedown.menu", this.donHandle);

		// 点击菜单项，触发全局事件
		this.$el.on("click", "li", function(event){
			var action = $(this).data("action");
			that.hide();
			global.event.trigger(action);
			event.stopPropagation();
		});

		// 阻止事件冒泡
		this.$el.on("mousedown", function(event){
			event.stopPropagation();
		});
	},

	show: function(option){

		if ( option ) {
			this.set(option);
		}

		if ( !this.itemLength ){
			return;
		}
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	set: function(option){
		this.setPosition(option.css);
		this.setView(option.shows);
	},

	// 智能设置位置，使菜单越过超过视图
	setPosition: function(option){
		option = option || {};
		var left = option.left || 0,
			top = option.top || 0,
			$doc = $(document),
			docHeight = $doc.height(),
			docWidth = $doc.width(),
			height = this.$el.outerHeight(),
			width =  this.$el.outerWidth();

		if ( left + width >= docWidth ) {
			left = docWidth - width;
		}

		if ( top + height >= docHeight ) {
			top = docHeight - height;
		}

		this.$el.css({
			left:left,
			top:top
		});
	},

	// 根据权限，显示有权限的操作项
	setView: function(arr){
		var that = this;
		arr = arr || [];

		this.itemLength = arr.length;

		this.$el.find("li").each( function(){
			$(this).hide();
		});

		$.each( arr, function(index, str){
			that.$el.find("li[data-action="+str+"]").show();
		});
	},

	clear: function(){
		this.$el.find("li").each( function(){
			$(this).show();
		});
	},

	destroy: function(){
		this.remove();
		$(document).off("mousedown.menu", this.donHandle);
	}
});

var menu;
global.event.on("menu", function(option) {
	if (!menu) {
		menu = new View();
	}
	menu.show(option);
});

module.exports = View;