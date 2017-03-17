var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	dateTool = require("modules-common/tools/date.js");

require("modules-common/jquery-pickadate/picker.js");
require("modules-common/jquery-pickadate/picker.date.js");

$.extend($.fn.pickadate.defaults, {
	monthsFull: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
	monthsShort: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'],
	weekdaysFull: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
	weekdaysShort: ['日', '一', '二', '三', '四', '五', '六'],
	today: '今日',
	clear: '清除',
	close: '关闭',
	firstDay: 1,
	format: 'yyyy-mm-dd',
	formatSubmit: 'yyyy/mm/dd',
	labelMonthNext: '下一月',
	labelMonthPrev: '上一月',
	labelMonthSelect: '选择某一月',
	labelYearSelect: '选择某一年',
});

var View = Backbone.View.extend({

	tagName: "div",

	attributes: {
		"class": "task-form-date"
	},

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.append(__inline("task-form-date.html"));
		this.$date = this.$el.find(".JS-date");
		this.$picker = this.$el.find(".JS-picker");
		this.$edit = this.$el.find(".JS-icon");
	},

	initEvent: function() {
		var that = this;

		this.$picker.pickadate({
			selectYears: true,
			selectMonths: true
		});

		this.picker = this.$picker.pickadate("picker");

		this.picker.on({
			set: function() {
				that.changeDate();
			}
		});
	},

	changeDate: function() {
		var newDate = this.get();
		if (this.date !== newDate) {
			this.trigger("change", newDate);
		}
		this.date = newDate;
	},

	get: function() {
		var obj = this.picker.get("select");
		if (obj) {
			return obj.pick / 1000;
		} else {
			return 0;
		}
	},

	set: function(timestamp) {
		if (timestamp) {
			this.date = timestamp;
			this.picker.set("select", timestamp * 1000, {
				muted: true
			});
		} else {
			this.picker.set("clear", null, {
				muted: true
			});
		}
	},

	clear: function() {
		this.date = null;
		this.picker.set("clear", null, {
			muted: true
		});
	},

	destroy: function() {
		this.picker.stop();
		this.remove();
	}
});

module.exports = View;