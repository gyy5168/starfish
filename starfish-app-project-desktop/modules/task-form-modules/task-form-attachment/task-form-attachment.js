var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	file = require("modules-common/file/file2.js"),
	ItemView = require("modules/task-form-modules/task-form-attachment-item/task-form-attachment-item.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "task-form-attachment"
	},

	initialize: function(option) {
		option = option || {};
		this.type = option.type || "create";

		this.list = new Backbone.Collection();
		this.render();
		this.initEvent();
		this.initChildEvent();

		if ( this.type !== "detail" ) {
			this.recoveryCallback();
		}
	},

	render: function() {
		this.$el.html(__inline("task-form-attachment.html"));
		this.$add = this.$el.find(".JS-add");
		this.$list = this.$el.find(".JS-list");

		if( this.type === "create" ) {
			this.$el.addClass("create");
		}
	},

	initEvent: function() {
		var that = this;

		this.listenTo(this.list, "add", this.addItem);

		this.listenTo(this.list, "remove", function(model) {
			model.view.destroy();
		});

		if (this.type === "detail") {
			this.listenTo(this.list, "change:state", function(model, value) {
				if (value == "success") {
					that.taskModel.get("attachments").push(model.toJSON());
				}
			});
		}

		this.$add.on("click", function() {
			var data = file.selectFile();
			if (data === false) {
				return;
			}

			$.each(data, function(index, obj) {
				obj.state = "wait";

				if ( obj.fileSize !== 0 ) {
					that.list.add(obj);
				}
				
				var option = {
					uuid: obj.uuid,
					progress: function(response) {
						var model = that.list.find(function(model) {
							return model.get("uuid") == obj.uuid;
						});

						if (model) {
							model.set("state", "progress");
							model.set("progress", response.progress);
						}
					},

					success: function(response) {

						var model = that.list.find(function(model) {
							return model.get("uuid") == obj.uuid;
						});

						if (model) {
							var data = response.httpData;
							
							if ( data ) {
								model.set(response.httpData.data[0]);
							} else {
								model.set("id", response.fileId);
							}
	
							model.set("state", "success");
						}

					},

					error: function(response) {

						var model = that.list.find(function(model) {
							return model.get("uuid") == obj.uuid;
						});

						if (model) {
							model.set("state", "error");
						}
					}
				};

				if (that.type === "detail") {
					option.http = {
						url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + that.taskId + "/attachments",
						type: "POST",
						data: [{
							bfs_file_id: "$ID",
							name: "$FILENAME"
						}]
					};

					option.extra = {
						taskId: that.taskId
					};
				} else {
					option.extra = {
						taskCreate: true
					};
				}

				file.upload(option);
			});
		});
	},

	initChildEvent: function() {
		var that = this;

		this.$el.on("click", ".JS-cancel", function() {

			var $parent = $(this).parent(),
				view = $parent.data("view"),
				model = view.model,
				state = model.get("state");

			if (that.type === "create") {
				if (state !== "success") {
					file.cancelUpload({
						uuid: model.get("uuid")
					});
				}
				that.list.remove(model);
				return;
			}

			if (state !== "success") {
				file.cancelUpload({
					uuid: model.get("uuid")
				});
				that.list.remove(model);
				return;
			}

			var id = model.get("id");

			// console.log(id)
			$.ajax({
				url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + that.taskId + "/attachments/" + id,
				type: "DELETE",
				success: function(response) {
					if (response.errcode === 0) {
						that.list.remove(model);

						var attachments = that.taskModel.get("attachments");
						$.each(attachments, function(index, obj) {
							if (obj.id == id) {
								attachments.splice(index, 1);
								return;
							}
						});
					} else {
						point.shortShow({
							type:"error",
							text:global.tools.getErrmsg(response.errcode)
						});
					}
				},
				error: function() {
					point.shortShow({
						type: "error",
						text: "删除附件失败，稍后请重试"
					});
				}
			});
		});

		this.$el.on("click", ".JS-download", function() {
			var $parent = $(this).parent(),
				view = $parent.data("view"),
				model = view.model;

			var data = file.selectPath();

			if (!data.path) {
				return;
			}

			var id = model.get("id");
			file.download({
				url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + that.taskId + "/attachments/" + id + "/attachment",
				fileName: model.get("fileName"),
				path: data.path
			});

		});

		this.$el.on("click", ".JS-reload", function() {
			var $parent = $(this).parent(),
				view = $parent.data("view"),
				model = view.model;

			file.reUpload({
				uuid: model.get("uuid")
			});
		});

		this.$el.on("click", ".JS-name", function() {

			var $parent = $(this).parent(),
				view = $parent.data("view"),
				model = view.model,
				state = model.get("state");

			if (that.type === "create" || state !== "success") {
				return;
			}

			var data = model.toJSON();

			// console.log({
			// 	url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + that.taskId + "/attachments/" + data.id + "/attachment",
			// 	fileName: data.fileName,
			// 	mimeType: data.mimetype
			// })

			file.openRemote({
				url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + that.taskId + "/attachments/" + data.id + "/attachment",
				fileName: data.fileName,
				mimeType: data.mimetype
			});
		});
	},

	// 把框架正在上传的文件添加到回调中
	recoveryCallback: function() {
		var data = file.getTransferState("upload"),
			that = this;

		data = data.upload;

		$.each(data, function(index, obj) {
			obj.fileName = obj.name;
			file.addUploadCallback({
				uuid: obj.uuid,
				progress: function(data) {
					var model = that.list.find(function(model) {
						return model.get("uuid") == obj.uuid;
					});

					if (model) {
						model.set("state", "progress");
						model.set("progress", data.progress);
					}


				},

				success: function(response) {
					var model = that.list.find(function(model) {
						return model.get("uuid") == obj.uuid;
					});

					var model = that.list.find(function(model) {
							return model.get("uuid") == obj.uuid;
						});

					if (model) {
						var data = response.httpData;
						
						if ( data ) {
							model.set(response.httpData.data[0]);
						} else {
							model.set("id", response.fileId);
						}

						model.set("state", "success");
					}

					// if (model) {

					// 	model.set(response.httpData.data[0]);
					// 	model.set("state", "success");
					// }
				},

				error: function(response) {
					var model = that.list.find(function(model) {
						return model.get("uuid") == obj.uuid;
					});

					if (model) {
						model.set("state", "error");
					}
				}
			});
		});
	},

	// 吧框架上传的文件添加到list中
	recoveryList: function() {
		var data = file.getTransferState("upload"),
			that = this;
		data = data.upload;

		$.each(data, function(index, obj) {
			obj.fileName = obj.name;
			// if ( obj.extra.taskCreate && that.type === "create") {
			// 	that.list.add(obj);
			// 	return;
			// }
			var taskId = obj.extra && obj.extra.taskId;
			if (taskId == that.taskId) {
				that.list.add(obj);
			}
		});
	},

	addItem: function(model, list, option) {
		var view = new ItemView({
			model: model,
			type: this.type
		});
		this.$list.append(view.$el);
	},

	get: function() {
		var arr = [];

		this.list.each(function(model) {
			var state = model.get("state");
			if (state === "success") {
				arr.push({
					bfs_file_id: model.get("id"),
					name: model.get("fileName")
				});
			}
		});

		return arr;
	},

	isSuccess: function(){
		var flag = true;
		this.list.each( function(model){
			var state = model.get("state");
			if ( state !== "success" ) {
				flag = false;
				return false;
			}
		});

		return flag;
	},

	getState: function() {
		var obj = {
			uncomplete: 0,
			complete: 0,
			error: 0
		};
		this.list.each(function(model) {
			var state = model.get("state");
			if (state === 1 || state === 2) {
				obj.uncomplete++;
			} else if (state === 3) {
				obj.complete++;
			} else if (state === 4) {
				obj.error++
			}
		});

		return obj;
	},

	set: function(option) {
		var that = this;
		this.clear();
		this.taskId = option.taskId;
		this.moduleId = option.taskId;
		this.taskModel = option.taskModel;
		$.each(option.data, function(index, data) {
			data.fileName = data.filename;
			data.fileSize = data.filesize;
			data.state = "success";
			that.list.add(data);
		});

		if ( this.type !== "create" ) {
			this.recoveryList();
		}
		
	},

	clear: function() {
		var arr = [],
			that = this;
		this.list.each(function(model) {
			arr.push(model);
		});
		$.each(arr, function(index, model) {
			that.list.remove(model);
		});
	},

	destroy: function() {
		this.clear();
		this.remove();
	}
});

module.exports = View;