var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	$ = require("modules-common/jquery/jquery.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	Modal = require("modules-common/modal/modal.js");

var View = Modal.extend({

	attributes: {
		class: "move"
	},

	title:"请选择移动位置",

	content: __inline("move.html"),

	template: __inline("move-item.tmpl"),

	initialize: function() {
		View.__super__.initialize.call(this);
		this.render();
		this.initEvent();
	},

	render: function() {
		View.__super__.render.call(this);
		this.$info = this.$el.find(".JS-info");
		this.$list = this.$el.find(".JS-list");
		this.$info = this.$el.find(".JS-info");
		this.$root = this.$el.find(".JS-root");
		this.$ok = this.$el.find(".JS-ok");
		$("#wraper").append(this.$el);
	},

	initEvent: function() {
		var that = this;

		View.__super__.initEvent.call(this);
		// 点击加载目录
		this.$list.on("click", "li", function( event ){
			var $this = $( this ),
				loaded = $this.data("loaded"),
				id = $this.data("id"),
				paddingLeft = $this.data("pl");

			event.stopPropagation();

			// 如果该目录已打开且被选中，则关闭
			if ( $this.hasClass("opened") ) {
				if ( $this.hasClass("selected") ) {
					$this.removeClass("opened");
					return;
				} 
				return;
			}

			// 如果没有子目录，则返回
			if ( !$this.hasClass("JS-has-dir") ) {
				return;
			}

			// 如果是加载过的，就直接打开
			if ( loaded ) {
				$this.addClass("opened");
				return;
			}

			// 加载子目录
			$this.addClass("loading");
			$.ajax({
				url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files?parent=" + id + "&dir_only=1&perm=upload",
				type: "GET",
				success: function(data) {
					if (data.errcode === 0) {
						// 插入到当前节点下
						that.add($this, data.data.children, paddingLeft);
						$this.data("loaded", true);
						$this.addClass("opened");
					}else{
						point.shortShow({
							text: global.tools.getErrmsg(data.errcode),
							type: 'error'
						});
					}
					$this.removeClass("loading");
				},

				error: function() {
					point.shortShow({
						text: "获取目录失败",
						type: 'error'
					});
					$this.removeClass("loading");
				}
			});
		});
		
		// 点击选中
		this.$list.on("click", "li", function(event) {
			var $this = $( this );
			that.select($this);
			event.stopPropagation();
		});

		// 当组件显示的时候，更新选中文件的信息
		this.listenTo( this, "show", function(){
			var length = global.modules.fileList.getSelectedNode().length;
			that.$info.html("选择了" +length+"个文件");
		});

		this.initOkEvent();
	},

	initOkEvent: function() {
		var that = this;

		this.$ok.on("click", function() {
			if ( !that.selected ) {
				point.shortShow({
					text: "请选择一个文件夹"
				});
				return;
			}

			that.move({
				id: that.selected.data("id")
			});
		});
	},

	select: function($el) {
		if (this.selected) {
			this.selected.removeClass("selected");
		}
		this.selected = $el.addClass("selected");
	},

	// 更新视图
	update: function() {
		var that = this;
		this.$root.removeClass("selected opened").data("loaded", false);
		this.$root.find(">ul").remove();
		this.$root.trigger("click");
	},

	// 移动文件
	move: function(option){
		var parent = option.id,
			files = [],
			that = this;

		// 获取需要移动的文件数据
		var views = global.modules.fileList.getSelectedView(),
			isConflict = false;

		// 判断是否移动到自身
		$.each( views, function( index, view ) {
			var model = view.model,
				id = model.get("id");

			if ( id === parent ) {
				isConflict = true;
				return false;
			}

			files.push({
				id: id,
				name: model.get("name")
			});
		});

		if ( isConflict ) {
			point.shortShow({
				text:"不能将文件夹移动到自身或者其子目录下"
			});
			return false;
		}

		// 判断移动的目录是否和所在的目录一样
		var parentId = global.currentPath[global.currentPath.length - 1].id;
		if ( parent === parentId ) {
			point.shortShow({
				text:"文件或文件夹已在该目录下"
			});
			return false;
		}

		// 开始移动
		if ( this.moving ) {
			return;
		}
		this.moving = true;

		this.$ok.addClass("loading");

		this.pathId = option.id;

		// 生成由文件id和逗号组成参数
		var idParam;
		idParam = [];
		$.each( files, function(index, obj) {
			idParam.push(obj.id);
		});
		idParam = idParam.join(",");

		// 移动文件
		$.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files/" + idParam,
			type: "PATCH",
			data: JSON.stringify({
				"parent": parent
			}),
			success: function(response) {
				if (response.errcode === 0) {
					var errorArr = [],
						successArr = [];
					$.each( response.data, function(index, obj){

						if ( obj.errcode === 0 ) {
							successArr.push( obj.id );

						//有同名文件, 没有移动成功
						} else if ( obj.errcode === 42 || obj.errcode === 59 ){
							errorArr.push(obj.id);
						}else{
							point.shortShow({
								text: global.tools.getErrmsg(data.errcode),
								type: 'error'
							});
						}
					});

					// 触发移动成功的事件
					global.event.trigger("moved", successArr);

					// 如果全部移动成功
					if ( errorArr.length === 0 ) {
						point.shortShow({
							type: "success",
							text: "移动成功"
						});
						that.hide();
					} else {
						// 填充没有移动成功的数据（errorArr只是id列表， 补充名称）
						var arr = [];
						$.each(errorArr, function(index, id){
							var data = _.find(files,function(obj){ return id === obj.id});

							if ( data ) {
								arr.push( data );
							}
						});
						that.hide();
						that.askCover(arr);
					}

				}
			},
			error: function(response) {
				point.shortShow({
					type: "error",
					text: "网络异常，请检查您的网络设置"
				});
			},
			complete: function(){
				that.$ok.removeClass("loading");
				that.moving = false;
			}
		});
	},

	// 处理移动错误
	// handleError: function(errcode){
	// 	switch (errcode) {
	// 		case 4:
	// 			point.shortShow({
	// 				type: "error",
	// 				text: "没有移动这些文件的权限"
	// 			});
	// 			break;
	// 		case 42:
	// 			point.shortShow({
	// 				type: "error",
	// 				text: "存在同名文件"
	// 			});
	// 			break;
	// 		case 59:
	// 			point.shortShow({
	// 				type: "error",
	// 				text: "存在同名文件夹"
	// 			});
	// 			break;
	// 		case 71:
	// 			point.shortShow({
	// 				type: "error",
	// 				text: "文件或文件夹替换出错"
	// 			});
	// 			break;
	// 		default:
	// 			point.shortShow({
	// 				type: "error",
	// 				text: "操作失败，错误码： " + errcode
	// 			});
	// 	}
	// },

	// 覆盖
	cover: function(arr){
		if ( this.covering ) {
			return;
		}
		this.covering = false;

		var that = this;
		point.show({
			type:"loading",
			text:"正在覆盖..."
		});

		$.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/file/files/" + arr.join(","),
			type:"PATCH",
			data:JSON.stringify({
				parent: that.pathId,
				replace: 1
			}),
			success: function(response){
				if ( response.errcode === 0 ) {
					point.shortShow({
						type:"success",
						text:"覆盖成功"
					});
					// 触发移动成功的事件
					global.event.trigger("moved", arr);

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
			},

			complete: function(){
				that.moving = false;
			}
		});
	},

	// 询问是否覆盖
	askCover: function(arr){
		var result = [],
			that = this;

		handle( arr );

		function handle(arr) {

			if ( arr.length === 0 ) {

				if ( result.length !== 0 ) {
					that.cover( result );
				}
				return;
			}

			var obj = arr.shift();

			confirm.show({
				text:"移动的目标目录中，有同名文件\""+obj.name+"\"， 是否选择覆盖？",
				callback: function(){
					result.push( obj.id );
					handle(arr);
				},

				cancelCallback: function(){
					handle(arr);
				}
			});
		}
	},

	// 添加子目录
	add: function(el, data, pl) {
		var $ul = $("<ul></ul>"),
			that = this,
			spacing = 20;
		$.each(data, function(index, obj) {
			var option = {};
			option.name = obj.name;
			option.id = obj.id;
			if ( obj.contain_dirs ) {
				option.dirClass = "has-dir JS-has-dir";
			} else {
				option.dirClass = "";
			}
			$ul.append(that.template(option));
		});

		$ul.find(">li").each(function(){
			$(this).find(".item-hd").css("paddingLeft", pl + spacing);
			$(this).data("pl", pl + spacing);
		});
		
		$(el).append($ul);
	},

	set: function(option) {
		option = option || {};
		if ( option.callback ) {
			this.callback = option.callback;
		}
	},

	show: function(option) {
		View.__super__.show.call(this);
		this.update();
		if ( option ) {
			this.set(option);
		}
	}
	
});

var move;
global.event.on("move", function() {
	if (!move) {
		move = new View();
	}
	move.show();
});

module.exports = View;