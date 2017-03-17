var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	peopleTool = require("modules-common/tools/people.js"),
	PeopleSelect = require("modules/form-people-select/form-people-select.js");

var View = Backbone.View.extend({
	tagName: "div",

	initialize: function(option) {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("task-filter-status.html"));
		this.$complete = this.$el.find(".JS-complete");
		this.$uncomplete = this.$el.find(".JS-uncomplete");
	},

	initEvent: function() {
		var that = this;

		this.$complete.on("click", function(){
			var $this = $( this );
			if ( $this.hasClass("selected") ) {
				$this.removeClass("selected");
			} else {
				$this.addClass("selected");
			}
		});

		this.$uncomplete.on("click", function(){
			var $this = $( this );
			if ( $this.hasClass("selected") ) {
				$this.removeClass("selected");
			} else {
				$this.addClass("selected");
			}
		});
	},

	get: function(){
		var arr = [];

		if ( this.$complete.hasClass("selected") ) {
			arr.push(1);
		}
		if ( this.$uncomplete.hasClass("selected") ) {
			arr.push( 0 );
		}
		return arr;
	},

	set: function(arr){
		var that = this;
		this.clear();
		$.each( arr, function( index, value ) {
			if ( value == "1" ) {
				that.$complete.addClass("selected");
			} else if ( value == "0" ) {
				that.$uncomplete.addClass("selected");
			}
		});
	},

	clear: function(){
		this.$complete.removeClass("selected");
		this.$uncomplete.removeClass("selected");
	},

	attributes: {
		class: "task-filter-status"
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = View;