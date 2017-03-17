var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	TopBar = require("modules-common/top-bar/top-bar.js"),
	Group = require("./group/group.js"),
	Department = require("./department/department.js"),
	People = require("./people/people.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "people-all-select-panel"
	},

	initialize: function(option) {
		this.selectedList = option.selectedList;
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("select-panel.html"));
		this.$people = this.$el.find(".JS-people");
		this.$group = this.$el.find(".JS-group");
		this.$department = this.$el.find(".JS-department");
	},

	initEvent: function() {
		var that = this;
		this.modules = {};
		this.$group.on("click", function() {
			that.modules.group = new Group({
				selectedList: that.selectedList
			});

			that.$el.append( that.modules.group.$el );
		});

		this.$department.on("click", function() {
			that.modules.department = new Department({
				selectedList: that.selectedList
			});

			that.$el.append( that.modules.department.$el );
		});

		this.$people.on("click", function() {
			that.modules.people = new People({
				selectedList: that.selectedList
			});

			that.$el.append( that.modules.people.$el );
		});
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function() {
		this.remove();
		_.each( this.modules, function(obj){
			obj.destroy();
		});
	}
});

module.exports = View;