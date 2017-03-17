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
		this.$ok = this.$el.find(".JS-ok");
		this.$content = this.$el.find(".JS-content");
	},

	initEvent: function(){
		var that = this;

		this.$ok.on("click", function(){
			that.callback && that.callback();
			that.hide();
		});
	},

	set: function(option){
		option = option || {};
		this.callback = option.callback;
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
	}
});

var result = {
	show: function( option ){
		option = option || {};
		// 隐藏摧毁组件
		option.hideDestroy = true;
		this.confirm = 	new View(option);

		this.confirm.show();
	}
};

module.exports = result;