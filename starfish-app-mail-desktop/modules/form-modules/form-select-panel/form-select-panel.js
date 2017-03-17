var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	SelectList = require("./select-list/select-list.js"),
	SearchList = require("./search-list/search-list.js");

// var SelectedList = Backbone.Collection.extend({
// 	modelId: function( attrs ) {
// 		return attrs.type +""+ attrs.id;
// 	}
// });

var SelectPanel = Backbone.View.extend({

	attributes: {
		class: "form-select-panel"
	},

	initialize: function(options) {
		this.selectedList = options.list;
		this.render();
		this.initSearchEvent();
		this.initPanelEvent();
	},

	render: function() {
		this.$el.html(__inline("form-select-panel.html"));
		this.$bd = this.$el.find(".JS-bd");
		this.$input = this.$el.find("input");
		this.$close = this.$el.find(".JS-close");

		this.modules = {};
		this.modules.selectList = new SelectList({
			selectedList: this.selectedList
		});
		this.modules.searchList = new SearchList({
			selectedList: this.selectedList
		});

		this.$bd.append( this.modules.selectList.$el);
		this.$bd.append( this.modules.searchList.$el);
	},

	initSearchEvent: function(){
		var that = this;

		this.$input.on("input", function(){
			var value = $(this).val();

			value = value.replace(/(^\s*)|(\s*$)/g, "");

			if ( value === "" ) {
				that.modules.selectList.show();
				that.modules.searchList.hide();
				// that.$inputClean.hide();
				return false;
			}

			// that.$inputClean.show();

			that.modules.selectList.hide();
			that.modules.searchList.show();

			that.modules.searchList.search(value);
		});
	},

	initPanelEvent: function(){
		var that = this;

		this.$close.on("click", function(){
			that.hide();
		});

		this.docHandle = this.docHandle = function(){
			if ( that.ignore ) {
				that.ignore = false;
				return;
			}
			that.hide();
		}

		this.$el.on("click", function(event){
			event.stopPropagation();
			event.preventDefault();
		});

		$(document).on("click.form-select-panel", this.docHandle);
	},

	setPosition: function(option){
		option = option || {};
		var left = option.left,
			top = option.top,
			right = option.right,
			bottom = option.bottom,
			$doc = $(document),
			docHeight = $doc.height(),
			docWidth = $doc.width(),
			height = this.$el.outerHeight(),
			width =  this.$el.outerWidth();

		if ( left && ( left + width >= docWidth )) {
			left = docWidth - width;
		}

		if ( top && (top + height >= docHeight) ) {
			top = docHeight - height;
		}

		if ( right && (right + width >= docWidth) ) {
			right = docWidth - width;
		}

		if ( bottom && (bottom + height >= docHeight) ) {
			bottom = docHeight - height;
		}

		var obj = {};

		left && (obj.left = left);
		top && (obj.top = top);
		right && (obj.right = right);
		bottom && (obj.bottom = bottom);

		this.$el.css(obj);
	},

	show: function(flag) {
		this.ignore = flag;
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		$(document).off("click.form-select-panel", this.docHandle);
		_.each( this.modules, function(module){
			module.destroy();
		});
		this.remove();
	}
});

module.exports = SelectPanel;