var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js"),
	point = require("modules-common/point/point.js"),
	PermissionsList = require("modules/permissions-list/permissions-list.js"),
	Modal = require("modules-common/modal/modal.js");


var View = Backbone.View.extend({

	template: __inline("selected-item.tmpl"),

	initialize: function(option) {
		this.list = option.list;
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("selected-list.html"));
		this.$list = this.$el.find("ul");
	},

	initEvent: function() {
		var that = this;

		this.listenTo(this.list, "change:selected peopleChange:selected", function(model, value){
	
			if ( value ) {
				this.addItem(model);
			} else {
				this.removeItem(model);
			}
		});

		this.listenTo( this.list, "reset", function(){
			that.clear();
		});

		this.$list.on("click", ".JS-remove", function(){
			var $node = $(this).parent();

			$node.data("model").set("selected", false);
		});
	},

	addItem: function(model) {
		var obj = model.toJSON();

		obj.cid = model.cid;
		obj.avatar = obj.avatar || false;
		var $node = $(this.template(obj));
		$node.data("model", model);
		this.$list.append($node);
	},

	removeItem: function(model){
		var cid = model.cid,
			$node = this.$list.find("li[data-cid="+cid+"]");

		$node.removeData();
		$node.remove();
	},

	get: function(){
		var result = [];
		this.$list.find("li").each( function(){
			var obj = $(this).data("model").toJSON();
			result.push( obj );
		});
		return result;
	},

	clear: function(){
		this.$list.find("li").each( function(){
			$(this).removeData().remove();
		});
	},

	destroy: function(){
		this.clear();
		this.remove();
	},

	attributes: {
		class: "selected-list"
	}
});

module.exports = View;