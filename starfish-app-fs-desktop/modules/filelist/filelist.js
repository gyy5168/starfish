// 需要将select模块加到此模块中
// 需要为模块添加destroy函数
// 需要调整选中行的机制
// 添加丰富的注释
// 需要将currentPath，做成单例对象，拥有解析出路径和根据返回值生成currentPath的能力

var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	list = require("modules/collections/filelist.js"),
	ItemView = require("./fileitem/fileitem.js"),
	Select = require("./select/select.js"),
	file = require("modules-common/file/file2.js"),
	urlTool = require("modules-common/tools/url.js"),
	router = require("modules/routers/router.js");

var View = Backbone.View.extend({
	tagName: "div",

	initialize: function() {
		this.render();
		this.initEvent();
		global.modules.fileList = this;
	},

	render: function() {
		this.$el.html(__inline("filelist.html"));
		this.$error = this.$el.find(".JS-error");
		this.$empty = this.$el.find(".JS-empty");
		this.$list = this.$el.find(".JS-filelist");
		this.$loading = this.$el.find(".JS-loading");
	},

	initEvent: function() {
		var that = this;

		this.listenTo(list, "add", that.addItem);
		this.listenTo(list, "add reset remove destroy", function(){
			that.clear();
			if ( list.length === 0 ) {
				that.$empty.show();
			} else {
				that.$list.show();
			}
		});

		this.listenTo(list, "reset", function(models, options) {

			$.each(options.previousModels, function(index, model) {
				that.removeItem(model);
			});

			list.each(function(model) {
				that.addItem(model);
			});
		});
		this.listenTo(list, "remove", this.removeItem);

		this.$error.find(".JS-btn").on("click", function(){
			that.reload();
		});


		this.$el[0].oncontextmenu = function(){return false};

		this.initGlobalEvent();
		this.initSelectEvent();

		// 绑定滑取选中事件
		new Select({
			$node: this.$list
		});
	},


	initGlobalEvent: function(){
		var that = this;
		global.event.on("changeName", function() {
			var views = that.getSelectedView();
			if (views.length === 1) {
				views[0].changeName();
			}
		});

		global.event.on("folderNew", function(data){
			list.add(data, {
				at: 0
			});
		});

		global.event.on("moved", function(files){
			$.each(files, function(index, id) {
				list.remove(id);
			});
		});

		global.event.on("remove", function() {
			var $nodes = that.getSelectedNode(),
				arr = [],
				str;

			$nodes.each(function() {
				arr.push($(this).data("id"));
			});
			str = arr.join(",");

			confirm.show({
				text: "确定删除？",
				callback: function() {
					point.show({
						text: "删除中",
						type: "loading"
					});
					$.ajax({
						url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files/" + str,
						type: "DELETE",
						success: success,
						error: error
					});
				}
			});

			function success(data) {
				if (data.errcode === 0) {
					point.shortShow({
						text: "删除成功",
						type: 'success'
					});
					$.each( arr, function( index, id ) {
						list.remove(id);
					})
				}else{
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
				}
			}

			function error() {
				point.shortShow({
					text: "删除失败",
					type: 'error'
				});
			}

		});

		global.event.on("fileUploaded", function(data){
			var id = global.currentPath[global.currentPath.length - 1].id;

			if ( data.parent === id ) {

				// 删除同名文件
				var model = list.find( function(model) {
					return model.get("name") === data.name;
				});

				if ( model ) {
					list.remove(model);
				}


				var i = 0;

				list.find(function(model){
					var is_file = model.get("is_file");
					if ( is_file === 0 ) {
						i++;
					} else {
						return true;
					}
				});

				list.add(data,{
					at: i  
				});

				
			}
		});
	},

	initSelectEvent: function() {

		var that = this;

        //ctrl+a全选文件
        $(document).on("keydown",function(e){
            if(e.ctrlKey && e.keyCode==65){
                that.$list.find("li").each(function(){
                    $(this).addClass("selected")
                })
            }
        })

        //shift+点击多选文件
        this.$list.on("mousedown","li",function(e) {
            if(!e.shiftKey){
                return false
            }

            //start,end表示选中的开始，结束位置
            //start第一次点击，end第二次点击,如果end<start的话就交换下
            var end = $(this).index(),
                start = getNearestSelectedNodeIndex(end),
                $li=that.$list.find("li")

            if(end<start){
                var x=start,
                    start=end,
                    end=x+1
            }

            that.$list.find("li").each(function() {
                $(this).removeClass("selected");
            });

            for(var i=start;i<end;i++){
                $li.eq(i).addClass("selected")
            }
        })
        //获取到最近的选中的li的索引
        function getNearestSelectedNodeIndex(id){

            var left=id,
                right=id,
                $li=that.$list.find("li")
            for(var i=id;i>0;i--){
                if($li.eq(i).hasClass("selected")){
                    left=i
                    break
                }
            }

            for(var j=id;j<$li.length;j++){
                if($li.eq(j).hasClass("selected")){
                    right=j
                    break
                }
            }
            return id-left>=right-id?left:right
        }



		// 点击鼠标左键选中文件
		this.$list.on("mousedown", "li", function(event) {

			if (event.button !== 0) {
				return;
			}
			if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
				that.$list.find("li").each(function() {
					$(this).removeClass("selected");
				});
			}
			$(this).addClass("selected");
		});



		// 如果点到列表空白处， 清除选中的文件
		this.$list.on("mousedown", function(event) {
			if (event.target.nodeName === "UL") {
				that.$list.find("li").each(function() {
					$(this).removeClass("selected");
				});
			}
		});

		// 点击鼠标右键事件
		this.$list.on("mousedown", "li", function(event) {
			var $this = $(this);
			if (event.button !== 2) {
				return;
			}

			// 如果该文件没有选中， 则选中改文件，并取消其他文件的选中状态
			if (!$this.hasClass("selected")) {
				that.$list.find("li").removeClass('selected');
				$this.addClass("selected");
			}

			var css = {
					left:event.pageX,
					top:event.pageY
				};

			// 如果是分享页面（集成页面），则只显示download
			if ( that.shareId ) {
				global.event.trigger("menu", {
					css: css,
					shows:["download"]
				});

				event.stopPropagation();
				return;
			}

			// 获取所有选中文件权限的交集
			var views = that.getSelectedView(),
				viewLength = views.length,
				numCache = {},  //记录文件权限出现次数
				permissionResult = [];  //文件权限的交集

			$.each( views, function(index, view){
				var permissions = view.model.get("permissions");
				$.each(permissions, function(index, str) {
					if (!numCache[str]) {
						numCache[str] = 0;
					} 
					numCache[str]++;
				});
			});

			$.each(numCache, function(key, value) {
				if ( value === viewLength ) {
					permissionResult.push(key);
				}
			});

			// 如果选中的文件大于1，隐藏重命名和权限和发送
			// 无法对两个文件重命名， 两个文件的权限和发送操作需要的数据可能不一致
			if ( viewLength > 1 ) {
				permissionResult = _.reject( permissionResult, function(str) {
					return str === "rename" || str === "control" || str === "send";
				});
			}

			// 如果是文件，隐藏权限，后端已经实现，暂不开放
			var isFileFlag = false;
			$.each( views, function(index, view){
				var isFile = view.model.get("is_file");
				if ( isFile ) {
					isFileFlag = true;
					return false;
				}
			});

			if ( isFileFlag ) {
				permissionResult = _.reject( permissionResult, function(str) {
					return  str === "control";
				});
			}

			// 转换下权限名称，服务器返回的名称有些和程序的名称不一致，例如rename（服务器）和changeName（程序）
			permissionResult  = transformPermission(permissionResult);

			// 如果存在删除， 就可以移动文件
			var hasRemove = _.contains(permissionResult, "remove");
			if ( hasRemove ) {
				permissionResult.push("move");
			}

			global.event.trigger("menu", {
				css:css,
				shows: permissionResult
			});

			event.stopPropagation();

		});

		function transformPermission(arr){
			var result = [];
			var permissionsMap = {
				control: "permissions",
				"delete": "remove",
				download: "download",
				move:"move",
				preview:"preview",
				rename:"changeName",
				send:"send",
				upload:"upload",
				view:"view"
			};
			$.each( arr, function(index, str) {
				result.push(permissionsMap[str]);
			});
			return result;
		}


		// 双击打开文件
		this.$list.on("dblclick", "li", function(event) {
			var $this = $(this),
				type = $this.data("type"),
				model = $this.data("view").model;

			// 如果是文件夹， 则进入目录
			if (type === "folder") {
				var parent = $this.data("id"),
					hash = window.location.hash;

				hash = urlTool.replaceParam(hash, "parent", parent);

				router.navigate(hash, {
					trigger: true
				});
			} else {

				// 如果是文件则打开文件
				var id = $this.data("id"),
					mimeType = $this.data("mimetype"),
					name = $this.data("name");

				file.openRemote({
					url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files/" + id + "/attachment",
					mimeType: mimeType,
					fileName: name
				});
			}
		});
	},

	// 返回选中文件的对象实例
	getSelectedView: function() {
		var $nodes = this.$list.find("li.selected"),
			arr = [];
		$nodes.each(function() {
			arr.push($(this).data("view"));
		});
		return arr;
	},

	// 反悔选中文件的dom节点
	getSelectedNode: function() {
		return this.$list.find("li.selected");
	},

	addItem: function(model, collection, options) {
		var view = new ItemView({
			model: model
		});

		view.parentView = this;

		options = options || {};

		if (options.create === true) {
			this.$list.prepend(view.$el);
			view.changeName();
			return;
		}

		if ( options.at !== undefined ) {
			if ( options.at === 0 ) {
				this.$list.prepend(view.$el);
			} else {
				list.at(options.at - 1).view.$el.after(view.$el);
			}
		} else {
			this.$list.append(view.$el);
		}

	},

	removeItem: function(model){
		model.view.destroy();
	},

	reload: function(){
		if ( this.shareId === undefined ) {
			this.set( this.parentId );
		} else {
			this.setShare( this.shareId, this.parentId );
		}
	},

	setShare: function(shareId, parentId) {
		var that = this,
			url;

		this.shareId = shareId;
		this.parentId = parentId;

		if ( this.ajaxObj ) {
			this.ajaxObj.abort();
		}

		this.clear();
		this.$loading.show();

		if ( this.parentId ) {
			url = global.data.org.get("domain")+ "/orgs/" + global.data.org.get("id") + "/file/files?parent=" + this.parentId;
		} else {
			url = global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files/" + this.shareId;
		}

		
		this.ajaxObj = $.ajax({
			url: url,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {

					if ( that.parentId === undefined ) {
						list.reset(response.data);
					} else {
						list.reset(response.data.children);
					}
					
					that.$loading.hide();
					that.$list.show();
				} else {
					that.$loading.hide();
					that.$error.show();
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
				}
			},

			error: function(){
				that.$loading.hide();
				that.$error.show();
			},

			complete: function(){
				that.ajaxObj = null;
			}
		});
	},

	set: function(parentId) {
		var that = this;

		this.parentId = parentId || 0;

		if ( this.ajaxObj ) {
			this.ajaxObj.abort();
		}
		this.clear();
		this.$loading.show();


		this.ajaxObj = $.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files?parent=" + this.parentId,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					list.reset(response.data.children);
					that.$loading.hide();
					that.$list.show();

					// 解析出完整的路径和对应的id
					global.currentPath = that.analyzePath(response.data);
					global.currentPermissions = response.data.permissions;

					global.event.trigger("changePath", global.currentPath);

					// global.event.trigger("changePath", response.all_parent);

					// this.trigger("loaded", response);
				// } else if (response.errcode === 4){
				// 	that.$loading.hide();
				// 	that.$error.show();
				// 	point.shortShow({
				// 		type:"error",
				// 		text:"操作失败，错误码：" + response.errcode  
				// 	});
				} else if ( response.errcode === 4 ){
					that.$loading.hide();
					that.$error.show();
					point.shortShow({
						type:"error",
						text:"没有查看此文件的权限"
					});
				} else {
					that.$loading.hide();
					that.$error.show();
					point.shortShow({
						type:"error",
						text:"操作失败，错误码：" + response.errcode  
					});
					console.log(response.errmsg);
				}
			},

			error: function(){
				that.$loading.hide();
				that.$error.show();
			},

			complete: function(){
				that.ajaxObj = null;
			}
		});
	},

	analyzePath: function(data){
		var result = [{
			id: 0,
			name: "全部"
		}];

		if ( !data.all_parents ) {
			return result;
		} 

		$.each(data.all_parents.ids, function( index, id ) {
			result.push({
				id: id,
				name: data.all_parents.names[index]
			});
		});

		result.push({
			id: data.id,
			name: data.name
		});

		return result;
	},

	clear: function(){
		this.$empty.hide();
		this.$list.hide();
		this.$error.hide();
		this.$loading.hide();
	}
});

module.exports = View;
