var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	FormName = require("modules/project-form-modules/project-form-name/project-form-name.js"),
	FormDescription = require("modules/project-form-modules/project-form-description/project-form-description.js"),
	FormCharge = require("modules/project-form-modules/project-form-charge/project-form-charge.js"),
	FormMember = require("modules/project-form-modules/project-form-member/project-form-member.js"),
	Modal = require("modules-common/modal/modal.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "project-detail-view"
	},

	content:__inline("project-detail.html"),

	initialize: function() {
		this.render();
		this.initEvent();
		global.modules.projectDetail = this;
	},

	render: function() {
		this.$el.html(__inline("project-detail.html"));

		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$form = this.$el.find(".JS-form");
		this.$content = this.$form;
		this.renderForm();
		this.$projectClose = this.$el.find(".JS-project-close");
		global.$doc.append(this.$el);
	},

	renderForm: function(){
		this.modules = {};
		this.modules.name = new FormName({type:"detail"});
		this.modules.intro = new FormDescription({type:"detail"});
		this.modules.person_in_charge = new FormCharge({type:"detail"});
		this.modules.members = new FormMember({type:"detail"});

		this.$btns = $(__inline("project-detail-btns.html"));

		this.$form.append(this.modules.name.$el);
		this.$form.append(this.modules.intro.$el);
		this.$form.append(this.$btns);
		this.$form.append("<div class=\"hr\"></div>");
		this.$form.append(this.modules.person_in_charge.$el);
		this.$form.append(this.modules.members.$el);

		if ( global.data.org.get("isAdmin") ) {
			this.$form.append("<div class=\"hr\"></div>");
			this.$form.append(__inline("project-detail-close.html"));
		}
	},

	initEvent: function() {
		var that = this;

		this.$error.find(".JS-btn").on("click", function(){
			that.fetchData( that.projectId );
		});

		this.$el.find(".JS-index").on("click", function(event) {
			event.preventDefault();
			var router = global.modules.router;
			router.navigate("", {trigger: true});
		});

		this.initNameEvent();
		this.initIntroEvent();
		this.initChargeEvent();
		this.initMembersEvent();
		this.initBtnsEvent();
		this.initOtherEvent();
	},

	initNameEvent: function(){
		var that = this;
		this.listenTo( this.modules.name, "input", function(event){
			that.$btns.show();
		});
	},

	initIntroEvent: function(){
		var that = this;
		this.listenTo( this.modules.intro, "input", function(event){
			that.$btns.show();
		});
	},

	initChargeEvent: function(){
		var that = this;
		this.listenTo( this.modules.person_in_charge, "change", function(event){
			change(event.data)
		});

		function change(obj){
			$.ajax({
				url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/" + that.projectId,
				type:"PATCH",
				data:JSON.stringify({
					person_in_charge:obj.id
				}),

				success: function(data){
					if ( data.errcode === 0 ) {
						that.modules.person_in_charge.set(obj);
						that.model.set("person_in_charge", id);
					} else {
						point.shortShow({
							type:"error",
							text:global.tools.getErrmsg(data.errcode)
						});
					}
				},
				
				error:function(){
					point.shortShow({
						type:"error",
						text: "网络异常，请检查您的网络设置"
					});
				}
			});
		}
	},

	initMembersEvent: function(){
		var that = this;

		this.listenTo( this.modules.members, "add", function(event){
			add(event.data)
		});

		this.listenTo( this.modules.members, "remove", function(event){
			remove(event.data)
		});

		function add(obj){
			$.ajax({
				url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/" + that.projectId + "/members",
				type:"POST",
				data: JSON.stringify([obj.id]),
				success: function(data){
					if ( data.errcode === 0 ) {
						that.modules.members.unshiftData(obj);
						// that.model.set("members", that.modules.members.get());
						// that.model.trigger("change:members");
					} else {
						point.shortShow({
							type:"error",
							text:global.tools.getErrmsg(data.errcode)
						});
					}
				},
				error:function(){
					point.shortShow({
						type:"error",
						text: "网络异常，请检查您的网络设置"
					});
				}
			});
		}

		function remove( obj ) {
			$.ajax({
				url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/" + that.projectId + "/members/" + obj.id,
				type:"DELETE",
				success: function(data){

					if ( data.errcode === 0 ) {
						that.modules.members.removeData(obj);
						// that.model.set("members", that.modules.members.get());
						// that.model.trigger("change:members");
					} else {
						point.shortShow({
							type:"error",
							text:global.tools.getErrmsg(data.errcode)
						});
					}
				},

				error:function(){
					point.shortShow({
						type:"error",
						text: "网络异常，请检查您的网络设置"
					});
				}
			});
		}
	},

	initBtnsEvent: function(){
		var that = this;
		this.$ok = this.$btns.find(".JS-ok");
		this.$btns.find(".JS-cancel").on("click", function(){
			that.modules.name.set(that.model.get("name"));
			that.modules.intro.set(that.model.get("intro"));
			that.$btns.hide();
		});

		this.$ok.on("click", function(){
			var name = that.modules.name.get(),
				intro = that.modules.intro.get();
			name = name.trim();
			intro = intro.trim();

			if ( name === "" ) {
				point.shortShow({
					text:"请填写项目名称"
				});
				return false;
			}
	        //找到与当前项目名重复的项目
	        // var flag = global.data.projectList.find(function(model){
	        //     return model.get("name").trim() === name;
	        // });
	        // //如果找到了，就返回false
	        // if( flag ) {
	        //     point.shortShow({
	        //         text:"项目名不可重复"
	        //     });
	        //     return false
	        // }

	        if ( name.length > 50 ) {
	        	point.shortShow({
	        		type:"error",
	        		text:"项目名称不能超过50个字符"
	        	});
	        	return false;
	        }

	        if ( intro.length > 100 ) {
	        	point.shortShow({
	        		type:"error",
	        		text:"项目描述不能超过100个字符"
	        	});
	        	return false;
	        }


			change({
				name: name,
				intro: intro
			});
		});

		function change(obj){
			that.$ok.addClass("loading");
			$.ajax({
				url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/" + that.projectId,
				type:"PATCH",
				data:JSON.stringify(obj),
				success: function(data){
					if ( data.errcode === 0 ) {
						that.model.set(obj);
						that.$btns.hide();
					} else {
						point.shortShow({
							type:"error",
							text:global.tools.getErrmsg(data.errcode)
						});
					}
					that.$ok.removeClass("loading");
				},
				error:function(){
					point.shortShow({
						type:"error",
						text: "网络异常，请检查您的网络设置"
					});
					that.$ok.removeClass("loading");
				}
			});
		}
	},

	initOtherEvent: function(){
		var that = this;
		this.$projectClose.on("click", function(){
			confirm.show({
				text:"关闭项目后，该项目将被隐藏，目前隐藏的项目将不能重新开启，是否继续？",
				callback: handle
			});
		});

		function handle(){
			$.ajax({
				url:global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/" + that.model.get("id"),
				type:"PATCH",
				data: JSON.stringify({
					"is_closed": 1
				}),
				success: function(response){
					if ( response.errcode === 0 ) {
						that.model.set("is_closed", 1);
						var router = global.modules.router;
						router.navigate("", {trigger: true});
					} else {
						point.shortShow({
							type:"error",
							text:global.tools.getErrmsg(response.errcode)
						});
					}
				},
				error: function(){
					point.shortShow({
						type:"error",
						text:"网络异常，请检查您的网络设置"
					});
				}
			});
		}
	},

	fetchData: function(id){
		var that = this;

		if ( this.fetchDataing ) {
			return;
		}
		this.fetchDataing = true;
		this.projectId = id;

		this.$loading.show();
		this.$content.hide();
		this.$error.hide();

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+
				"/project/projects/" + id,
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				var model = new Backbone.Model(response.data);
				that.setModel(model);
				that.$content.show();
			} else {
				that.$error.show();
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(response.errcode)
				});
			}
		}

		function error(){
			that.$error.show();
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
			});
		}

		function complete(){
			that.fetchDataing = false;
			that.$loading.hide();
		}
	},

	set: function(id){
		var model = global.data.projectList && global.data.projectList.get(id);

		if ( model ) {
			this.setModel(model);
			return;
		}

		this.fetchData(id);
	},

	setModel: function(model){
		this.model = model;
		this.projectId = this.model.get("id");

		var obj = this.model.toJSON();

		this.modules.name.set(obj.name);
		this.modules.intro.set(obj.intro);
		this.modules.person_in_charge.set(obj.person_in_charge_info);
		this.modules.person_in_charge.setProjectId(obj.id);
		this.modules.members.set(obj.id);
	},

	clear: function(){
		$.each( this.modules, function( key, module ) {
			module.clear();
		});
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
		global.modules.projectDetail = null;
	}

});

module.exports = View;