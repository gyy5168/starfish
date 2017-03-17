// 将这个模块分拆
var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	file = require("modules-common/file/file2.js"),
	filelistView = require("modules/filelist/filelist.js"),
	filelist = require("modules/collections/filelist.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	urlTool = require("modules-common/tools/url.js"),
	$ = require("modules-common/jquery/jquery.js");

// 上传和下载
global.data.uploadList = global.data.uploadList || new Backbone.Collection();
global.data.downloadList = global.data.downloadList || new Backbone.Collection();

// 短名字
var uploadList = global.data.uploadList,
	downloadList = global.data.downloadList;

// 是否拥有相应的权限
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

// 创建UUID
var uuidNum = 1;  //累加器
function createUUID(){
	var result = + new Date();
	result += "" + uuidNum++;
	return +result;
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
	var pathId = global.currentPath[global.currentPath.length - 1].id;

	// 获取当前目录路径
	var path = [];
	$.each( global.currentPath, function(index, obj){
		path.push(obj.name);
	} );
	path = path.join("/");

	// 选择文件，如果没有选择文件，则返回
	var data = file.selectFile();
	if (data === false) {
		return;
	}

	// 获取选择文件的名称，并参数化（用于检查是否有重名文件）
	var names = "";
	$.each(data, function(index, obj){
		names += "&name=" + obj.fileName;
	});

	// point.show({
	// 	text:"正在添加到上传列表"
	// });
	
	// 检查是否有重名文件
	$.ajax({
		url: global.data.org.get("domain") + "/orgs/"+ global.data.org.get("id") +"/file/files/check?parent=" + pathId + names,
		type:"GET",
		success: function(respone){
			if ( respone.errcode === 0 ) {

				var nameMap = {},
					files = [];
				
				// 标识重名和未重名的文件，方便下一步提取操作
				$.each(respone.data, function(index, obj){
					if(obj.id) {
						nameMap[obj.name] = true;
					} else {
						nameMap[obj.name] = false;
					}
				});

				// 提取重名的文件，上传不重名的文件
				$.each( data, function(index, obj){
					if (nameMap[obj.fileName]) {
						files.push(obj);
					} else {
						upload(obj);
					}
				});

				// 处理重名的文件
				handle(files);
									
			}else{
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

	// 处理重名文件
	function handle(data){
		// 如果没有重名的文件，则返回
		if ( data.length === 0 ) {
			return;
		}

		// 询问第一个重名文件，是否覆盖
		var obj = data.shift();
		confirm.show({
			text:"你上传的\"" +obj.fileName+ "\"已存在，是否确认覆盖？",
			callback: function(){
				upload(obj);
				handle(data);
			},
			cancelCallback: function(){
				handle(data);
			}
		});
	}

	// 上传文件
	function upload(obj){
		// 创建初始数据，添加到上传列表中
		obj.state = "wait";
		obj.extra = {
			filePath:path,
			pathId: pathId
		};

		uploadList.add(obj);

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
					replace:1
				}
			},

			extra: {
				pathId: pathId,
				filePath: path
			}
		};

		file.upload(option);
	
	}

		
});

// 下载文件
global.event.on("download", function() {
	
	// 获取需要下载的文件
	var itemViews = global.modules.fileList.getSelectedView();
	var arr = [],
		flag = false;

	// 判断是否有文件夹
	$.each(itemViews, function(index, itemView){
		var model = itemView.model,
			isFile = model.get("is_file");

		if (!isFile) {
			flag = true;
			return false;
		}
	});

	// 如果有文件夹，则返回
	if (flag) {

		point.shortShow({
			text: "暂不支持文件夹下载",
			type: 'error'
		});
		return ;
	}

	// 选择存储路径
	var data = file.selectPath();

	// 如果取消选择存储路径，则返回
	if (!data.path) {
		return;
	}

	// 循环调用框架下载接口，下载文件
	$.each(itemViews, function(index, itemView) {

		// 构建初始数据，填入下载列表数据中
		var model = itemView.model,
			id = model.get("id"),
			mimeType = model.get("mimetype"),
			name = model.get("name"),
			isFile = model.get("is_file"),
			obj = {};

		if (!isFile) {
			flag = true;
			return true;
		}

		obj.fileName = name;
		obj.id = id;
		obj.uuid = createUUID();

		downloadList.add(obj);

		// 设置参数（参照调用框架的文件下载接口，需要传递的配制）
		var option = {
			uuid: obj.uuid,
			path: data.path,
			fileName: name,
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/files/"+id+"/attachment",
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
		file.download(option);
	});
	
});

// 新建文件夹
var NewFolder = require("modules/new-folder/new-folder.js"),
	newFolder;

global.event.on("new", function() {
	if ( !hasPermisssins("upload") ) {
		point.shortShow({
			text:"在该目录下没有创建文件夹的权限",
			time: 2000
		});
		return;
	}
	if( !global.currentPath ) {
		point.shortShow({
			text:"文件列表还没加载出来，稍等一下"
		});
		return;
	}
	if (!newFolder) {
		newFolder = new NewFolder();
	}
	newFolder.show();
});


// 右键菜单
var Menu = require("modules/menu/menu.js"),
	menu;

global.event.on("menu", function(option) {
	if (!menu) {
		menu = new Menu();
	}
	menu.show(option);
});

// 移动文件
var Move = require("modules/move/move.js"),
	move;

global.event.on("move", function() {
	if (!move) {
		move = new Move();
	}
	move.show();
});

// 设置权限
var PermissionSet = require("modules/permissions-set/permissions-set.js"),
	permissionSet;

global.event.on("permissions", function(data){
	var $nodes = global.modules.fileList.getSelectedNode(),
		id = $nodes.first().data("id");

	if ( !permissionSet ) {
		permissionSet = new PermissionSet();
	}

	permissionSet.show();
	permissionSet.set( id );
});


// 分享文件
var Send = require("modules/send/send.js")

global.event.on("send", function(){
	var send = new Send();
	send.show();
});

// 传输列表
var TransferPanel = require("modules/transfer-panel/transfer-panel.js");

global.event.on("transferToggle", function(){
	if ( !global.modules.transferPanel ) {
		global.modules.transferPanel = new TransferPanel();
	}
	global.modules.transferPanel.toggle();
});





