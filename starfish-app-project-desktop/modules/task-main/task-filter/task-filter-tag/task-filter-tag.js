var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	TagPanel = require("../task-filter-tag-panel/task-filter-tag-panel.js");

var View = Backbone.View.extend({
	tagName: "div",

	template:__inline("task-filter-tag.tmpl"),

	initialize: function(option) {
		this.projectObj = option.projectObj;
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("task-filter-tag.html"));
		this.$list = this.$el.find("ul");
		this.$add = this.$el.find(".JS-add");
	},

	initEvent: function() {
		var that = this;
		this.$add.on("click", function( event ) {
			var offset = that.$add.offset(),
				left = offset.left,
				top = offset.top + that.$add.height();

			if ( !that.tagPanel ) {
				that.tagPanel = new TagPanel();
			}

			that.tagPanel.toggle({
				callback:handle,
				left:left,
				top:top,
				list: that.projectObj.tags
			});

			event.stopPropagation();
		});

		this.$list.on("click", ".JS-remove", function(){
			var id = $(this).parent().data("id");
			that.removeItem(id);
		});

		function handle(id){
			if ( that.hasItem(id ) ) {
				return;
			}
			that.addItem(id);
		}
	},

	hasItem: function(id){
		var len = this.$list.find("li[data-id="+id+"]").length;
		if ( len > 0 ) {
			return true;
		}
		return false;
	},

	addItem: function(id){
		var that = this;
		$.each( this.projectObj.tags, function( index, obj ) {
			if ( obj.id == id ) {
				that.$list.prepend( that.template( obj ));
			}
		});
		
	},

	removeItem: function(id){
		this.$list.find("li[data-id="+id+"]").remove();
	},

	get: function(){
		var arr = [];
		this.$list.find("li").each(function(){
			var id = $(this).data("id");
			arr.push(id);
		});
		return arr;
	},

	set: function(arr){
		var that = this;
		this.clear();
		$.each(arr, function( index, id ){
			that.addItem(id);
		});
	},

	clear: function(){
		this.$list.html("");
	},

	attributes: {
		class: "task-filter-tag"
	},

	destroy: function(){
		this.tagPanel && this.tagPanel.destroy();
		this.remove();
	}
});

module.exports = View;