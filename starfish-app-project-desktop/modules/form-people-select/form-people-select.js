var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Panel = require("modules-common/panel/panel.js"),
	PeopleSelect = require("./people-select/people-select.js");

var View = Panel.extend({

	title:"选择人员",

	initialize: function(option) {
		this.option = option;
		View.__super__.initialize.call( this, option);
		
	},

	render: function(){
		View.__super__.render.call( this );
		this.$el.addClass("form-people-select");

		this.peopleSelect = new PeopleSelect(this.option);

		this.appendContent( this.peopleSelect.$el );
	},

	initEvent: function(){
		var that = this;
		View.__super__.initEvent.call( this );

		this.listenTo( this.peopleSelect, "select", function(obj){
			that.trigger( "select", obj );
		});

		this.listenTo( this.peopleSelect, "unselect", function(obj){
			that.trigger( "unselect", obj );
		});
	}
});

module.exports = View;