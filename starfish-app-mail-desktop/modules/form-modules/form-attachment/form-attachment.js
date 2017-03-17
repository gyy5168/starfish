var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	file = require("modules-common/file/file2.js"),
	ItemView = require("modules/form-modules/form-attachment-item/form-attachment-item.js");

var View = Backbone.View.extend({
	tagName: "div",

	initialize: function(option) {
		this.render();
		this.$list = this.$el.find("ul");
		this.$btn = this.$el.find(".JS-btn");

		if ( option.class ) {
			this.$el.addClass(option.class);
		}

		this.list = new Backbone.Collection();
		this.initEvent();
	},

	render: function() {
		this.$el.append(__inline("form-attachment.html"));
		return this.$el;
	},

	initEvent: function(){
		var that = this;
		this.listenTo( this.list, "add", function( model ) {
			var view = new ItemView({
				model:model
			});
			this.$list.append( view.$el );
		});

		this.listenTo( this.list, "remove", function(model){
			model.view.destroy();
		});

		this.$btn.on("click", function(){
			var data = file.selectFile();
			if ( !data ) {
				return;
			}

			$.each( data, function( index, obj ) {
				obj.state = "wait";

				var option = {
					uuid: obj.uuid,

					progress: function(respone){
						var model = that.list.find(function(model) {
							return model.get("uuid") == obj.uuid;
						});
			

						if (model) {
							model.set("state", "progress");
							model.set("progress", respone.progress);
						}
					},

					success: function(respone) {

						var model = that.list.find(function(model) {
							return model.get("uuid") == obj.uuid;
						});
				

						if (model) {
							model.set("id", respone.fileId);
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
					},

					extra:{
						create:true
					}
				};

				if ( obj.fileSize === 0 ) {
					point.shortShow({
						type:"error",
						text:"不能上传大小为0的文件"
					});
					return;
				}
				that.list.add(obj);
				file.upload(option);
			});

		});

		this.$el.on("click", ".JS-cancel",function(){
			var model = $( this ).closest("li").data("view").model;

			if ( model.get("state") !== "success" ) {
				file.cancelUpload({
					uuid: model.get("uuid")
				});
			}

			that.list.remove(model);

		});

		this.$el.on("click", ".JS-re",function(){
			var model = $( this ).closest("li").data("view").model;

			file.reUpload({
				uuid: model.get("uuid")
			});

		});

		// this.callbackHandle = function(data) {

		// 	if ( data.extra.moduleId !== that.moduleId ){
		// 		return;
		// 	}
			
		// 	var model = that.list.get(data.uuid);
		// 	if (model) {
		// 		model.set(data);
		// 	} else {
		// 		that.list.add(data);
		// 	}
		// }

		// file.uploadCallback.all(this.callbackHandle);
	},

	clear: function(){
		var arr = [],
			that = this;
		this.list.each( function(model){
			arr.push( model );
		});
		$.each( arr, function( index, model ){
			that.list.remove( model );
		});
	},

	getState: function(){
		var obj = {
			wait:0,
			progress:0,
			success:0,
			error: 0
		};
		this.list.each(function( model ) {
			var state = model.get( "state");
			if ( state === "wait" ) {
				obj.wait++;
			} else if ( state === "progress" ) {
				obj.progress++;
			} else if ( state === "success" ) {
				obj.success++;
			} else if ( state === "error" ) {
				obj.error++;
			}
		});

		return obj;
	},

	get: function(){
		var arr = [];
		this.list.each(function( model ){
			var fileId = model.get("id");
			if ( fileId ){
				arr.push( {
					bfs_file_id:fileId,
					name: model.get("fileName")
				} );
			}
		});
	
		return arr;
	},

	isEmpty: function(){
		if ( this.list.length === 0 ) {
			return true;
		}
		return false;
	},

	set: function(){
		
	},

	destroy: function(){

		var arr = [],
			that = this;
		this.list.each( function(model){
			arr.push( model );
		});
		$.each( arr, function( index, model ){
			that.list.remove( model );
		});

		this.remove();
	},

	attributes: {
		class: "form-attachment"
	}
});


module.exports = View;