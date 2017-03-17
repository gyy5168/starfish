var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	Node = require("./node/node.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "set-select-department"
	},

	initialize: function() {
		this.render();
		this.initEvent();
		this.loadRoot();
	},

	render: function() {
		this.$el.html(__inline("set-select-department.html"));

		this.$list = this.$el.find("ul");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");
	},

	initEvent: function() {
		var that = this;

	},

	loadRoot: function(){
		var that = this;
		if ( this.loadRooting ) {
			return;
		}
		this.loadRooting = true;

		this.$loading.show();
		this.$error.hide();
		this.$list.hide();

		return $.ajax({
			url:global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/departments?parent=0&page=1&count=10",
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					var data = response.data[0],
						itemView = new Node({
							model: new Backbone.Model(data),
							parentView: that
						});
					that.$list.append( itemView.$el );
					that.$list.show();

					itemView.open();
				}
			},

			error: function(){
				that.trigger("loadTreeError")
			},

			complete: function(){
				that.loadRooting = false;
				that.$loading.hide();
			}
		});
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
	
});

module.exports = View;