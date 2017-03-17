var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	fileDirectory = require("modules/file-directory/file-directory.js"),
	tools = require("modules-common/tools/tools.js"),
	point = require("modules-common/point/point.js");

// 删除
var removeDataing = false;
function removeData(arr){
	if ( removeDataing ) {
		return;
	}

	removeDataing = true;
	point.show({
		text:"正在删除..."
	});

	// 获取要删除的文件的id数组
	var idArr = _.pluck(arr, "id");

	return $.ajax({
		url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+
			"/file/files/" + idArr.join(","),
		type:"DELETE",
		success: function(response){
			if ( response.errcode === 0 ) {
				point.shortShow({
					type:"success",
					text:"删除成功"
				});
				// 成功后，抛出删除文件事件
				global.event.trigger("fileRemoved", idArr);
			} else {
				point.shortShow({
					type:"error",
					text:"删除失败," + tools.getErrmsg(response.errcode)
				});
			}

		},

		error: function(){
			point.shortShow({
				type:"error",
				text:global.texts.netError
			});
		},

		complete: function(){
			removeDataing = false;
		}
	});
}

// 判断自己是否有删除这些文件的权限
function hasPermission(arr){
	var flag = _.find( arr, function(obj) {
		return !fileDirectory.isAllow("delete", obj.permissions);
	});
	return !flag;
}

// 监听删除事件
global.event.on("remove", function(arr){
	if ( !hasPermission( arr ) ) {
		point.shortShow({
			text:"你没有权限删除该文件"
		});
		return;
	}

	confirm.show({
		text:"确定删除选中的文件?",
		okCallback: function(){
			removeData(arr)
		}
	});
});
