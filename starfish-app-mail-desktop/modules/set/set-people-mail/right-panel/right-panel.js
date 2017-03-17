var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	EmailList = require("./email-list/email-list.js"),
	SearchList = require("./search-list/search-list.js");

var View = Backbone.View.extend({

	attributes: {
		class: "set-right-panel"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("right-panel.html"));
		this.$content = this.$el.find(".JS-content");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");
		this.$contentBd = this.$el.find(".JS-content-bd");
		this.$input = this.$el.find("input");

		this.modules = {};
		this.modules.emailList = new EmailList();
		this.modules.searchList = new SearchList();

		this.$contentBd.append( this.modules.emailList.$el );
		this.$contentBd.append( this.modules.searchList.$el );
	},

	initEvent: function() {
		var that = this;
		this.$error.find(".JS-btn").on("click", function(){
			that.load();
		});

		this.$input.on("input", function(){
			var value = $(this).val();

			value = value.replace(/(^\s*)|(\s*$)/g, "");

			if ( value === "" ) {
				that.modules.emailList.show();
				that.modules.searchList.hide();
				// that.$inputClean.hide();
				return false;
			}

			// that.$inputClean.show();

			that.modules.emailList.hide();
			that.modules.searchList.show();

			that.modules.searchList.search(value);
		});
	},

	set: function(id){
		if ( this.id === id ) {
			return;
		}
		this.id = id;
        this.modules.searchList.hide();
        this.modules.emailList.show();
		this.modules.emailList.load(this.id)
		this.show();
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.modules.emailList.destroy();
		this.remove();
	}

	
});

module.exports = View;