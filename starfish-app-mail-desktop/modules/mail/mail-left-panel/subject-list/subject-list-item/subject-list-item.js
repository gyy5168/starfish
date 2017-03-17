var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	dateTools = require("modules-common/tools/date.js"),
	tools = require("modules/tools/tools.js");

var ItemView = Backbone.View.extend({
	tagName: "li",

	template: __inline("subject-list-item.tmpl"),

	initialize: function(option) {
		this.render();
		this.initEvent();
	},

	render: function() {
		var data = this.model.toJSON(),
			obj = {};

		obj.name = data.from_detail.value.name;

		var content = data.content;

		// 反转义，并将标签去掉
		content = global.tools.decodeHtml(content);
		// console.log(content)
		// 去掉原始邮件的内容
		var originIndex = content.indexOf("<div class=\"JS-orgin\">");
		// if ( data.id === 213 ) {
		// 	console.log( data.content)
		// 	console.log(originIndex);
		// }
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
		obj.time = dateTools.convertDate(data.date);
		obj.readClass = data.is_read ? "" : "show";
		obj.attachmentsClass = data.subject_attachments ? "show" : "";

		this.$el.html(this.template(obj));

		this.$el.attr("data-id", data.id);
	},

	initEvent: function() {
		var that = this;
		this.listenTo(this.model, "change", this.render);
	},

	// 选中列表项
	select: function(flag){
		if ( flag ) {
			this.$el.addClass("selected");
		} else {
			this.$el.removeClass("selected");
		}
	},

	// 是否选中
	isSelect: function(){
		return this.$el.hasClass("selected");
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	},

	attributes: {
		class: "subject-list-item"
	}
});

module.exports = ItemView;