var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Panel = require("modules-common/panel/panel.js"),
	PeopleSelect = require("./people-select/people-select.js");

var View = Panel.extend({
	title: "选择人员",

	content:__inline("content.html"),

	render: function(){
		View.__super__.render.call( this );
		this.peopleSelect = new PeopleSelect();

		this.$content = this.$el.find(".JS-organization-content");
		this.$content.append(this.peopleSelect.$el);
		// this.appendContent( this.peopleSelect.$el );
		this.$el.addClass("people-select-organization");
	},

	initEvent: function(){
		View.__super__.initEvent.call( this );
		var that = this;
		this.listenTo( this.peopleSelect, "select", function(obj) {
			that.trigger( "select", obj );
		});

		this.listenTo( this.peopleSelect, "unselect", function( obj ) {
			that.trigger( "unselect", obj);
		})
	},

	destroy: function(){
		this.peopleSelect.destroy();
		View.__super__.destroy.call( this );
	}
});


module.exports = View;