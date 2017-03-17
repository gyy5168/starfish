var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js"),
	point = require("modules-common/point/point.js"),
	GroupView = require("./group-item/group-item.js"),
	PeopleView = require("./people-item/people-item.js");

var View = Backbone.View.extend({

	title:"人员选择",

	initialize: function(option) {
		this.list = option.list;
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("people-list.html"));
		this.$list = this.$el.find("ul");
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
	},

	addItem: function(model){
		var data = model.get("data"),
			itemView;

		if ( data ) {
			itemView = new GroupView({
				model:model
			});
		} else {
			itemView = new PeopleView({
				model:model
			});
		}

		this.$list.append(itemView.$el);
	},

	removeItem: function(model){
		model.view.destroy();
	},

	filter: function(value){
		if ( value ) {
			this.$list.addClass("searching");
		} else {
			this.$list.removeClass("searching");
		}
		
		this.$el.find("li").each( function(){
			var $this = $(this),
				name = $this.text();

			if ( name.indexOf( value ) >= 0 ) {
				$this.show();
			} else {
				$this.hide();
			}
		});
	},

	clear: function(){
		this.list.each(function(model){
			model.view.clear();
		});
	},

	destroy: function(){
		this.list.reset([]);
		this.remove();
	},

	attributes: {
		class: "people-list"
	}
});

module.exports = View;