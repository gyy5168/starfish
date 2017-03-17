var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	file = require("modules-common/file/file2.js"),
	ItemView = require("../transfer-item/transfer-item.js"),
	$ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({

	initialize: function( ){
		this.list = global.data.uploadList;
		this.render();
		this.initEvent();
		// this.recoveryFile();

		var that = this;
		if (this.list.length === 0 ) {
			this.$empty.show();
			this.$list.hide();
		} else {
			this.list.each(function(model){
				that.addItem(model);
			});
		}

	},

	render: function( option ){
		this.$el.html(__inline("transfer-upload.html"));
		this.$list = this.$el.find("ul");
		this.$empty = this.$el.find(".JS-empty");
	},

	initEvent: function(){
		var that = this;

		this.listenTo(this.list, "add", this.addItem);

		this.listenTo(this.list, "remove", this.removeItem);

		this.listenTo( this.list, "add remove destroy reset", function(){
			if ( that.list.length === 0 ) {
				that.$list.hide();
				that.$empty.show();
			} else {
				that.$empty.hide();
				that.$list.show();
			}
		});

		this.$list.on("click", ".JS-re", function(){
			var uuid = $( this ).closest("li").data("uuid");

			file.reUpload({
				uuid: uuid
			});
		});

		this.$list.on("click", ".JS-cancel", function(){
	
			var uuid = $( this ).closest("li").data("uuid"),
				model;
			
			model = that.list.find(function(model){
				return model.get("uuid") == uuid;
			});

			if ( model.get("state") !== "success" ) {
				file.cancelUpload({
					uuid: uuid
				});
			}

			if ( model ) {
				that.list.remove(model);
			}
		});
	},

	// 恢复框架正在上传和上传错误
	recoveryFile: function(){
		var data = file.getTransferState("upload"),
			that = this;
		data = data.upload;

		// 添加model到列表中
		$.each(data, function(index, obj) {
			obj.fileName = obj.name;
			that.list.add(obj);
		});

		// 添加对应的回调
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

				success: function(respone) {
					var model = that.list.find(function(model) {
						return model.get("uuid") == obj.uuid;
					});

					var model = that.list.find(function(model) {
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

	addItem: function(model) {
		var itemView = new ItemView({
				model: model,
				type: "upload"
			});

		this.$list.append(itemView.$el);
	},

	removeItem: function( model ) {
		model.view.destroy();
	},

	destroy: function(){
		this.$el.removeData();
		this.$el.remove();
	},

	attributes:{
		class:"transfer-upload"
	}
});



module.exports = View;