var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js"),
	PeopleItem = require("../people-item/people-item.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	tagName:"li",

	template: __inline("group-item.tmpl"),

	initialize: function() {
		this.list = new Backbone.Collection();
		this.render();
		this.initEvent();
		this.loadData();
		this.model.view = this;
	},

	render: function() {
		var obj = this.model.toJSON(),
			arr = obj.data;
		obj.avatar = obj.avatar || false;
		this.$el.append( this.template(obj));
		this.$list = this.$el.find("ul");

		if ( obj.open ) {
			this.$el.addClass("open");
		}

		this.$el.data("view", this);
	},

	initEvent: function() {
		var that = this;

		this.listenTo(this.list, "reset", function(list, option){
		
			$.each(option.previousModels, function( index, model ) {
				model.view.destroy();
			});

			list.each( function( model ) {
				that.addItem(model);
			});

		});

		this.listenTo(this.list, "remove", this.removeItem);

		this.listenTo(this.list, "add", this.addItem);

		this.$el.find(".JS-group-hd").on("click", function(){
			that.$el.toggleClass("open");
		});

		this.listenTo(this.list, "change", function(){
			that.model.set("data", that.list.toJSON());
		});

		this.listenTo( this.list, "change:selected", function(model, value){
			that.model.trigger("peopleChange:selected", model, value);
		});
		
	},

	loadData: function(){
		var data = this.model.get("data");
		if ( data ) {
			this.list.reset(data);
		}
	},

	addItem: function(model){
		var itemView = new PeopleItem({
			model:model
		});

		this.$list.append( itemView.$el );
	},

	removeItem: function(model){
		model.view.destroy();
	},

	clear: function(){
		var open = this.model.get("open");
		if ( open ) {
			this.$el.addClass("open");
		} else {
			this.$el.removeClass("open");
		}

		this.list.each(function(model) {
			model.view.clear();
		});
	},

	destroy: function(){
		this.model.view = null;
		this.list.reset([]);
		this.$el.removeData();
		this.remove();
	},

	attributes: {
		class: "group-item"
	}
});

module.exports = View;