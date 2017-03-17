var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	Modal = require("modules-common/modal/modal.js");

var View = Modal.extend({

	attributes: {
		"class": "confirm"
	},

	title:"提示信息",

	content: __inline("confirm.html"),

	initialize: function(option) {
		View.__super__.initialize.call(this);
		
		this.render();
		this.initEvent();
		this.set(option);
	},

	render: function(){
		View.__super__.render.call(this);
		this.$ok = this.$el.find(".JS-ok");
		this.$content = this.$el.find(".JS-content");
		this.$cancel = this.$el.find(".JS-modal-close");
	},

	initEvent: function(){
		var that = this;
		View.__super__.initEvent.call(this);
		this.$ok.on("click", function(){
			that.hide();
			that.callback && that.callback();
		});

		this.$cancel.on("click", function(){
			that.cancelCallback && that.cancelCallback();
		});
	},

	set: function(option){
		option = option || {};
		this.callback = option.callback;
		this.hideCallback = option.hideCallback;
		this.cancelCallback = option.cancelCallback;
		this.$content.html(option.text);
		this.hideDestroy = option.hideDestroy;
	},

	show: function(option){
		View.__super__.show.call(this);
		if ( option ) {
			this.set(option);
		}
	},

	hide: function(){
		View.__super__.hide.call( this );
		if ( this.hideDestroy ) {
			this.destroy();
		}
		this.hideCallback && this.hideCallback();
	}
});

var result = {
	show: function( option ){
		option = option || {};
		// 隐藏摧毁组件
		option.hideDestroy = true;
		this.confirm = new View(option);
		this.confirm.show();
	},

	hide: function(){
		this.confirm && this.confirm.hide();
	}
};

module.exports = result;