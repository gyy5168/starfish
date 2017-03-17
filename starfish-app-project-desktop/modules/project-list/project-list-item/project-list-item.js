var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js");

var View = Backbone.View.extend({

	tagName: "li",

	attributes: {
		"class": "project-item JS-project-item"
	},

	membersCount:8,

	membersPageSize: 15,

	template: __inline("project-list-item.tmpl"),

	memberTemplate: __inline("member.tmpl"),

	initialize: function(option) {
        this.model.view = this;
        this.membersCount = option.membersCount;
        this.render();
        this.initEvent();
        this.initChangeEvent();
    },

	render: function(){
		var modelData = this.model.toJSON(),
			memberStatistics = modelData.member_task_stats,
			templateData = {};

		// 项目名称

		templateData.name = modelData.name;

		// 项目成员排列样式, 当成员数目小于4个，成员居中显示
		templateData.layoutClass = modelData.members.length < 4 ? "center" : "";

		// 项目成员更多样式, 当成员数目大于8个，显示查看更多的箭头
		templateData.arrowClass = modelData.members.length >= 8 ? "show" : "hide";

		this.$el.html( this.template(templateData) );

		this.$el.attr("data-id", modelData.id);
		this.$el.data("view", this);
		this.renderMembers();
		this.$more = this.$el.find(".JS-more");
		this.$body = this.$el.find(".JS-bd");

		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$moreError = this.$el.find(".JS-more-error");
		this.$noMore = this.$el.find(".JS-no-more");
	},

	// 渲染项目成员
	renderMembers: function(){
		var that = this,
			modelData = this.model.toJSON(),
			memberStatistics = modelData.member_task_stats,
			data = modelData.members_info.slice();
		this.$membersList = this.$el.find(".JS-members");
		this.$membersWraper = this.$el.find(".JS-members-wraper");

		$.each(data, function(index, peopleData){
			peopleData.uncompleted = memberStatistics[peopleData.id] && memberStatistics[peopleData.id].uncompleted || 0;
		});

		this.addMembers( data );
	},

	initEvent: function() {
		var that = this;

		this.$more.on("click", function(event){

			if ( that.$el.hasClass("more") ) {
				that.$el.removeClass("more");
				that.$membersWraper.scrollTop(0);
				event.stopPropagation();
				return;
			}

			that.$el.addClass("more");
			if ( !that.memberPage ) {
				that.fetchMoreMember();
			}
			
			event.stopPropagation();
		});

		this.$moreError.on("click", function(event){
			that.fetchMoreMember();
			event.stopPropagation();
		});

		this.$membersWraper.on("scroll", function(event){
			if (that.noMoreMember) {
				return;
			}

			var scrollTop = that.$membersWraper.scrollTop();
			// 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
			if ( scrollTop === 0 ) {
				return;
			}

			var height = that.$membersWraper.outerHeight();

			if (scrollTop + height == this.scrollHeight) {
				that.fetchMoreMember();
			}
		});

		this.$el.on("mouseleave", function(){
			that.$el.removeClass("more");
			that.$membersWraper.scrollTop(0);
		});
	},

	initChangeEvent: function(){
		var that = this;
		this.listenTo( this.model, "change", function(){
			that.render();
			// 重新渲染后， 需要再次绑定dom事件
			that.initEvent();
		});
	},

	addMembers: function(arr){
		var that = this;

		$.each(arr, function(index, peopleData){
			peopleData.uncompleted = peopleData.uncompleted || 0;
			// 显示的title
			peopleData.title = "<div style='text-align: center;'>"+peopleData.name+
				"</div><div style='text-align: center;font-size:11px;line-height:17px;color:#babfca;'>未完成任务"+
				peopleData.uncompleted+"个</div>";

			// 当有未完成的任务时，显示数字
			peopleData.countClass = peopleData.uncompleted > 0 ? "show" : "hide";

			that.$membersList.append( that.memberTemplate(peopleData));
		});
	},

	fetchMoreMember: function(){
		var that = this;
		if ( this.fetchMoreMembering ) {
			return false;
		}
		this.fetchMoreMembering = true;

		this.$moreLoading.show();
		this.$moreError.hide();
		this.$noMore.hide();

		if ( !this.memberPage ) {
			this.memberPage = 0;
		}

		return this.ajaxObj = $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/"+
				this.model.get("id")+"/members?detail=1&count=" + this.membersPageSize + 
				"&page=" + (this.memberPage + 1),
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				that.memberPage++;
				var data = response.data;
				if ( data.length <  that.membersPageSize ) {
					that.$moreLoading.hide();
					that.noMoreMember = true;
				}

				if ( that.memberPage === 1 ) {
					data = data.slice(that.membersCount)
				}
				that.addMembers( data );
			} else {
				that.$moreLoading.hide();
				that.$moreError.show();
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(response.errcode)
				});
			}
		}

		function error(){
			that.$moreLoading.hide();
			that.$moreError.show();
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
			});
		}

		function complete(){
			that.ajaxObj = null;
			that.fetchMoreMembering = false;
		}
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}
});

module.exports = View;