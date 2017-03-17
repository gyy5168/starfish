var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	SearchList = require("modules-common/people-select-modules/search-list/search-list.js");

var View = SearchList.extend({
	createSearchUrl: function(value) {
		return global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/search?q=" + value +
				"&type=101&page=1&count=20";
	},

	ajaxDataFilter: function(response){
		response = JSON.parse( response );
		if (response.errcode !== 0 ) {
			return response;
		} 

		response.data = _.pluck( response.data.data, "source");

		return JSON.stringify(response);
	},

	onlySelect: false
});


module.exports = View;