var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	SelectDepartment = require("modules/set-select-department/set-select-department.js"),
	RightPanel = require("./right-panel/right-panel.js");

var View = Backbone.View.extend({

	attributes: {
		class: "set-people-mail"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("set-people-mail.html"));
		this.$leftPanel = this.$el.find(".JS-left-panel");
		this.$rightPanel = this.$el.find(".JS-right-panel");
		this.modules = {};
		this.modules.selectDepartment = new SelectDepartment();
		this.modules.rightPanel = new RightPanel();

		this.$leftPanel.append( this.modules.selectDepartment.$el );
		this.$rightPanel.append( this.modules.rightPanel.$el );

		this.$error=this.$el.children(".JS-error")
		this.$errorBtn=this.$error.find(".JS-btn")
	},

	initEvent: function() {
		var that = this;

		this.listenTo( this.modules.selectDepartment, "select", function(obj){
			that.modules.rightPanel.set( obj.id );
		});

		this.listenTo(that.modules.selectDepartment,"loadTreeError",function(){
			that.$leftPanel.hide();
			that.$rightPanel.hide();
			that.$error.show()
		})

		this.$errorBtn.on("click",function(){
			that.$leftPanel.show();
			that.$rightPanel.show();
			that.$error.hide()
			that.modules.selectDepartment.loadRoot()
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