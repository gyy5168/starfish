var $ = require("modules-common/jquery/jquery.js");

var uploadCallbacks = {
		progress: [],
		state: [],
		all: []
	},
	downloadCallbacks = {
		progress: [],
		state: [],
		all: []
	}

	
window.starfishFile = function(data) {

	data = data.replace(/\'/g, "\"");
	data = JSON.parse(data);

	if (data.type === "upload") {

		$.each(uploadCallbacks.all, function(index, fn) {
			fn(data.data);
		});

		if (data.changeType === "progress") {
			$.each(uploadCallbacks.progress, function(index, fn) {
				fn(data.data);
			});
			return;
		}

		if (data.changeType === "state") {
			$.each(uploadCallbacks.state, function(index, fn) {
				fn(data.data);
			});
			return;
		}
		return;
	}
	if (data.type === "download") {

		$.each(downloadCallbacks.all, function(index, fn) {
			fn(data.data);
		});

		if (data.changeType === "progress") {
			$.each(downloadCallbacks.progress, function(index, fn) {
				fn(data.data);
			});
			return;
		}

		if (data.changeType === "state") {
			$.each(downloadCallbacks.state, function(index, fn) {
				fn(data.data);
			});
			return;
		}
		return;
	}
}
var file = {
	upload: function(param) {
		param = JSON.stringify(param);
		window.starfish.uploadFile(param)
	},

	download: function(param) {
		param = JSON.stringify(param);
		window.starfish.downloadFile(param);
	},

	openRemote: function(param) {
		param = JSON.stringify(param);
		window.starfish.openRemoteFile(param);
	},

	getTransferState: function(param) {

		function handle(respone) {
			respone = JSON.parse(respone);
			if (respone.errcode === 0) {
				param.success && param.success(respone);
			} else {
				param.error && param.error(respone);
			}
		}
		handle(window.starfish.getTransferState(param.data));
	},

	uploadCallback: {
		state: function(fn) {
			uploadCallbacks.state.push(fn);
		},

		offState: function(fn){
			$.each(uploadCallbacks.state, function(index, obj) {
				if ( obj === fn ) {
					uploadCallbacks.state.splice(index, 1);
					return;
				}
			});
		},
		progress: function(fn) {
			uploadCallbacks.progress.push(fn);
		},
		offProgress: function(fn){
			$.each(uploadCallbacks.progress, function(index, obj) {
				if ( obj === fn ) {
					uploadCallbacks.progress.splice(index, 1);
					return;
				}
			});
		},
		all: function(fn) {
			uploadCallbacks.all.push(fn);
		},
		offAll: function(fn){
			$.each(uploadCallbacks.all, function(index, obj) {
				if ( obj === fn ) {
					uploadCallbacks.all.splice(index, 1);
					return;
				}
			});

		}
	},

	downloadCallback: {
		state: function(fn) {
			downloadCallbacks.state.push(fn);
		},


		offState: function(fn){
			$.each(downloadCallbacks.state, function(index, obj) {
				if ( obj === fn ) {
					downloadCallbacks.state.splice(index, 1);
					return;
				}
			});
		},
		progress: function(fn) {
			downloadCallbacks.progress.push(fn);
		},

		offProgress: function(fn){
			$.each(downloadCallbacks.progress, function(index, obj) {
				if ( obj === fn ) {
					downloadCallbacks.progress.splice(index, 1);
					return;
				}
			});
		},

		all: function(fn) {
			downloadCallbacks.all.push(fn);
		},

		offAll: function(fn){
			$.each(downloadCallbacks.all, function(index, obj) {
				if ( obj === fn ) {
					downloadCallbacks.all.splice(index, 1);
					return;
				}
			});

		}
	},

	restart: function(param) {
		window.starfish.restartFile(JSON.stringify(param));
	},

	cancel: function(param) {
		window.starfish.cancelFile(JSON.stringify(param));
	}
};

module.exports = file;