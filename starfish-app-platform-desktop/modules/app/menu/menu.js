var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
	tagName: "ul",

	attributes: {
		class: "menu"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("menu.html"));
		$("#wraper").append( this.$el );
	},

	initEvent: function() {
		var that = this;

		this.$el.on("click", "li", function(){
			var action = $( this).data("action");
			global.event.trigger(action, that.data);
		});

		this.docHandle = function(){
			that.$el.hide();
		};

		$(document).on("click.menu", this.docHandle);
	},

	show: function(option){
		this.$el.show();
		this.set(option);
	},

	hide: function(){
		this.$el.hide();
	},

	set: function(option) {
		var that = this;
		option = option || {};
		
		if ( option.shows ) {
			if ( option.shows.length === 0 ) {
				return;
			}
			that.$el.find("li").hide();
			$.each(option.shows, function(index, str){
				that.$el.find("li[data-action="+str+"]").show();
			});
		}

		if ( option.css ) {
			this.$el.css(option.css);
		}

		if ( option.data ) {
			this.data = option.data;
		}
	},

	changeMenu: function(){
		var value = this.model.get("inNav");
		if ( value ) {
			this.$menu.removeClass("install")
		} else {
			this.$menu.addClass("install")
		}
	},

	destroy: function(){
		$(document).off("click.menu", this.docHandle);
		this.$el.removeData();
		this.remove();
	}

});

module.exports = View;