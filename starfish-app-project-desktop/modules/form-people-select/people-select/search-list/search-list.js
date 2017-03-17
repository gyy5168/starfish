var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	SearchList = require("modules-common/people-select-modules/search-list/search-list.js");


var View = SearchList.extend({
	createSearchUrl: function(value){
		return global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/search/project/members?q=" + value +
				"&page=1&highlight=0&count=" + this.pageSize + "&project=" + this.option.projectId
	},

	ajaxDataFilter: function(response){
		response = JSON.parse( response );
		if (response.errcode !== 0 ) {
			return response;
		} 

		response.data = _.pluck( response.data.data, "source");

		return JSON.stringify(response);
	}
});

module.exports = View;