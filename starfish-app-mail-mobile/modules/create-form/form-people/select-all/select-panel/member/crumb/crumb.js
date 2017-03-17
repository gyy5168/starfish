var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	TopBar = require("modules-common/top-bar/top-bar.js");


var View = Backbone.View.extend({

	tagName:"ul",

	attributes:{
		"class": "people-all-crumb"
	},

	template: __inline("item.tmpl"),


	initialize: function(option){
		this.render();
		this.initEvent();
	},

	render: function(){
		
	},

	initEvent: function(){
		this.$el.on("click", "li", function(){

		});
	},

	// 添加列表项
	addItem: function(model) {
		var obj = model.toJSON();
		obj.id = this.selectedList.modelId(obj);
		obj.className = this.selectedList.get(obj.id) ? "selected" : "";
		if ( obj.type === "department" ) {
			this.$moreLoading.before(this.departmentTemplate(obj));
		} else if ( obj.type === "people" ) {
			this.$moreLoading.before(this.template(obj));
		}
	},

	destroy: function(){
		this.remove();
		window.starfishBack = this.prevBack;
	}
});

module.exports = View;