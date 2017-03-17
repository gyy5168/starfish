var _ = require("modules-common/underscore/underscore.js");

// 该函数用来调用框架的接口
// 由于IOS、android两个平台与webview的通信方式不一致，所以需要分别实现
// 参数 name 是的框架对应文件的能力的名字，例如 upload、reupload
// 参数 data 是要传递给框架的数据
// 参数 callback 框架执行完操作后，调用的回调函数
var starfishBridge = function(name, data, callback){};


if ( global.platform === "ios" ) {
	// IOS， 通过WebViewJavascriptBridge这个第三方的框架实现，详情请搜索WebViewJavascriptBridge
	var WebViewJavascriptBridge = require("modules-common/webview-javascript-bridge/webview-javascript-bridge.js");

	WebViewJavascriptBridge.init();
	starfishBridge = function(name, data, callback){
		window.WebViewJavascriptBridge.callHandler(name, data, callback);
	}
}

// android，由于该平台没有第三方的框架, 所以需要单独显示， 原理和机制类似于上面的WebViewJavascriptBridge
if ( global.platform === "android" ) {

	// 定义android的回调函数缓存
	var androidCallback = {};

	// 创建唯一ID
	var createID = function(){
		var id = 1;
		return function(){
			var result = + new Date();
			result += "" + id++;
			return +result;
		}
	}();

	// 定义安卓调用js的回调函数的统一入口
	window._starfishBridgeHandle = function(id, param, flag){
		if ( !flag ) {
			androidCallback[id] && androidCallback[id]( param );
		}
		delete androidCallback[id];
	}

	starfishBridge = function( name, data, callback ) {
		var id = createID();

		if ( data === undefined && callback === undefined) {
			window.starfish[name]();
			return;
		}

		data = data || {};

		callback = callback || data.callback;
		if ( callback ) {
			androidCallback[id] = callback;
			data.callback = id;
		}
		
		if( !_.isString(data) ) {
			data = JSON.stringify(data)
		}

		window.starfish[name]( data );
	}
}

module.exports = starfishBridge;