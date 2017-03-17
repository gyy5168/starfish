var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	peopleTool = require("modules-common/tools/people.js"),
	dateTool = require("modules-common/tools/date.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "task-form-comment"
	},

	template: __inline("task-comment-item.tmpl"),

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("task-form-comment.html"));

		this.$inputWraper = this.$el.find(".JS-input-wraper");
		this.$input = this.$el.find(".JS-input");
		this.$comment = this.$el.find(".JS-comment");
		this.$list = this.$el.find(".JS-list");

		this.$loading = this.$el.find(".JS-loading");
		this.$el.append(this.$loading);

		this.$loadError = this.$el.find(".JS-error");
		this.$el.append(this.$loadError);
	},

	initEvent: function() {
		var that = this;

		this.$loadError.on("click", function() {
			that.loadData(that.modelId);
			that.$loadError.hide();
		});

		this.$comment.on("click", function() {
			if ( $(this).hasClass("disabled") ) {
				return;
			}
			that.comment();
		});

		this.$input.on("input", function() {
			if (that.$input.val().length === 0) {
				that.$comment.addClass("disabled");
			} else {
				that.$comment.removeClass("disabled");
			}
		});
	},

	comment: function() {
		var that = this;

		if ( this.commenting ) {
			return;
		}
		this.commenting = true;
		
		var content = this.$input.val().trim();
		if (content.length === 0) {
			return;
		}
		
		this.$comment.addClass("loading");
		$.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + this.modelId + "/comments",
			type: "POST",
			data: JSON.stringify({
				content: that.htmlspecialchars(content)
			}),
			success: function(response) {
				if (response.errcode === 0) {
					that.add(response.data, 0);
					that.$input.val("");
					that.$input.trigger("input");
				} else {
					point.shortShow({
						type:"error",
						text:global.tools.getErrmsg(response.errcode)
					});
				}
			},
			error: function() {
				point.shortShow({
					type:"error",
					text:"网络异常，请检查您的网络设置"
				});
			},
			complete: function() {
				that.$comment.removeClass("loading");
				that.commenting = false;
			}
		});
	},
    //防止注入攻击
	htmlspecialchars:function  (str) {
		var str = str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, '&quot;');
		return str;
	},
	loadData: function(taskId) {
		var that = this;

		if ( this.loadAjax ){
			this.loadAjax.abort();
		}

		this.modelId = taskId;
		
		this.$loading.show();
		this.$loadError.hide();
		this.$list.hide();
		this.$inputWraper.hide();

		this.loadAjax = $.ajax({
			url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + taskId + "/comments?start=0&ps=1000",
			type: "GET",
			success: function(response) {
				if (response.errcode === 0) {
					$.each(response.data, function(i, obj) {
						that.add(obj);
					});
					that.$list.show();
					that.$inputWraper.show();
				} else {
					that.$loadError.show();
					point.shortShow({
						type:"error",
						text:global.tools.getErrmsg(response.errcode)
					});
				}
			},
			error: function() {
				that.$loadError.show();
			},
			complete: function() {
				that.$loading.hide();
				that.loadAjax = null;
			}
		});
	},

	add: function(data, index) {

		data.avatar = data.creator_info.avatar;
		data.name = data.creator_info.name;
		data.time = dateTool.convertDate(data.date_added);
		var item = this.template(data);
		if (index != null) {
			var children = this.$list.children();
			var location = children[index];
			if (location) {
				$(location).before(item);
			} else {
				this.$list.append(item);
			}
		} else {
			this.$list.append(item);
		}
	},

	clear: function() {
		this.modelId = null;
		this.$input.val("");
		this.$input.trigger("input");
		this.$list.empty();
	},

	destroy: function() {
		this.remove();
	}
});

module.exports = View;