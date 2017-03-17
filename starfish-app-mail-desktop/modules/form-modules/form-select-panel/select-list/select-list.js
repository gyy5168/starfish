var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	Member = require("./member/member.js"),
	Department =require("./department/department.js"),
	Group = require("./group/group.js");

var SelectPanel = Backbone.View.extend({

	attributes: {
		class: "form-select-list"
	},

	initialize: function(options) {
		this.selectedList = options.selectedList;
		this.render();
		this.initTabEvent();

		this.$tabNav.find("span:first").trigger("click");
	},

	render: function() {
		this.modules = {};
		this.$el.html(__inline("select-list.html"));
		this.$tabNav = this.$el.find(".JS-tab-nav");
		this.$tabBd = this.$el.find(".JS-tab-bd");
	},

	initTabEvent: function(){
		var that = this,
			moduleMap = {
				department: Department,
				member: Member,
				group: Group
			};

		this.$tabNav.on("click", "span", function(){
			var id = $( this ).data("id");

			that.$tabNav.find("span").removeClass("active");
			that.$tabNav.find("span[data-id="+id+"]").addClass("active");

			that.$tabBd.find(".JS-tab-item").removeClass("show");
			that.$tabBd.find(".JS-tab-item[data-id="+id+"]").addClass("show");

			if ( !that.modules[id] ) {
				that.modules[id] = new moduleMap[id]({
					selectedList: that.selectedList
				});
				that.$tabBd.find(".JS-tab-item[data-id="+id+"]").append(that.modules[id].$el);
			}
		});
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		_.each( this.modules, function(module){
			module.destroy();
		});
		this.remove();
	}
});

module.exports = SelectPanel;