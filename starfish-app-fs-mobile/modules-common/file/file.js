// 封装文件操作
var uploadCallbacks = {},
	downloadCallbacks = {};

window.starfishFile = function(respone) {
	var callbacks;

	respone.transferType = respone.transferType || respone.type;

	if ( respone.transferType === "upload" ) {
		callbacks = uploadCallbacks[respone.data.uuid];
	} else {
		callbacks = downloadCallbacks[respone.data.uuid];
	}

	if ( !callbacks ) {
		return;
	}

	function handle( fns, data ) {
		if ( !fns ){
			return;
		}
		$.each( fns, function(index, fn){
			fn(data);
		});
	}

	if( respone.state === "progress" ){
		handle(callbacks.progress, respone.data);
		return;
	}

	if (respone.state === "success" ) {
		handle(callbacks.success, respone.data);
		handle(callbacks.complete, respone.data);
		callbacks = null;
		return;
	}

	if (respone.state === "error" ) {
		handle(callbacks.error, respone.data);
		handle(callbacks.complete, respone.data);
		// callbacks = null;
		return;
	}
}

var uuid = 1;
function createUUID(){
	var result = + new Date();
	result += "" + uuid++;
	return +result;
}

var file = {
	selectFile: function(callback){
		global.starfishBridge("selectFile", null, callback);
	},

	addCallback: function( type, param){
		var cache,
			uuid = param.uuid || param.id;
		if ( type === "upload" ) {
			uploadCallbacks[uuid] = uploadCallbacks[uuid] || {};
			cache = uploadCallbacks[uuid];
		} else {
			downloadCallbacks[uuid] = downloadCallbacks[uuid] || {};
			cache = downloadCallbacks[uuid];
		}

		if ( param.success ) {
			cache.success = cache.success || [];
			cache.success.push( param.success );
		}

		if ( param.error ) {
			cache.error = cache.error || [];
			cache.error.push( param.error );
		}

		if ( param.progress ) {
			cache.progress = cache.progress || [];
			cache.progress.push( param.progress );
		}

		if ( param.complete ) {
			cache.complete = cache.complete || [];
			cache.complete.push( param.complete );
		}
	},

	addUploadCallback: function(param){
		this.addCallback( "upload", param );
	},

	addDownloadCallback: function(param){
		this.addCallback( "download", param );
	},

	removeCallback: function( type, param){
		var cache,
			uuid = param.uuid || param.id;
		if ( type === "upload" ) {
			cache = uploadCallbacks[uuid];
			if ( !cache ) {
				return;
			}
		} else {
			cache = downloadCallbacks[uuid];
			if ( !cache ) {
				return;
			}
		}

		function handle(arr, fn) {
			if ( !arr ) {
				return;
			}
			$.each(arr, function(index, value){
				if ( fn === value ) {
					arr.splice(index, 1);
					return false;
				}
			});
		}

		param.success && handle(cache.success, param.success);
		param.error && handle(cache.error, param.error);
		param.progress && handle(cache.progress, param.progress);
		param.complete && handle(cache.complete, param.complete);
	},

	removeUploadCallback: function(param){
		this.removeCallback( "upload", param );
	},

	removeDownloadCallback: function(param){
		this.removeCallback( "download", param );
	},

	clearUploadCallback: function(param){
		uploadCallbacks[param] = null;
	},

	clearDownloadCallback: function(param){
		downloadCallbacks[param] = null;
	},

	upload: function( param ) {
		var uuid = param.uuid || param.id;

		uploadCallbacks[uuid] = {};
		var callbacks = uploadCallbacks[uuid];

		if ( param.success ) {
			callbacks.success = [param.success];
		}

		if ( param.error ) {
			callbacks.error = [param.error];
		}

		if ( param.progress ) {
			callbacks.progress = [param.progress];
		}

		if ( param.complete ) {
			callbacks.complete = [param.complete];
		}

		var data = {
			uuid: uuid
		};

		if ( param.http ) {
			data.http = param.http
		}

		if ( param.extra ) {
			data.extra = param.extra
		}

		// data = JSON.stringify(data);
		global.starfishBridge("uploadFile", data);
		// return window.starfish.uploadFile(data);
	},

	download: function( param ) {
		var uuid = param.uuid || createUUID();

		downloadCallbacks[uuid] = {};
		var callbacks = downloadCallbacks[uuid];

		if ( param.success ) {
			callbacks.success = [param.success];
		}

		if ( param.error ) {
			callbacks.error = [param.error];
		}

		if ( param.progress ) {
			callbacks.progress = [param.progress];
		}

		if ( param.complete ) {
			callbacks.complete = [param.complete];
		}

		var data = {
			url: param.url,
			uuid:uuid
		};

		if ( param.fileName ) {
			data.fileName = param.fileName;
		}

		if ( param.path ) {
			data.path = param.path;
		}

		if ( param.fileId ) {
			data.fileId = param.fileId;
		}

		if ( param.extra ) {
			data.extra = param.extra;
		}
		
		data = JSON.stringify(data);
		return window.starfish.downloadFile(data);
	},

	reUpload: function( param ){
		global.starfishBridge("reUploadFile",{
			uuid: param.uuid
		});
		// var callbacks = uploadCallbacks[param.uuid] = {};
		// if ( param.success ) {
		// 	callbacks.success = [param.success];
		// }

		// if ( param.error ) {
		// 	callbacks.error = [param.error];
		// }

		// if ( param.progress ) {
		// 	callbacks.progress = [param.progress];
		// }

		// if ( param.complete ) {
		// 	callbacks.complete = [param.complete];
		// }
	},

	reDownload: function(param){
		global.starfishBridge("reDownloadFile",{
			uuid: param.uuid
		});
	},

	cancelUpload: function(param){
		global.starfishBridge("cancelUploadFile",{
			uuid: param.uuid
		});
		uploadCallbacks[param.uuid] = null;
	},

	cancelDownload: function(param){
		global.starfishBridge("cancelDownloadFile",{
			uuid: param.uuid
		});
		downloadCallbacks[param.uuid] = null;
	},

	openRemote: function(param){
		global.starfishBridge("openRemoteFile", param);
	},

	getTransferState: function( param, callback ){

		// global.starfishBridge( "getTransferState", {
		// 	value: param || "upload",
		// 	callback: callback
		// });
		global.starfishBridge( "getTransferState", {
			value: param || "upload"
		}, callback);
	}
};


module.exports = file;