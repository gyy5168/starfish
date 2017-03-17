var $ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Backbone = require("modules-common/backbone/backbone.js");

// 缓存回调函数
var callbackCache = {}; 

// 生成唯一ID
var createID = function(){
	var id = 1;
	return function(){
		var result = + new Date();
		result += "" + id++;
		return +result;
	}
}();

// 点击topbar的右边的操作，框架就会调用此函数， 并传递id，根据id去callbackCache找到函数
window.starfishMenuHandle = function(id){
	callbackCache[id] && callbackCache[id]();
}

module.exports = {

	// 显示topbar 右边的菜单
	showMenu: function(arr){

		var data = [];

		this.menu = arr;
		//清空callback缓存
		callbackCache = {};

		// 修正参数为数组
		if ( !_.isArray(arr) ) {
			arr = [arr];
		}

		// 设置默认值
		_.each( arr, function(option){
			var obj = {};

			obj.iconUrl = option.iconUrl || "";
			obj.name = option.name || "未命名";

			// js只能传递字符串给框架，所以当需要传递函数时，需要将函数存到对象中， 将对应的key传递给框架
			// 如此JS可以通过key来找到函数，从而达到间距传递函数的目的
			if ( option.callback ) {
				var id = createID();
				callbackCache[id] = option.callback;
				obj.callback = id + "";
			}

			data.push( obj );
		});

		global.starfishBridge( "showMenu", {data:data});

		// window.starfish.showMenu( JSON.stringify({data:data}) );
	},

	getMenu: function(){
		return this.menu;
	},

	setMenu: function(arr){
		this.showMenu(arr);
	},

	// 显示标题
	// 框架通过监听网页的title标签内容改变自动改变topbar的标题
	showTitle: function(title){
		title = title || "未命名";

		this.title = title;

		global.starfishBridge("showTitle", title);
	},

	getTitle: function(title) {
		return this.title;
	},

	// 重命名
	setTitle: function(title){
		this.showTitle(title);
	},

	getBack: function(){
		return window.starfishBack;
	},

	setBack: function(fn){
		window.starfishBack = fn;
	}
}