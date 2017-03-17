var Backbone = require("modules-common/backbone/backbone.js");
var AppRouter = Backbone.Router.extend({
	routes:{
		"*path":function(path){}
	}
});
module.exports = new AppRouter;

