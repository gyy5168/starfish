var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	file = require("modules-common/file/file.js");

var uploadList = global.data.uploadList || (global.data.uploadList = new Backbone.Collection());


// 获取正在上传的文件
file.getTransferState("upload", function(response){

	var data = response.upload;

	if ( !data) {
		return;
	}

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

					global.event.trigger("fileNewed", respone.httpData.data);
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
		});
	});
});


module.exports = {

};