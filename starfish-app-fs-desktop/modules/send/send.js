var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	PeopleSelect = require("modules-common/people-select-all/people-select-all.js");

var View = PeopleSelect.extend({
	title:"发送",

	initialize: function() {
		View.__super__.initialize.call(this);

		var views = global.modules.fileList.getSelectedView(),
			view = views[0];
		this.fileId = view.model.get("id");
	},

	render: function(){
		View.__super__.render.call(this);
	},

	initEvent: function(){
		View.__super__.initEvent.call(this);
		var that = this;
		
		this.listenTo( this, "ok", function(list){

			if ( list.length === 0 ) {
				point.shortShow({
					text:"请选择要发送给的人、部门或者讨论组"
				});
				return;
			}

			var dests =[];

			$.each( list, function( index, obj ) {
				dests.push({
					id: obj.id,
					type: transferType(obj.type)
				});
			});

			var sendData = {
				body: {
					files:[this.fileId]
				},
				dests: dests,
				type: 48
			};

			that.addLoadingState();

			that.send(sendData).success(function(response){
				if ( response.errcode === 0 ) {
					that.removeLoadingState();
				} else {
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
					that.removeLoadingState();
				}
			}).error(function(){
				that.removeLoadingState();
			});
		});

		this.listenTo( this, "hide", function(){
			that.destroy();
		});

		// 转换type， 发送消息的类型和app的人员类型不一样
		function transferType( str ){
			switch(str){
				case "department":
					return 3;
				case "people":
					return 0;
				case "discussionGroup": 
					return 1;
			}
		}
		
	},

	send: function(data){
		if ( this.sending ) {
			return;
		}
		var that = this;
		this.sending = true;

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/messages",
			type:"POST",
			data:JSON.stringify(data),
			success: function(response){
				if ( response.errcode === 0 ) {
					that.hide();
					point.shortShow({
						type:"success",
						text:"发送成功"
					});
				}else{
					point.shortShow({
						text: global.tools.getErrmsg(data.errcode),
						type: 'error'
					});
				}
			},
			error: function(){
				point.shortShow({
					type:"error",
					text:"网络异常，请检查您的网络设置"
				});
			},
			complete: function(){
				that.sending = false;
			}
		});
	}

});

global.event.on("send", function(){
	var send = new View();
	send.show();
});

module.exports = View;