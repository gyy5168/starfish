var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	MailCreate = require("modules/mail-create/mail-create.js"),
	SubjectDetail = require("modules/subject-detail/subject-detail.js"),
	NoSelect = require("./no-select/no-select.js");

var View = Backbone.View.extend({

	attributes: {
		class: "mail-right-panel"
	},

	initialize: function(option) {
		this.render();
		this.initEvent();
	},

	render: function() {
		this.noSelect = new NoSelect();
		this.$el.append(this.noSelect.$el);
	},

	initEvent: function(){
		var that = this;

		this.listenTo( global.event, "showNoSelect", function(){
			that.noSelect.show();
		});

		this.listenTo( global.event, "hideNoSelect", function(){
			that.noSelect.hide();
		});

		this.listenTo( global.event, "showMailCreate", function(){
			// 如果没有邮件创建模块， 则初始化该模块
			if ( !that.mailCreate ) {
				that.mailCreate = new MailCreate();
				that.$el.append(that.mailCreate.$el);
			}
			that.mailCreate.show();
		});

		this.listenTo( global.event, "hideMailCreate", function(){
			if ( that.mailCreate ) {
				that.mailCreate.hide();
			}
		});

		this.listenTo(global.event, "showSubjectDetail", function(model){
			// 如果没有主题详情模块，则初始化化改模块
			if ( !that.subjectDetail ) {
				that.subjectDetail = new SubjectDetail();
				that.$el.append(that.subjectDetail.$el);
				
			}
			that.subjectDetail.set(model);
			that.subjectDetail.show();
		});

		this.listenTo( global.event, "hideSubjectDetail", function(){
			if ( that.subjectDetail ) {
				that.subjectDetail.hide();
			}
		});
	},

	destroy: function(){
		this.noSelect && this.noSelect.destroy();
		this.noSelect = null;
		this.mailCreate && this.mailCreate.destroy();
		this.mailCreate = null;
		this.subjectDetail && this.subjectDetail.destroy();
		this.subjectDetail = null;
		this.remove();
	}
});

module.exports = View;