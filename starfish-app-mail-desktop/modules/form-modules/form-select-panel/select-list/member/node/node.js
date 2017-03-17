var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "form-select-node JS-node"
	},

	tagName:"li",

	template: __inline("node.tmpl"),

	pageSize: 20,

	initialize: function(option) {
		this.parentView = option.parentView;
		this.selectedList = option.selectedList;
		this.render();
		this.initEvent();
	},

	render: function() {
		var obj = this.model.toJSON();

		this.$el.html( this.template(obj) );

		var id = this.selectedList.modelId( obj ),
			isSelected = this.selectedList.get(id);

		if ( isSelected ) {
			this.$el.addClass("selected");
		}
	
		if( obj.work_mail === "" ) {
			this.$el.addClass("disabled");
		}

		this.$el.attr( "data-id", id );
	},

	initEvent: function() {
		var that = this;

		this.$el.on("click", function(){
			// 看是否选中
			var id = that.selectedList.modelId( that.model.toJSON()),
				isSelected = that.selectedList.get(id);

			if ( that.$el.hasClass("disabled") ) {
				return;
			}

			// 如果选中的后， 就反选
			if ( isSelected ) {
				that.selectedList.remove(that.model);
			} else {
				that.selectedList.add(that.model);
			}
		});

	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}
	
});

module.exports = View;