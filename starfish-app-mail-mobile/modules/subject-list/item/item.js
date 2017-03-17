var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	point = require("modules-common/point/point.js"),
	tools = require("modules/tools/tools.js");

var View = Backbone.View.extend({

	attributes: {
		class: "subject-list-item"
	},

	tagName:"li",

	template: __inline("item.tmpl"),

	initialize: function(){
		this.render();
		this.initEvent();
	},

	render: function(){
		var data = this.model.toJSON(),
			obj = {};

		obj.name = data.from_detail.value.name;

		var content = data.content;

		// 去掉原始邮件的内容
		var originIndex = content.indexOf("---------- 原始邮件");
		if ( originIndex >= 0 ) {
			content = content.substring( 0, originIndex);
		}

		// 去掉html标签
		content = content.replace(/<[^>]+>/g,"");
		// 去掉前后空格
		content = content.replace(/(^\s*)|(\s*$)/g, "");

		// 如果内容为空
		if ( content === "" ) {
			// 如果附件为空
			if( data.attachments.length ) {
				content = "[附件]"
			} else {
				content = "空内容"
			}
		}
		
		// 内容显示为 “名字 ：内容”
		obj.content = data.meta.from_detail.value.name + " : " + content;

		obj.subject = data.subject;
		obj.time = tools.convertDate(data.date);
		obj.readClass = data.is_read ? "" : "show";
		obj.attachmentsClass = data.subject_attachments ? "show" : "";

		this.$el.html(this.template(obj));

		this.$el.attr("data-id", data.id);
	},

	initEvent: function(){
		this.listenTo(this.model, "change", this.render);
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = View;