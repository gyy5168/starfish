var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Uri = require("modules-common/uri/uri.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	tagName:"li",

	template: __inline("tree-node.tmpl"),

	attributes:{
		"class":"item JS-item"
	},

	initialize: function(option, setting){
		this.option = option;
		this.setting = setting;
		this.selectedList = this.setting.selectedList;
		this.render();
		this.initEvent();
	},

	render: function(){
		var obj = this.model.toJSON();

		this.$el.html(this.template(obj));

		var model = this.selectedList.get( this.selectedList.modelId( obj ));

		if ( model ) {
			this.$el.addClass("selected");
		}

		this.$el.attr("data-id", this.selectedList.modelId( obj ));
		
		this.$el.data("view", this);
	},

	initEvent: function(){
		var that = this;

		this.$el.on("click", function(event){
			var obj = that.model.toJSON();
			var model = that.selectedList.get( that.selectedList.modelId(obj) );
			var id = that.selectedList.modelId(obj);
			if ( model) {
				if ( !that.setting.onlySelect ) {
					that.selectedList.remove(id);
				}
			} else {
				that.selectedList.add( that.model );
			}
			event.stopPropagation();
		});
	},


	isParent: function(){
		return false;
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}
});

module.exports = View;