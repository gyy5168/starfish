// 将这个模块分拆
var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	file = require("modules-common/file/file2.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	$ = require("modules-common/jquery/jquery.js");

// 短名字
var uploadList = global.data.uploadList;

// 查看用户在当前目录是否有相应的权限
function hasPermisssins(str) {
	// 获取当前目录的权限列表
	var permissions = global.currentPermissions;

	// 如果没有权限列表，说明在是根目录
	// 所有人对根目录有所有的权限
	if ( !permissions ) {
		return true;
	}

	// 判断权限列表中，室友含有相应的权限
	var flag = false;
	$.each(permissions, function(index, permission){
		if ( permission === str ) {
			flag = true;
			return false;
		}
	});

	return flag;
}

// 获取当前的目录路径
function getCurrentPath(){
	var path = [];
	$.each( global.currentPath, function(index, obj){
		path.push(obj.name);
	} );
	path = path.join("/");
	return path;
}

function askCover(files, path, pathId){
	// 如果没有重名的文件，则返回
	if ( files.length === 0 ) {
		return;
	}

	// 询问第一个重名文件，是否覆盖
	var obj = files.shift();
	confirm.show({
		text:"你上传的\"" +obj.fileName+ "\"已存在，是否确认覆盖？",
		callback: function(){
			upload(obj, path, pathId, true);
			askCover(files, path, pathId);
		},
		cancelCallback: function(){
			askCover(files, path, pathId);
		}
	});
}

function hasDuplicateName(arr, pathId){
	var nameQuery = "";
	_.each( arr, function(obj){
		nameQuery += "&name=" + obj.fileName;
	});

	return $.ajax({
		url: global.data.org.get("domain") + "/orgs/"+ global.data.org.get("id") +
			"/file/files/check?parent=" + pathId + nameQuery,
		type:"GET",
		success: function(respone){
			if(respone.errcode!=0){
				point.shortShow({
					text: global.tools.getErrmsg(data.errcode),
					type: 'error'
				});
			}
		},

		error: function(){
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
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

				global.event.trigger("fileUploaded", respone.httpData.data);
			}

		},

		error: function(respone) {
			console.log( respone)
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

	var uploadResponse = file.upload(option);
	uploadResponse = JSON.parse(uploadResponse);

	if ( uploadResponse.data && uploadResponse.data.isStart ) {
		uploadList.add(obj);
	}
}

// 如果打开页面之前已有正在上传的文件， 则将它们的添加到页面中
function recoveryFile(){
	if ( !(window.starfish && window.starfish.getTransferState) ){
		return;
	}
	// 获取正在上传的文件
	var data = file.getTransferState("upload").upload;

	// 添加到上传列表中
	$.each(data, function(index, obj) {
		obj.fileName = obj.name;
		uploadList.add(obj);
	});

	// 添加对应的回调
	$.each(data, function(index, obj) {
		obj.fileName = obj.name;
		file.addUploadCallback({
			uuid: obj.uuid,
			progress: function(data) {
				var model = uploadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				if (model) {
					model.set("state", "progress");
					model.set("progress", data.progress);
				}
			},

			success: function(respone) {
				var model = uploadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				var model = uploadList.find(function(model) {
						return model.get("uuid") == obj.uuid;
					});

				if (model) {
					var data = respone.httpData;
					
					if ( data ) {
						model.set(respone.httpData.data[0]);
					} else {
						model.set("id", respone.fileId);
					}

					model.set("state", "success");
				}
			},

			error: function(respone) {
				var model = uploadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				if (model) {
					model.set("state", "error");
				}
			}
		});
	});
}

function getStrLength(str){
	var realLength = 0, len = str.length, charCode = -1;
    for (var i = 0; i < len; i++) {
        charCode = str.charCodeAt(i);
        if (charCode >= 0 && charCode <= 128) realLength += 1;
        else realLength += 2;
    }
    return realLength;
}

// 上传文件
global.event.on("upload", function() {

	// 如果没有上传权限，则返回
	if ( !hasPermisssins("upload") ) {
		point.shortShow({
			text:"在该目录下没有上传权限"
		});
		return;
	}

	// 获取当前目录ID
	var pathId = global.currentPath[global.currentPath.length - 1].id,
		path = getCurrentPath();

	// 选择要上传的文件，如果返回值为空， 则说明用户取消了选择文件
	var selectData = file.selectFile();
	if (selectData === false) {
		return;
	}

	var flag = false;
	_.find(selectData, function(data) {
		var length = getStrLength(data.fileName);
		if ( length > 100 ) {
			point.shortShow({
				text:"上传的文件名过长，字符不能超过50个"
			});
			flag = true;
			return true;
		}
	});
	if( flag ) {
		return;
	}

	// 是否有同名文件
	hasDuplicateName(selectData, pathId).success(function(respone){
		if ( respone.errcode !== 0 ) {
			return;
		}

		// 分析出有同名的文件和没有同名的文件
		var cache = {},
			duplicateNameFiles = [];

		_.each(respone.data, function(obj){
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

		// 只有拥有删除权限的用户， 才能替换文件
		// if ( hasPermisssins("delete") ) {
		// 	// 询问是否覆盖同名文件
		// 	askCover(duplicateNameFiles, path, pathId);
		// } else {
		// 	point.shortShow({
		// 		text:"该目录已存在同名文件，你没有覆盖权限",
		// 		time:2000
		// 	});
		// }

		
	});		
});

recoveryFile();



