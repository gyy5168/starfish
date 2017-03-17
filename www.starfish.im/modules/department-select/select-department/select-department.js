var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	SelectList = require("./select-list/select-list.js"),
	SearchList = require("./search-list/search-list.js");

var View = Backbone.View.extend({

	attributes: {
		class: "select-department-content"
	},

	initialize: function( options ) {
		this.selectedList = options.selectedList;
		this.render();
        this.initSearchEvent();
	},

	render: function() {
		this.$el.html(__inline("select-department.html"));
		this.$content = this.$el.find(".JS-select-content");
        this.$searchInput = this.$el.find(".JS-search-input");

		this.modules = {};
		this.modules.selectList = new SelectList({
			selectedList: this.selectedList
		});
		this.modules.searchList = new SearchList({
			selectedList: this.selectedList
		});

		this.$content.append( this.modules.selectList.$el);
		this.$content.append( this.modules.searchList.$el);
	},

	initSearchEvent: function(){
		var that = this;

		this.$searchInput.on("input", function(){
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


	destroy: function(){
        this.modules.selectList.destroy();
        this.modules.searchList.destroy();

		this.remove();
	}
});

module.exports = View;