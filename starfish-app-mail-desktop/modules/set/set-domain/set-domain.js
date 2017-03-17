var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	help=require("./help/help.js"),
	ItemView = require("./set-domain-item/set-domain-item.js");

var View = Backbone.View.extend({
	tagName: "div",

	uuid: 1,

	attributes: {
		class: "set-domain"
	},

	initialize: function() {
		this.list = global.data.domainList.clone();
		this.render();
		this.initEvent();
	},

	render: function() {
		var that = this;
		this.$el.html(__inline("set-domain.html"));
		this.$add = this.$el.find(".JS-domain-add");
		this.$more=this.$el.find(".JS-more");

		this.$list = this.$el.find("ul");

		this.list.each( function(model) {
			that.addItem(model);
		});

		// 如果没有域名，则创建一个新的
		if (this.list.length === 0 ) {
			this.newDomain();
		}
	},

	initEvent: function() {
		var that = this;

		this.$add.on("click", function(){
			that.newDomain();
		});

		this.$more.on("click",function(){
			help.show()
		});

		this.listenTo( this.list, "add", function(model){
			if(that.list.length>=10){
				point.shortShow({
					type:"error",
					text:"域名添加上限为10个"
				})
				return
			}
			that.addItem(model)
		});

		this.listenTo( this.list, "remove", function(model){

			that.removeItem(model);

			// 如果没有域名，则创建一个新的
			if (that.list.length === 0 ) {
				that.newDomain();
			}
		});
	},

	newDomain: function(){
		this.list.add({
			id:"new" + this.uuid++,
			name:""
		});
	},

	addItem: function(model) {
		var itemView = new ItemView({
				model: model,
				parentView: this
			});

		this.$list.append(itemView.$el);
	},

	removeItem: function(model){
		var id = model.get("id");
		this.$list.find("li[data-id="+id+"]").data("view").destroy();
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = View;