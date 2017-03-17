var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	SelectAll = require("modules-common/select-all/select-all.js");

// 监听发送事件
global.event.on("send", function(arr){

	new SelectAll({
		title:"发送",
		callback: function(data){
			var files = [],
				dests = [];

			_.each( arr, function(obj) {
				files.push( obj.id );
			});

			_.each( data, function(obj) {
				var result = {};
				result.id = obj.id;
				if ( obj.type === "people" ) {
					result.type = 0;
				} else if ( obj.type === "department" ) {
					result.type = 3;
				} else {
					result.type = 1;
				}
				dests.push( result );
			});

			var obj = {
				body:{
					files:files
				},
				dests:dests,
				type:48
			};
			send( obj );
		}
	});


	var sending = false;
	function send(data){
		if ( sending ) {
			return;
		}
		sending = true;

		point.show({
			text:"正在发送"
		});
		return $.ajax({
			url:global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/messages",
			type:"POST",
			data: JSON.stringify(data),
			success: function(response){
				if ( response.errcode === 0 ) {
					point.shortShow({
						type:"success",
						text:"发送成功"
					});
				} else {
					point.shortShow({
						type:"error",
						text:"发送失败"
					});
				}
			},

			error: function(){
				point.shortShow({
					type:"error",
					text:"发送失败"
				});
			},

			complete: function(){
				sending = false;
			}
		});
	}
});

module.exports = {

};