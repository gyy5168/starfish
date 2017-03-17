var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js");

var Router = Backbone.Router.extend({

	// 需要显示页面内的某个组件时候，调此方法来改变url，这样，在网页刷新后，可以调用clearComponent来清除页内组件的相关的痕迹
	// 例如 确认框 当前url是test.html#home， 调用addComponent("confirm") => test.html#home?componment=1
	addComponent: function() {
		var value = this.getParam("_component");
		value = value || 0;
		value = (+value) + 1;
		this.replaceParam("_component", value);
	},

	// 清除页内组件在url的痕迹
	// 例如 当前url是test.html#home?componment=1, 调用clearComponent() => test.html#home
	// 该方法是通过回退网页的方式来清除componment， 这样，浏览器的历史栈是和网页状态一致的
	clearComponent: function() {
		var value = this.getParam("_component");
		if (!value) {
			return;
		}

		// value = this.normalizePath(value);
		// var valueArr = value.split("/");
		history.go(-value);
	},

	// 获取参数的字符串
	getParamString: function() {
		var match = (window || this).location.href.match(/\?(.*)$/);

		if (match) {
			return match[1];
		}
	},

	// 根据参数路由
	routeParamString: function(str, option) {
		var hash = this.getHash(),
			url = location.href;

		if ( hash === "" ) {
			hash = "/";
		}

		if (hash.indexOf("?") < 0) {
			hash = hash + "?" + str;
		} else {
			hash = hash.replace(/\?(.*)$/, "?" + str);
		}

		this.navigate(hash, option);
	},

	// 获取某个参数的值
	getParam: function(name) {
		if (!name) {
			return;
		}

		var params = this.getParamString();
		if (params === undefined) {
			return;
		}

		// 匹配查询的name
		var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i"),
			match = params.match(reg);

		if (match) {
			return match[2];
		}
	},

	// 删除某个参数的值
	removeParam: function(name, value) {
		if (!name) {
			return;
		}

		var params = this.getParamString();
		if (params === undefined) {
			return;
		}

		value = value || "([^&]*)";
		var reg = new RegExp("(^|&)" + name + "=" + value + "(&|$)", "ig");
		params = params.replace(reg, "");

		this.routeParamString(params);
	},

	// 添加某个参数
	addParam: function(name, value) {
		if (!name) {
			return;
		}

		var params = this.getParamString();
		params = params || "";

		params = params + "&" + name + "=" + value;
		params = params.replace(/^&/, "");
		params = params.replace(/&{2,}/, "&");

		this.routeParamString(params);
	},

	// 替换某个参数的值
	replaceParam: function(name, value) {
		if (!this.getParam(name)) {
			this.addParam(name, value);
			return;
		}
		var params = this.getParamString(),
			reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
		params = params.replace(reg, "$1" + name + "=" + value + "$3");

		this.routeParamString(params);
	},

	// 在已有的路由上加路由片段，例如, 当前url是#a/b， forwardFSegment("c")=>#a/b/c
	forwardFSegment: function(fragment, option) {
		var hash = this.getHash();
		hash = hash + "/" + fragment;
		hash = this.normalizePath(hash);
		this.navigate(hash, option);
	},

	// 在已有的路由上，返回到某一个片段，例如 当前url是#a/b/c， backFSegment("b")=>#a/b
	// 参数fragment 代表返回的片段
	// 参数i，代表在fragment的位置上，向前或者向后调整， 负数代表向前，正数代表向后，
	// 例如 当前url是#a/b/c， backFSegment("b"， -1) => #a
	backFSegment: function(fragment, i) {
		var index = this.IndexOfFSegmentFormRight(fragment);
		i = i || 0;
		if (index >= 0) {
			window.history.go(-index + i);
		}
	},

	// 返回该片段在路由上的位置， 例如， 当前Url是#a/b/c，indexOfFSegment("b")=>1 
	indexOfFSegment: function(fragment) {
		var hash = this.getHash(),
			hashArr = hash.split("/");

		return _.indexOf(hashArr, fragment);
	},

	// 返回该片段在路由上的倒序位置， 例如， 当前Url是#a/b/c，indexOfFSegment("a")=>2
	IndexOfFSegmentFormRight: function(fragment) {
		var hash = this.getHash(),
			hashArr = hash.split("/");

		return _.indexOf(hashArr.reverse(), fragment);
	},

	//是否含有某个片段
	hasFSegment: function(fragment) {
		var index = this.indexOfFSegment(fragment);
		return index >= 0;
	},

	// 格式化路径，例如 normalizePath("a///b//c/") => a/b/c
	normalizePath: function(path) {
		var str = path.replace(/\/{2,}/g, "/");
		str = path.replace(/\/$/, "");
		return str;
	},

	// 获取当前的片段
	getHash: function() {
		var hash = location.hash;

		// 去掉前面的#号
		hash = hash.length === 0 ? hash : hash.substring(1);

		hash = this.normalizePath(hash);

		return hash;
	}

});
module.exports = new Router();