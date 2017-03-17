var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "form-combin"
	},

	initialize: function(option) {
		this.option = option;
		this.render();
		this.initEvent();
		this.clear();
	},

	render: function() {
		this.$el.html(__inline("form-combin.html"));
		this.$cc = this.$el.find(".JS-cc");
		this.$bcc = this.$el.find(".JS-bcc");
	},

	initEvent: function() {
		var that = this;

		this.$cc.on("click", function() {
			var $this = $(this),
				action = $this.data("action");

			if (action === "add") {
				that.showRemoveCc();
			} else if (action === "remove") {
				that.showAddCc();
			}
		});

		this.$bcc.on("click", function() {
			var $this = $(this),
				action = $this.data("action");

			if (action === "add") {
				that.showRemoveBcc();
			} else if (action === "remove") {
				that.showAddBcc();
			}
		});
	},

	clear: function(){
		this.showAddCc();
		this.showAddBcc();
	},

	showAddCc: function(){
		this.$cc.html("添加抄送").data("action","add");
		
		this.option.cc.hide();
		this.option.cc.clear();
	},

	showRemoveCc: function(){
		this.$cc.html("删除抄送").data("action","remove");
		this.option.cc.show();
	},

	showAddBcc: function(){
		this.$bcc.html("添加密送").data("action","add");
		this.option.bcc.hide();
		this.option.bcc.clear();
	},

	showRemoveBcc: function(){
		this.$bcc.html("删除密送").data("action","remove");
		
		this.option.bcc.show();
	},

	destroy: function(){
		this.remove();
	}

	
});

module.exports = View;