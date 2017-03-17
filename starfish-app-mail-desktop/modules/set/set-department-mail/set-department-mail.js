var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	LeftPanel = require("modules/set-select-department/set-select-department.js"),
	RightPanel = require("./right-panel/right-panel.js");
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
	attributes: {
		class: "set-department-mail"
	},

	initialize: function() {
		this.modules={
			leftPanel:new LeftPanel,
			rightPanel:new RightPanel
		};
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("set-department-mail.html"));
		this.$leftPanel=this.$el.find(".JS-left-panel");
		this.$leftPanel.append(this.modules.leftPanel.$el);
		this.$rightPanel=this.$el.find(".JS-right-panel");
		this.$rightPanel.append(this.modules.rightPanel.$el);

		this.$error=this.$el.children(".JS-error");
		this.$errorBtn=this.$error.find(".JS-btn");
		global.$doc.append(this.$el);
	},

	initEvent: function() {
		var that=this;
		this.listenTo(this.modules.leftPanel,"select",function(data){
			that.modules.rightPanel.set(data)
		});

		this.listenTo(that.modules.leftPanel,"loadTreeError",function(){
			that.$leftPanel.hide();
			that.$rightPanel.hide();
			that.$error.show()
		});

		this.$errorBtn.on("click",function(){
			that.$leftPanel.show();
			that.$rightPanel.show();
			that.$error.hide();
			that.modules.leftPanel.loadRoot()
		})
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}

	
});

module.exports = View;