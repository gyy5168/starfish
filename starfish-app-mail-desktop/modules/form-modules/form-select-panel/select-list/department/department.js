var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Node = require("./node/node.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "form-select-department"
	},

	initialize: function(option) {
		this.selectedList = option.selectedList;
		this.render();
		this.initEvent();
		this.loadRoot();
	},

	render: function() {
		this.$el.html(__inline("department.html"));

		this.$list = this.$el.find("ul");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");
	},

	initEvent: function() {
		var that = this;

		this.listenTo( this.selectedList, "add", function(model){
			var id = that.selectedList.modelId(model.toJSON());
			that.$el.find(".JS-node[data-id="+id+"]").addClass("selected");
		});

		this.listenTo( this.selectedList, "remove", function(model){
			var id = that.selectedList.modelId(model.toJSON());
			that.$el.find(".JS-node[data-id="+id+"]").removeClass("selected");
		});

		this.$error.on("click", function(){
			that.loadRoot();
		});
	},

	loadRoot: function(){
		var that = this;
		if ( this.loadRooting ) {
			return;
		}
		this.loadRooting = true;

		this.showLoading();

		return $.ajax({
			url:global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/departments?parent=0&page=1&count=10",
			type:"GET",
			dataFilter: function(response){
				response = JSON.parse(response);
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				_.each( response.data, function(data){
					data.type = "department";
				});
				response = JSON.stringify(response);
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				return response;
			},

			success: function(response){
				if ( response.errcode === 0 ) {
					var data = response.data[0],
						itemView = new Node({
							model: new Backbone.Model(data),
							parentView: that,
							selectedList: that.selectedList
						});
					that.$list.append( itemView.$el );
					that.showContent();

					itemView.open();
				} else {
					point.shortShow({
						type:"error",
						text: global.tools.getErrmsg(response.errcode)
					});
					that.showError();
				}
			},

			error: function(){
				that.showError();

				point.shortShow({
					type:"error",
					text:"请检查网络"
				});
			},

			complete: function(){
				that.loadRooting = false;
			}
		});
	},

	showLoading: function(){
		this.$loading.show();
		this.$error.hide();
		this.$list.hide();
	},

	showError: function(){
		this.$loading.hide();
		this.$error.show();
		this.$list.hide();
	},

	showContent: function(){
		this.$loading.hide();
		this.$error.hide();
		this.$list.show();
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