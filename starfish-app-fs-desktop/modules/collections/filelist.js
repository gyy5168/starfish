// 去掉parse
var Backbone = require("modules-common/backbone/backbone.js");

var List = Backbone.Collection.extend({
	parse: function( data ){
		if ( data.errcode !== undefined && data.errcode === 0 ) {
			return data.data;
		}
	}
});

module.exports = new List();