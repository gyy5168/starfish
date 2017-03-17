var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	FormPeople = require("./task-filter-people/task-filter-people.js"),
	FormStatus = require("./task-filter-status/task-filter-status.js"),
	FormTag = require("./task-filter-tag/task-filter-tag.js"),
	point = require("modules-common/point/point.js"),
	Modal = require("modules-common/modal/modal.js"),
	urlTool = require("modules-common/tools/url.js");

var View = Modal.extend({

	title:"更多筛选",

	content:__inline("task-filter.html"),

	attributes: {
		"class": "task-filter"
	},

	initialize: function( option ) {
		this.projectId = option.projectId;
		this.projectObj = option.projectObj;
		View.__super__.initialize.call(this);
		this.setForm( urlTool.toObj( option.param ));
	},

	render: function() {
		View.__super__.render.call(this);
		this.$form = this.$el.find(".JS-form");
		this.$ok = this.$el.find(".JS-ok");
		this.renderForm();

		$("#wraper").append(this.$el);
	},

	renderForm: function(){
		this.modules = {};
		this.modules.assignee = new FormPeople({
			title:"任务负责人",
			projectObj: this.projectObj
		});
		
		this.modules.is_completed = new FormStatus();

		this.modules.creator = new FormPeople({
			title:"任务创建者",
			projectObj: this.projectObj
		});

		this.modules.tag_id = new FormTag({
			projectObj: this.projectObj
		});

		this.$form.append(this.modules.assignee.$el);
		this.$form.append(this.modules.is_completed.$el);
		this.$form.append(this.modules.creator.$el);
		this.$form.append(this.modules.tag_id.$el);
		
	},

	initEvent: function() {
		var that = this;
		View.__super__.initEvent.call(this);
		this.$ok.on("click", function(){
			var data = that.getForm();

			if ( that.isEmpty( data ) ) {
				point.shortShow({
					text:"没有选择条件"
				});
				return;
			}

			var value = urlTool.toStr(data);
			value = "project_id=" + that.projectId + "&" + value+"&navType=more";
			global.modules.router.navigate("task?" + value, {trigger: true});
			that.hide();
		});
	},

	isEmpty: function(obj){
		var flag = true;
		$.each( obj, function( key, value ) {
			if ( value.length > 0 ) {
				flag = false;
				return false;
			}
		});
		return flag;
	},

	getForm: function(){
		var obj = {};
		$.each( this.modules, function( key, module ) {
			obj[key] = module.get();
		});
		return obj;
	},

	setForm: function( obj ){
		var that = this;
		$.each( obj, function( key,value ) {
			that.modules[key] && that.modules[key].set( value );
		});
	},

	set: function( option ) {
		this.projectId = option.projectId;
		this.setForm( urlTool.toObj( option.param ));
		this.projectObj = option.projectObj;
	},

	update: function(){
		var url = window.location.href,
			param = url.substr( url.indexOf("?") + 1 );
		this.setForm( urlTool.toObj( param ));
		this.projectId = urlTool.getParam( param, "project_id")[0];
	},

	clear: function(){
		$.each( this.modules, function( key, module ) {
			module.clear();
		});
	},

	hide: function(){
		View.__super__.hide.call(this);
		this.destroy();
	},

	destroy: function(){
		$.each( this.modules, function( key, module ) {
			module.destroy();
		});
		View.__super__.destroy.call( this );
	}
});

module.exports = View;