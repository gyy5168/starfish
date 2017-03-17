var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	SearchList = require("./search-list/search-list.js"),
	PeopleList = require("./people-list/people-list.js"),
	PeopleSelect = require("modules-common/people-select-modules/people-select/people-select.js");

var View = PeopleSelect.extend({
	render: function(){
		View.__super__.render.call( this );
	},
	PeopleList: PeopleList,
	SearchList: SearchList
});

module.exports = View;