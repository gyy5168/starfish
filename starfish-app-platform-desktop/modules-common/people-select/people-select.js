var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js");


var DEFAULTS = {
	clickHide: true,   // clickHide 来配置是否点击隐藏
	callback: function(data){}, //点击列表项的回调函数, 会将列表项的数据返回
	css:{
		left:0,
		top:0
	}
};

var SelectPanel = Backbone.View.extend({
	template: __inline("people-select-item.tmpl"),

	groupTemplate: __inline("people-select-group.tmpl"),

	initialize: function(options) {
		this.options = $.extend(DEFAULTS, options || {});
		this.render();
		this.initEvent();
		this.set(this.options);
	},

	render: function() {
		this.$el.html(__inline("people-select.html"));
		this.$list = this.$el.find(".JS-list");
		this.$search = this.$el.find(".JS-search");
		$("#wraper").append(this.$el);
	},

	initEvent: function() {
		var that = this;
		this.$el.on("click", ".JS-select-item", function(event) {
			var $this = $(this);

			if (!$this.hasClass("disabled")){
				that.callback($this.data());

				if ( that.options.clickHide ) {
					that.hide();
				}
			}
			
			event.stopPropagation();
		});

		this.$el.on("click", ".JS-group-hd", function(){
			$(this).parent().toggleClass("opened");
		});

		this.$search.on("input", _.throttle(function(){
			var value = $(this).val();

			// 列表是查询状态
			if ( value === "" ) {
				that.$list.removeClass("searching");
			} else {
				that.$list.addClass("searching");
			}
			
			// 过滤
			that.$list.find(".JS-select-item").each(function(){
				var $this = $(this);
				if ($this.data("name").toUpperCase().indexOf(value.toUpperCase()) >= 0) {
					$this.show();
				} else {
					$this.hide();
				}
			});
		}, 200, {
			leading: false
		}));

		this.$el.on("click", function(event) {
			event.stopPropagation();
		});


		// 将回调关联到自身，以便在组件摧毁时移除
		this.docHandle = function(){
			that.hide();
		}
		$(document).on("click.form-select-panel", this.docHandle);
	},

	loadData: function(arr) {
		var that = this;
		this.$list.html("");

		$.each(arr, function(index, data){
			var $group,
				$list,
				$node;
			// 如果存在data属性，该数据为组
			if ( data.data ) {
				$group = $(that.groupTemplate(data));
				$list = $group.find(">ul");

				// 如果设置open属性为true，则打开
				if( data.open ) {
					$group.addClass("opened");
				}

				$.each(data.data, function(index, obj){
					obj.disabled = obj.disabled || false;
					$node = $(that.template(obj));
					$node.data(obj);
					$list.append($node);
				});
				that.$list.append($group);
			} else {
				data.disabled = data.disabled || false;
				$node = $(that.template(data));
				$node.data(data);
				that.$list.append($node);
			}
		});

	},

	set: function(options){
		if ( options.data ) {
			this.loadData( options.data );
		}
		
		if ( options.callback ) {
			this.callback = options.callback;
		}

		if ( options.css ) {
			this.$el.css( options.css );
		}

		this.options = $.extend(this.options, options);
	},

	clear: function() {
		this.$search.val("").trigger("input");
	},

	attributes: {
		class: "g-people-select"
	},

	toggle: function(){
		if ( this.showing ) {
			this.hide();
		} else {
			this.show();
		}
	},

	show: function() {
		if (this.showing) {
			return;
		}
		this.$el.show();
		this.showing = true;
	},

	hide: function() {
		if (this.showing) {
			this.$el.hide();
			this.showing = false;
		}
	},

	destroy: function(){
		$(document).off("click.form-select-panel", this.docHandle);
		this.callback && (this.callback = null);
		this.$list.find(".JS-select-item").each( function(){
			$(this).removeData();
		});
		this.remove();
	}
});

module.exports = SelectPanel;