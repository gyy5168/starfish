var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),

	FormName = require("modules/project-form-modules/project-form-name/project-form-name.js"),
	FormDescription = require("modules/project-form-modules/project-form-description/project-form-description.js"),
	FormCharge = require("modules/project-form-modules/project-form-charge/project-form-charge.js"),
	FormMember = require("modules/project-form-modules/project-form-member/project-form-member.js"),

	point = require("modules-common/point/point.js"),
	Modal = require("modules-common/modal/modal.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "project-create-view"
	},

	content:__inline("project-create.html"),

	initialize: function() {
		global.modules.projectCreate = this;
		this.render();
		this.initEvent();

		// 设置负责人为自己
		this.modules.person_in_charge.set(global.data.user.toJSON());
	},

	// 渲染UI
	render: function() {
		this.$el.html(__inline("project-create.html"));
		this.$form = this.$el.find(".JS-form");
		this.$ok = this.$el.find(".JS-ok");
		this.$cancel = this.$el.find(".JS-cancel");

		this.renderForm();

		$("#wraper").append(this.$el);
	},

	// 渲染表单UI
	renderForm: function(){
		this.modules = {};
		this.modules.name = new FormName();
		this.modules.intro = new FormDescription();
		this.modules.person_in_charge = new FormCharge();
		this.modules.members = new FormMember();

		this.$form.append(this.modules.name.$el);
		this.$form.append(this.modules.intro.$el);
		this.$form.append("<div class=\"hr\"></div>");
		this.$form.append(this.modules.person_in_charge.$el);
		this.$form.append(this.modules.members.$el);
	},

	// 绑定事件
	initEvent: function() {
		var that = this;

		this.$ok.on("click", function(){
			var data = that.getForm();
			if ( that.verify( data ) ) {
				that.create(data);
			}
		});

		this.$el.find(".JS-index").on("click", function(event) {
			var router = global.modules.router;
			event.preventDefault();
			router.navigate("", {trigger: true});
		});

		this.$cancel.on("click", function(){
			var router = global.modules.router;
			router.navigate("", {trigger: true});
		});
	},

	// 获取表单数据
	getForm: function(){
		var obj = {};
		$.each( this.modules, function( key, module ) {
			obj[key] = module.get();
		});

		return obj;
	},

	// 清除模块数据
	clear: function(){
		$.each( this.modules, function( key, module ) {
			module.clear();
		});
	},

	// 验证
	verify: function(data){
		data.name = data.name.trim();
		data.intro = data.intro.trim();
        //找到与当前项目名重复的项目
        // var flag = global.data.projectList.find(function(model){
        //     return model.get("name").trim() === data.name.trim();
        // });
        // //如果找到了，就返回false
        // if( flag ) {
        //     point.shortShow({
        //         text:"项目名不可重复"
        //     });
        //     //选中项目名称输入框
        //     this.modules.name.select()
        //     return false
        // }

        if ( data.name === "" ) {
            point.shortShow({
                type:"error",
                text:"项目名称不能为空"
            });
            return false;
        }

        if ( data.name.length > 50 ) {
        	point.shortShow({
        		type:"error",
        		text:"项目名称不能超过50个字符"
        	});
        	return false;
        }

        if ( data.intro.length > 100 ) {
        	point.shortShow({
        		type:"error",
        		text:"项目描述不能超过100个字符"
        	});
        	return false;
        }

        return true;
	},

	// 创建项目
	create: function(data){
		var that = this;

		if ( this.creating ) {
			return false;
		}
		this.creating = true;

		// 按钮显示loading的gif
		this.$ok.addClass("loading");

		this.ajaxObj = $.ajax({
			url:global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects",
			type:"POST",
			data: JSON.stringify(data),
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				global.event.trigger("projectCreated", response.data);
				var router = global.modules.router;
				router.navigate("", {trigger: true});
			} else {
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(response.errcode)
				});
			}
		}

		function error(){
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
			});
		}

		function complete(){
			that.creating = false;
			that.$ok.removeClass("loading");
		}
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		$.each( this.modules, function( key, module ) {
			module.destroy();
		});

		this.remove();
		global.modules.projectCreate = null;
	}
});

module.exports = View;