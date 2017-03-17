var _ = require("modules-common/underscore/underscore.js");
module.exports = {
	toStr: function(obj) {
		var str = "";
		_.each(obj, function(value, key) {
			if (_.isArray(value)) {
				_.each(value, function(num) {
					str += "&" + key + "=" + num;
				});
			} else {
				str += "&" + key + "=" + value;
			}
		});
		if (str !== "") {
			str = str.substring(1);
		}
		return str;
	},

	//将x-www-form-urlencoded格式转换成对象
	toObj: function(str) {
		var obj = {},
			arr = str.split("&");
		_.each(arr, function(str) {
			var mid = str.split("="),
				key = mid[0],
				value = mid[1];

			if (!obj[key]) {
				obj[key] = [];
			}
			obj[key].push(value);

		});
		return obj;
	},

	getParam: function(str, name) {
		var reg = new RegExp("(&?)" + name + "=([^&]*)(&?)", "g"),
			result = [],
			arr;

		do {
			arr = reg.exec(str);
			if (arr !== null) {
				result.push(unescape(arr[2]));
			}

		} while (arr !== null)

		return result;
		// while( r = reg.exec(str))
		// var r = str.match(reg);
		// return r;
		// if (r != null) return unescape(r[2]);
		// return null;
	},

	removeParam: function(url, key) {
		if ( !url ) {
			return;
		}
		var pattern = key + '=([^&]*)';
		url = url.replace(new RegExp('(&?)(' + key + '=)([^&]*)', "g"), "");

		if (url.indexOf("&") === 0) {
			url = url.substr(1);
		}
		return url;
	},

	replaceParam: function(url, key, value) {
		var pattern = key + '=([^&]*)';

		var replaceText = key + '=' + value;

		if (url.match(pattern)) {

			var tmp = new RegExp('(' + key + '=)([^&]*)');

			tmp = url.replace(tmp, replaceText);

			return tmp;

		} else {
			if (url == "") {
				return replaceText;
			}
			return url + '&' + replaceText;
			// if (url.match('[\?]')) {

			// 	return url + '&' + replaceText;

			// } else {

			// 	return url + '?' + replaceText;

			// }

		}

		// return url + '\n' + key + '\n' + value;

	}
};