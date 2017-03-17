var $ = require("modules-common/zepto/zepto.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	file = require("modules-common/file/file.js"),
	ItemView = require("./item/item.js");

var List = Backbone.Collection.extend({
	modelId: function( attrs ) {
		return attrs.uuid;
	}
});

var View = Backbone.View.extend({

	attributes: {
		class: "form-attachment form-group"
	},

	initialize: function(option) {
		this.list = new List();
		this.itemViews = [];
		this.option = option || {};
		this.render();
		this.initListEvent();
		this.initUploadEvent();
	},

	render: function() {
		this.$el.html(__inline("form-attachment.html"));
		this.$upload = this.$el.find(".JS-upload");
		this.$list = this.$el.find("ul");
	},

	initListEvent: function() {
		var that = this;

		this.listenTo(this.list, "add", that.addItem);
		this.listenTo(this.list, "remove", that.removeItem);

		this.listenTo(this.list, "reset", function(list, options) {
			_.each(options.previousModels, function(model, index) {
				that.removeItem(model);
			});

			that.list.each(function(model) {
				that.addItem(model);
			});
		});

		this.listenTo(this.list, "add remove reset", function() {
			if (that.list.length === 0) {
				that.$el.removeClass("has-item");
			} else {
				that.$el.addClass("has-item");
			}
		});
	},

	initUploadEvent: function() {
		var that = this;
		this.$upload.on("click", function() {
			file.selectFile(function(files) {
				_.each(files, function(obj, index) {
					obj.state = "wait";

					var options = {
						uuid: obj.uuid,

						progress: function(respone) {

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
							console.log(respone)
							

							var model = that.list.find(function(model) {
								return model.get("uuid") == obj.uuid;
							});

							if (model) {
								model.set("state", "error");
							}
						}
					};

					that.list.add(obj);
					file.upload(options);

				});
			});
		});
	},

	// 根据ID获取列表项
	getItem: function(id) {
		var that = this;
		var view = _.find(this.itemViews, function(view) {
			return id === that.list.modelId(view.model.toJSON());
		});

		return view;
	},

	// 添加列表项
	addItem: function(model, collection, options) {
		var view = new ItemView({
			model: model,
			parentView: this
		});

		options = options || {};

		if (options.at !== undefined) {
			if (options.at === 0) {
				this.$content.prepend(view.$el);
				this.itemViews.unshift(view);
			} else {
				var id = collection.at(options.at - 1).get("id"),
					itemview = this.getItem(id);
				itemview.$el.after(view.$el);
				this.itemViews.splice(options.at, 0, view);
			}
		} else {
			this.$list.append(view.$el);
			// this.$moreLoading.before(view.$el);
			this.itemViews.push(view);
		}
	},

	// 删除列表项
	removeItem: function(model) {
		var view = this.getItem(this.list.modelId(model.toJSON())),
			that = this;

		if (!view) {
			return;
		}
		view.destroy();

		_.find(this.itemViews, function(itemView, index) {
			if (itemView === view) {
				that.itemViews.splice(index, 1);
				return true;
			}
		});
	},

	clear: function() {
		this.list.reset([]);
	},

	isEmpty: function(){
		return !this.list.length;
	},

	hasAllUpload: function(){
		if( this.list.length === 0 ) {
			return true;
		}
		var flag = this.list.find(function(model){
			if ( model.get("state") !== "success" ) {
				return true
			}
		});

		return !flag;
	},

	get: function() {
		var arr = [];
		this.list.each(function(model){
			arr.push({
				bfs_file_id: model.get("id"),
				name: model.get("fileName")
			});
		});
		return arr;
	},

	set: function(arr) {
		var that = this;
		this.list.reset(arr);
	},

	destroy: function() {
		this.list.reset([]);
		this.remove();
	}

});


module.exports = View;