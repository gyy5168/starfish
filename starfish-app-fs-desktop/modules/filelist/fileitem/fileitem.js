var Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js"),
	$ = require("modules-common/jquery/jquery.js"),
	list = require("modules/collections/filelist.js"),
	urlTool = require("modules-common/tools/url.js"),
	fileTool = require("modules-common/tools/file.js");

var ItemView = Backbone.View.extend({
	tagName: "li",
	template: __inline("fileitem.tmpl"),

	attributes:{
		class:"file-item"
	},

	initialize: function() {
		this.render();
		this.initEvent();

		this.model.view = this;
	},

	render: function() {
		var option = this.model.toJSON(),
			data = {};

		// 如果名字过长，截取字符并添加省略号（css无法很好实现）
		data.name = option.name;
		if ( this.getStrLength(data.name) > 29 ) {
			data.name = data.name.substr(0, this.getStrIndex(data.name, 29)) + "...";
		}

		data.type = option.is_file ? fileTool.getType(option.name) : "folder";
		data.url = global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files/" + option.id + "/attachment?width=70&height=70&time=" + (+new Date);
		this.$el.html(this.template(data));
		this.$el.attr({
			"data-id": option.id,
			"data-parent":option.parent,
			"data-type": option.is_file ? "file" : "folder",
			"data-mimetype": option.mimetype,
			"data-name": option.name
		});

		this.$el.data("view", this);
		return this.$el;
	},

	initEvent: function() {
		var that = this;
		this.listenTo(this.model, "destroy", this.remove);
		this.listenTo(this.model, "change:name", function(model, value) {
			that.$el.find(".JS-text").html(value);
		});
		// this.listenTo(this.model, "change", function(model, value) {
		// 	var option = model.toJSON();
		// 	that.$el.attr({
		// 		"data-id": option.id,
		// 		"data-parent":option.parent,
		// 		"data-type": option.is_file ? "file" : "folder",
		// 		"data-name": option.name
		// 	});
		// });
	},

	// 获取字符串的
	getStrLength: function(str){
		var realLength = 0, len = str.length, charCode = -1;
	    for (var i = 0; i < len; i++) {
	        charCode = str.charCodeAt(i);
	        if (charCode >= 0 && charCode <= 128) realLength += 1;
	        else realLength += 2;
	    }
	    return realLength;
	},

	getStrIndex: function(str, len){
		var charCode,
			realLength = 0;
		for( var i = 0; i < len; i++ ) {
			charCode = str.charCodeAt(i);
			if (charCode >= 0 && charCode <= 128) realLength += 1;
	        else realLength += 2;
	        if ( realLength >= len ) {
	        	break;
	        }
		}
		return i;
	},

	substr: function(){

	},

	changeName: function() {
		var that = this;

		// 添加input标签
		this.$input = $("<input>");
		this.$input.on("mousedown", function(event) {
			event.stopPropagation();
		});
		this.$el.append(this.$input);

		this.$el.removeClass("selected");
		this.$el.addClass("renaming");

		this.$input.val(this.model.get("name"));
		selectFileNamePrefix(this.$input[0])

		//改名时候选中文件名字，后缀不选中
		function selectFileNamePrefix(node){
			//兼容性判断
			if(!node.setSelectionRange){
				that.$input.select();
				return
			}
			//查看是不是文件夹
			if(that.model.get("is_file")){
				node.setSelectionRange(0,node.value.lastIndexOf("."))
			}else{
				that.$input.select();
			}
		}

		// 添加事件
		this.$input.on("keydown", function(event) {
			if (event.keyCode === 13) {
				changeHandle();
			}
		});

		this.$input.on("blur", function() {
			changeHandle();
		});

		function changeHandle() {
			var value = that.$input.val().trim(),
				id = that.model.get("id");

			if ( value === "" ) {
				that.$input.remove();
				that.$el.addClass("selected");
				that.$el.removeClass("renaming");
				return ;
			}

			var length = that.getStrLength(value);
			if ( length > 100 ) {
				point.shortShow({
					type:"error",
					text:"文件名称过长，字符不能超过50个"
				});
				selectFileNamePrefix(that.$input[0]);
				return;
			}
			
			if (id === undefined) {
				that.createFloder(value);
			} else {
				// 如果名字没有变化
				if (that.model.get("name") === value) {
					that.$input.remove();
					that.$el.addClass("selected");
					that.$el.removeClass("renaming");
					return;
				}
				that.updateName(value);
			}
		}
	},

	updateName: function(name){
		var that = this,
			id = this.model.get("id");
		that.$el.data("name",name)
		point.show({
			text: "修改中",
			type: "loading"
		});

		$.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files/" + id,
			type: "PATCH",
			data: JSON.stringify({
				name: name
			}),
			success: function(data) {
				if (data.errcode === 0) {

					that.model.set(data.data);

					point.shortShow({
						text: "修改成功",
						type: "success"
					});

					that.$input.remove();
					that.$el.removeClass("renaming");
					that.$el.addClass("selected");
				} else {
					that.$input.select();
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
				}
			},

			error: function() {
				point.shortShow({
					text: "修改失败, 请稍后重试",
					type: "error"
				});
				that.$input.val(that.model.get("name"));
				that.$input.select();
			}
		});
	},

	createFloder: function(name){
		var that = this;

		// 如果名字为空，则删除
		if (name === "") {
			list.remove(that.model);
			return;
		}

		// 获取当前目录路径
		var hash = window.location.hash;
		hash = hash.replace("#", "");
		hash = decodeURIComponent(hash);
		var path = urlTool.getParam(hash, "path")[0];
		path = path || "/";

		if (path === "/") {
			path = path + name;
		} else {
			path = path + "/" + name;
		}

		point.show({
			text: "创建中",
			type: "loading"
		});

		$.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files",
			type: "POST",
			data: JSON.stringify({
				name: path
			}),
			success: function(data) {
				if (data.errcode === 0) {
					that.model.set(data.data);
					point.shortShow({
						text: "创建成功",
						type: "success"
					});
					that.$input.remove();
					that.$el.removeClass("renaming");
					that.$el.addClass("selected");
				} else {
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
					that.$input.select();
				}
			},
			error: function() {
				point.shortShow({
					text: "修改失败",
					type: "error"
				});
				that.$input.select();
			}
		});
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}

});

module.exports = ItemView;
