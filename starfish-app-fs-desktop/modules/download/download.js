// 将这个模块分拆
var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	file = require("modules-common/file/file2.js"),
	$ = require("modules-common/jquery/jquery.js");

// 短名字
var	downloadList = global.data.downloadList;

// 生成唯一ID
var createUUID = function(){
	var uuid = 1;
	return function(){
		var result = + new Date();
		result += "" + uuid++;
		return +result;
	}
}();

// 判断是否有目录
function hasDir(itemViews){
	var model = _.find(itemViews, function(view){
		var isFile = view.model.get("is_file");
		return !isFile;
	});

	return !!model;
}

// 下载文件
function downloadFiles(itemViews, path){
	_.each( itemViews, function(view){

		var model = view.model,
			obj = {};

		obj.fileName = model.get("name");
		obj.id = model.get("id");
		obj.uuid = createUUID();
		obj.state = "wait";

		// 设置参数（参照调用框架的文件下载接口，需要传递的配制）
		var option = {
			uuid: obj.uuid,
			path: path,
			fileName: obj.fileName,
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+
				"/file/files/"+obj.id+"/attachment",
			progress: function(respone) {
				var model = downloadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				if (model) {
					model.set("state", "progress");
					model.set("progress", respone.progress);
				}
			},

			success: function(respone) {

				var model = downloadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				if (model) {
					model.set("state", "success");
				}

			},

			error: function(respone) {

				var model = downloadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				if (model) {
					model.set("state", "error");
				}
			}
		};

		var downloadRespnse = file.download(option);
		downloadRespnse = JSON.parse(downloadRespnse);

		if ( downloadRespnse.data && downloadRespnse.data.isStart ) {
			downloadList.add(obj);
		}

	});
}

// 如果打开页面之前已有正在下载的文件， 则将它们的添加到页面中
function recoveryFile(){
	if ( !(window.starfish && window.starfish.getTransferState) ){
		return;
	}
	// 获取正在下载的文件的列表
	var data = file.getTransferState("download").download;

	// 添加下载列表中
	$.each(data, function(index, obj) {
		obj.fileName = obj.name;
		downloadList.add(obj);
	});

	// 添加对应的回调逻辑函数
	$.each(data, function(index, obj) {
		obj.fileName = obj.name;
		file.addDownloadCallback({
			uuid: obj.uuid,
			progress: function(data) {
				var model = downloadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				if (model) {
					model.set("state", "progress");
					model.set("progress", data.progress);
				}
			},

			success: function(respone) {
				var model = downloadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				var model = downloadList.find(function(model) {
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
				var model = downloadList.find(function(model) {
					return model.get("uuid") == obj.uuid;
				});

				if (model) {
					model.set("state", "error");
				}
			}
		});
	});
}


// 绑定下载事件
global.event.on("download", function() {
	
	// 获取需要文件列表选中的文件
	var itemViews = global.modules.fileList.getSelectedView();

	// 咱不支持文件夹下载
	if ( hasDir(itemViews) ) {
		point.shortShow({
			text: "暂不支持文件夹下载",
			type: 'error'
		});
		return ;
	}

	var pathData = file.selectPath();
	// 如果拿不到数据， 说明用户取消的路径的选择
	if ( !pathData || pathData.path === "" ) {
		return;
	}

	downloadFiles( itemViews, pathData.path );
	
});

recoveryFile();








