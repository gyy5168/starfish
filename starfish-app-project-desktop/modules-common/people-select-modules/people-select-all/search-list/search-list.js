var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	SearchList = require("modules-common/people-select-modules/search-list/search-list.js");

var View = SearchList.extend({
	createSearchUrl: function(value) {
		return global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/search?q=" + encodeURIComponent(value) +
				"&type=100&page=1&count=20";
	},

	ajaxDataFilter: function(response){
		response = JSON.parse( response );
		if (response.errcode !== 0) {
			return JSON.stringify(response);
		}

		var arr = [];
		_.each(response.data.data, function(obj){
			var result = {};
			if ( obj.type === 103 ) {
				result.type = "department";
			} else if ( obj.type === 102 ) {
				result.type = "discussionGroup";
			} else if ( obj.type === 101 ) {
				result.type = "people";
			}

			result.id = obj.source.id;
			result.name = obj.source.name;
			result.avatar = obj.source.avatar;

			arr.push( result );
		});

		response.data = arr;

		return JSON.stringify(response);
	}
});


module.exports = View;