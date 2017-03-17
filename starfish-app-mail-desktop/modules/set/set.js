var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	DomainSet = require("./set-domain/set-domain.js"),
	PeopleMail = require("./set-people-mail/set-people-mail.js"),
	DepartmentMail = require("./set-department-mail/set-department-mail.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		"class": "set-page"
	},

	initialize: function() {
		global.data.domainList = global.data.domainList || new Backbone.Collection();
		this.render();
		this.initEvent();
		this.load();
	},

	render: function() {
		this.$el.html(__inline("set.html"));

		this.$content = this.$el.find(".JS-content");
		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$errorBtn = this.$error.find(".JS-btn");

		this.$index = this.$el.find(".JS-index");
		this.$subNav = this.$el.find(".JS-sub-nav");
		this.$subMain = this.$el.find(".JS-sub-main");

		global.$doc.append(this.$el);
	},

	initEvent: function(){
		var that = this,
			moduleMap = {
				domain:DomainSet,
				people:PeopleMail,
				department: DepartmentMail
			};

		this.modules = {};

		// 回到邮件首页
		this.$index.on("click", function(){
			router.navigate("", {trigger: true});
		});

		this.$subNav.on("click", "li", function(){
			var $this = $( this ),
				name = $this.data("name");

			if( that.selected === name ) {
				return;
			}

			if ( that.selected ) {
				that.$subNav.find("li[data-name="+that.selected+"]").removeClass("selected");
				that.modules[that.selected].hide();
			}

			that.$subNav.find("li[data-name="+name+"]").addClass("selected");

			if ( !that.modules[name] ) {
				that.modules[name] = new moduleMap[name]();
				that.$subMain.append( that.modules[name].$el );
			}

			that.modules[name].show();

			that.selected = name;
		});
	},

	load: function(){
		var that = this;

		this.$error.hide();
		this.$content.hide();
		this.$loading.show();

		return $.ajax({
			url:global.baseUrl + "/orgs/"+global.data.org.get("id")+"/domains",
			type:"GET",
			success: function(respone){
				if ( respone.errcode === 0 ) {
					global.data.domainList.reset(respone.data);
					that.$content.show();
					that.$subNav.find("li:eq(0)").trigger("click");
				} else {
					point.shortShow({
						type:"error",
						text:global.tools.getErrmsg(respone.errcode)
					});
					that.$error.show();
				}
			},

			error: function(respone){
				point.shortShow({
					type:"error",
					text:"域名列表加载失败，请检查网络" 
				});
				that.$error.show();
			},

			complete: function(){
				that.$loading.hide();
			}
		});
	},

	initOtherPage: function(){
		if ( this.otherPageInited ) {
			return;
		}
	
		this.people = new SetMail({
			list: global.data.peopleList,
			http: global.baseUrl + "/orgs/"+global.data.org.get("id")+"/members/"
		});
		this.$items.find(".JS-set-item[data-id=people]").append( this.people.$el );

		this.group = new SetMail({
			list: global.data.groupList,
			http: global.baseUrl + "/orgs/"+global.data.org.get("id")+"/discussion_groups/"
		});
		this.$items.find(".JS-set-item[data-id=group]").append( this.group.$el );

		this.department = new SetMail({
			list: global.data.departmentList,
			http: global.baseUrl + "/orgs/"+global.data.org.get("id")+"/departments/"
		});
		this.$items.find(".JS-set-item[data-id=department]").append( this.department.$el );

		this.otherPageInited = true;
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		this.subMianView && this.subMianView.destroy();
		this.subMianView = null;

		this.remove();
	}
});

module.exports = View;