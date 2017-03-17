var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	PeopleSelect = require("modules/form-people-select/form-people-select.js");

var View = PeopleSelect.extend({
	render: function(){
		View.__super__.render.call(this);
		this.$inputWraper = this.$el.find("input").parent();
		this.$inputWraper.after(__inline("content.html"));
		this.$allButton = this.$el.find(".JS-all");
		this.$el.addClass("statistics-people-select");
	},

	initEvent: function(){
		var that = this;
		View.__super__.initEvent.call(this);
		this.$allButton.on("click", function(){
			that.trigger("select", {
				id:0,
				name:"全部成员",
				avatar:""
			});
		});
	}
});

module.exports = View;