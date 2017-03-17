var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
	tagName: "li",

	template: __inline("item.tmpl"),

	attributes: {
		class: "item"
	},

	initialize: function() {
		this.render();
		this.initEvent();

		this.changeShortcut();
	},

	render: function() {
		var obj = this.model.toJSON();
		this.$el.append( this.template(obj));
		this.$shortcut = this.$el.find(".JS-shortcut");

		this.$shortcut.tooltipster();
		this.$el.attr("data-id", obj.id);
		this.$el.data("view", this);

	},

	initEvent: function() {
		var that = this;
		this.$el.on("click", function(){
			var id = that.model.get("id");
			window.starfish.openApp( id);
		});

		this.$shortcut.on("click", function(event){
			that.toggleNav();
			event.stopPropagation();
		});

		this.listenTo( this.model, "change:inNav", this.changeShortcut);
	},

	changeShortcut: function(){
		var value = this.model.get("inNav");
		if (value) {
			this.$shortcut.tooltipster("content", "取消在左侧导航上显示");
			this.$shortcut.addClass("selected");
		} else {
			this.$shortcut.tooltipster("content", "在左侧导航上显示");
			this.$shortcut.removeClass("selected");
		}
	},

	// 添加或取消导航
	toggleNav: function(){
		var that = this;
		if ( this.toggleNaving ) {
			return;
		}

		var inNav = this.model.get("inNav"),
			handleValue = inNav ? 0 : 1;

		this.toggleNaving = true;

		$.ajax({
			url: global.data.org.get("domain")  + "/orgs/"+global.data.org.get("id")+"/members/"+global.data.user.get("id")+"/apps",
			type:"POST",
			data: JSON.stringify({
				app: this.model.get("id"),
				navi: handleValue
			}),

			success: function(response){
				if ( response.errcode === 0 ) {
					point.shortShow({
						type:"success",
						text: "操作成功"
					});
					that.model.set("inNav", handleValue);
				} else {
					point.shortShow({
						type:"error",
						text: "操作失败， 错误码 :" + response.errcode 
					});
				}
			},

			error: function(){
				point.shortShow({
					type:"error",
					text: "操作失败， 请检查网路"
				});
			},

			complete: function(){
				that.toggleNaving = false;
			}
		})
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}

});

module.exports = View;