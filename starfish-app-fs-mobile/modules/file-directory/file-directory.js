/**
 * @file 文件目录模块，根据服务器返回的数据（难懂），解析成易懂的目录数据
 */
var _ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/zepto/zepto.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var obj = $.extend({
	
	set: function( response ){
		this.data = this._setData( response );
		this.permissions = response.permissions;
		this.trigger("change");
	},

	// 将后台返回的数据，解析成数组
	_setData: function(response){
		var data = [];

		// 如果没有data，就认为是在根目录
		if ( !response.all_parents ) {
			data.push({
				id:0,
				name:"文件系统"
			});
			return data;
		}

		_.each(response.all_parents.ids, function(id, index){
			data.push({
				id:id,
				name: response.all_parents.names[index]
			});
		});

		data.push({
			id: response.id,
			name: response.name
		});
		return data;
	},

	// getPath: function(data){
	// 	data = data || this.data;
	// 	var paths = _.pluck(data, "name");
	// 	return paths.join("/");
	// },

	// getArr: function(){
	// 	return this.data;
	// },

	// 获取当前目录的ID
	getCurrentId: function(data){
		data = data || this.data;
		return data[data.length-1].id;
	},

	// 获取当前目录的名字
	getCurrentName: function(data){
		data = data || this.data;
		return data[data.length-1].name;
	},

	// 当前目录是否允许该操作
	isAllow: function(permission, arr ){
		arr = arr || this.permissions;
		if ( !arr ) {
			return true;
		}

		var flag = _.find( arr, function(str){
			return permission === str;
		});

		return !!flag;
	}

}, Backbone.Events);

module.exports = obj;



