var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js");

var View = Backbone.View.extend({

	attributes:{
		"class": "role-select"
	},

	initialize: function(option){
		this.render();
		this.initEvent();

		this.$selectPanel.find("li:first").trigger("click");
	},

	render: function(){
		this.$el.html(__inline("role-select.html"));
		this.$selectPanel = this.$el.find("ul");
		this.$text = this.$el.find(".JS-text");
		this.$label = this.$el.find(".JS-label");
	},

	initEvent: function(){
		var that = this;

		this.$text.on("click", function( event ){
			that.$selectPanel.toggle();
			event.stopPropagation();
		});

		this.$selectPanel.on("click", "li", function(){
			var $this = $( this ),
				value = $this.data("value");
			
			that.set(value);
			that.$selectPanel.hide();
		});

		this.docHandle = function(){
			that.$selectPanel.hide();
		}

		$(document).on("click.role-select", this.docHandle);
	},

	set: function(value){
		var $node = this.$el.find("li[data-value="+value+"]");

		if ( $node.length === 0 ) {
			return;
		}

		this.value = value;
		this.$text.text( $node.text() );
		this.trigger("change", value );
	},

	get: function(value){
		return this.value;
	},

	destroy: function(){
		$(document).off("click.role-select", this.docHandle);
		this.remove();
	}
});

module.exports = View;