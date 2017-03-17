var init = require("modules-common/init/init.js");
init(function(){
    global.baseUrl2 = "https://api.starfish.im/v2";
	var Backbone = require("modules-common/backbone/backbone.js");

    var FileList=require("./file-list/file-list.js");
    var router=require("./router/router.js");

    var fileList=new FileList();
	router.route("share?type=root&ids=:ids",function(ids){
        fileList.setIds(ids);
    });

    router.route("share?type=parent&id=:id",function(id){
        fileList.set(id)
    });

	Backbone.history.start();
});


module.exports = {};