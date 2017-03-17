var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	fileDirectory = require("modules/file-directory/file-directory.js"),
	file = require("modules-common/file/file.js"),
	tools = require("modules-common/tools/tools.js"),
	point = require("modules-common/point/point.js");

var uploadList = global.data.uploadList || (global.data.uploadList = new Backbone.Collection());

// 询问是否覆盖同名文件
function askCover(files, path, pathId){
	// 如果没有重名的文件，则返回
	if ( files.length === 0 ) {
		return;
	}

	// 询问第一个重名文件，是否覆盖
	var obj = files.shift();
	confirm.show({
		text:"你上传的\"" +obj.fileName+ "\"已存在，是否确认覆盖？",
		okCallback: function(){
			upload(obj, path, pathId, true);
			askCover(files, path, pathId);
		},
		cancelCallback: function(){
			console.log("cancelCallback")
			console.log(location.href)
			askCover(files, path, pathId);
			console.log("cancelCallback2")
			console.log(location.href)
		}
	});
}

// 判断是否有同名文件
function hasDuplicateName(arr, pathId){
	var nameQuery = "";
	_.each( arr, function(obj){
		nameQuery += "&name=" + obj.fileName;
	});
	return $.ajax({
		url: global.data.org.get("domain") + "/orgs/"+ global.data.org.get("id") +
			"/file/files/check?parent=" + pathId + nameQuery,
		type:"GET",
		success: function(response){
			if ( response.errcode !== 0 ) {
				point.shortShow({
					type:"error",
					text: "上传失败," + tools.getErrmsg(response.errcode)
				});
			}
		},

		error: function(){
			point.shortShow({
				type:"error",
				text:"上传失败，请检查网络"
			});
		}
	});
}

// 上传文件
function upload( obj, path, pathId, isReplace ) {
	// 创建初始数据，添加到上传列表中
	obj.state = "wait";
	obj.extra = {
		filePath:path,
		pathId: pathId
	};

	// 设置参数（参照调用框架的文件上传接口，需要传递的配制）
	var option = {
		uuid: obj.uuid,
		progress: function(respone) {
			var model = uploadList.find(function(model) {
				return model.get("uuid") == obj.uuid;
			});

			if (model) {
				model.set("state", "progress");
				model.set("progress", respone.progress);
			}
		},

		success: function(respone) {
			var model = uploadList.find(function(model) {
				return model.get("uuid") == obj.uuid;
			});

			if (model) {
				model.set(respone);
				model.set("id", respone.fileId);
				model.set("state", "success");

				global.event.trigger("fileNewed", {
					dirId: respone.extra.pathId,
					data: respone.httpData.data
				});
			}

		},

		error: function(respone) {

			var model = uploadList.find(function(model) {
				return model.get("uuid") == obj.uuid;
			});

			if (model) {
				model.set("state", "error");
			}
		},

		http: {
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files",
			type: "POST",
			data: {
				bfs_file_id: "$ID",
				name: "$FILENAME",
				parent: pathId,
				replace:isReplace ? 1 : 0
			}
		},

		extra: {
			pathId: pathId,
			filePath: path
		}
	};

	uploadList.add(obj);
	file.upload(option);


	// uploadResponse = JSON.parse(uploadResponse);

	// if ( uploadResponse.data && uploadResponse.data.isStart ) {
	// 	uploadList.add(obj);
	// }
}

global.event.on("upload", function(){

	if ( !fileDirectory.isAllow( "upload" ) ) {
		point.shortShow({
			text:"该目录下，你没有权限上传"
		});
		return;
	}

	file.selectFile(handle);

	function handle( selectData ){
		var pathId = fileDirectory.getCurrentId(),
			path = fileDirectory.getCurrentName();

		hasDuplicateName(selectData, pathId).then(function(response){
			if ( response.errcode !== 0 ) {
				return;
			}

			// 分析出有同名的文件和没有同名的文件
			var cache = {},
				duplicateNameFiles = [];

			_.each(response.data, function(obj){
				if ( obj.id ) {
					cache[obj.name] = true;
				}
			});

			// 上传没有同名的文件
			_.each(selectData, function(obj){
				if ( cache[obj.fileName] ) {
					duplicateNameFiles.push(obj);
				} else {
					upload(obj, path, pathId);
				}
			});

			// 询问是否覆盖同名文件
			askCover(duplicateNameFiles, path, pathId);
		});
	}

});


module.exports = {

};