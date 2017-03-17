var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	router = require("modules/routers/router.js");

var Toolbar = Backbone.View.extend({
	tagName: "div",

	initialize: function() {
		this.render();
		this.initEvent();

		// 如果不是管理员，隐藏设置邮件的入口
		if (!global.data.user.get("is_admin") ) {
			this.$set.hide();
		}
	},

	render: function() {
		this.$el.append(__inline("toolbar.html"));
		this.$write = this.$el.find(".JS-write");
		this.$set = this.$el.find(".JS-set");
	},

	initEvent: function() {
		var that = this;
		this.$write.on("click", function() {
			global.event.trigger("showMailCreate");
			global.event.trigger("hideSubjectDetail");
			global.event.trigger("hideNoSelect");
		});

		this.$set.on("click", function(){
			router.navigate("set", {
				trigger:true
			});
		});
	},

	destroy: function(){
		this.remove();
	},

	attributes: {
		class: "toolbar"
	}
});


module.exports = Toolbar;