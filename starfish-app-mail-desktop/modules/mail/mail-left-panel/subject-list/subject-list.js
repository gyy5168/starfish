var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	subjectList = require("modules/collections/subject-list.js"),
	ItemView = require("./subject-list-item/subject-list-item.js"),
	confirm = require("modules-common/confirm/confirm.js"),
	point = require("modules-common/point/point.js");

var ListView = Backbone.View.extend({

	firstPageSize: 30,//初次加载的主题数量

	pageSize: 20, //每次加载更多时， 加载的数量
	
	attributes: {
		class: "subject-list"
	},

	initialize: function() {
		this.list = subjectList;
		this.itemViews = [];
		this.render();
		this.initListEvent();
		this.initClickEvent();
		this.initGlobalEvent();
	},

	render: function() {
		this.$el.html(__inline("subject-list.html"));

		this.$empty = this.$el.find(".JS-empty");
		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$errorBtn = this.$error.find(".JS-btn");
		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$moreError = this.$el.find(".JS-more-error");
		this.$noMore = this.$el.find(".JS-no-more");
		this.$list = this.$el.find("ul");
	},

	initListEvent: function() {
		var that = this;

		this.listenTo(this.list, "add", this.addItem);

		this.listenTo( this.list, "remove", this.removeItem);

		this.listenTo(this.list, "reset", function(list, options) {
			$.each(options.previousModels, function(index,model){
				that.removeItem(model);
			});

			that.list.each(function(model) {
				that.addItem(model);
			});
		});

		this.listenTo(this.list, "add reset remove", function() {
			if (that.list.length === 0) {
				that.$empty.show();
			} else {
				that.$empty.hide();
			}
		});
	},

	initClickEvent: function(){
		var that = this;
		this.$errorBtn.on("click", function() {
			that.load();
		});

		this.$moreError.on("click", function() {
			that.loadMore();
		});

		// 滚动加载更多
		this.$el.on("scroll", function(event) {
			// 如果没有更多数据，则返回
			if (that.noMore) {
				return;
			}

			var height = that.$el.height();
			// 滚动到底部，则加载更过数据
			if (this.scrollTop + that.$el.height() + 20 >= this.scrollHeight) {
				that.loadMore();
			}
		});

		// 删除主题
		this.$list.on("click", ".JS-remove", function(event) {
			var id = $(this).parent().data("id"),
				view = that.getItem(id),
				model = view.model;

			confirm.show({
				text:"确定要删除?",
				callback: function(){
					that.removeSubject(model);
				}
			});
			
			event.stopPropagation();
		});

		// 点击主题
		this.$list.on("click", "li", function() {
			var id = $(this).data("id"),
				view = that.getItem(id),
				model = view.model;

			var model = that.getItem(id).model;

			global.event.trigger("hideNoSelect");
			global.event.trigger("hideMailCreate");
			global.event.trigger("showSubjectDetail", model);
			that.select(view);
		});
	},

	initGlobalEvent: function(){
		var that = this;

		// 邮件发送成功
		this.listenTo(global.event, "mailSended", function(data){

			// 如果是回复或者转发，不产生新的主题，只是将老的主题内容改变，位置提到前面
			if ( data.meta.action_type === 2 || data.meta.action_type === 4 ) {
				var view = that.getItem(data.subject_id),
					model = view.model;

				// 通过删除和添加，来完成位置变换，并完成主题内容的修改
				that.list.remove(model);
				that.list.unshift(data.subject);

				// 如果之前的主题是选中的，仍然选中
				var isSelected = view.isSelect();
				if ( isSelected ) {
					that.select( that.getItem(data.subject_id) );
				}
			} else {
				that.list.unshift(data.subject);
			}
		});

		// 显示邮件创建界面，取消列表的选择项
		this.listenTo(global.event, "showMailCreate", function(){
			if ( that.selected ) {
				that.selected.select(false);
			}
			that.selected = null;
		});

		this.listenTo(global.event, "subjectRemoved", function(model){
			that.list.remove(model);
		});

		this.listenTo( global.event, "subjectReaded", function(id) {
			that.list.get(id).set("is_read", 1);
		});
	},

	// 删除主题
	removeSubject: function(model) {
		var that = this;

		if ( this.removeSubjecting ) {
			return;
		}

		this.removeSubjecting = true;

		point.show({
			type:"loading",
			text:"正在删除..."
		});

		$.ajax({
			url: global.baseUrl + "/orgs/" + global.data.org.get("id") + "/mail/subjects/" + model.get("id"),
			type: "DELETE",
			success: success,
			error: error,
			complete: complete
		});

		function success(data) {
			if (data.errcode === 0) {
				point.hide();
				global.event.trigger("subjectRemoved", model);
			} else {
				point.shortShow({
					text: global.tools.getErrmsg(data.errcode),
					type: "error"
				});
			}
		}

		function error() {
			point.shortShow({
				text: "请检查网络",
				type: "error"
			});
		}

		function complete(){
			that.removeSubjecting = false;
		}
	},

	// 更换选择项
	select: function(view) {
		if (this.selected) {
			this.selected.select(false);
		}
		this.selected = view;
		this.selected.select(true);
	},

	// 加载主题列表
	load: function() {
		if (this.loading) {
			return;
		}

		this.loading = true;

		this.hideAll();
		this.$loading.show();

		var that = this,
			firstPageSize = that.firstPageSize || 50;

		$.ajax({
			url:global.baseUrl + "/orgs/" + global.data.org.get("id") + "/members/" + global.data.user.get("id") + "/mail/subjects" + "?ps=" + firstPageSize,
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(respone){

			if (respone.errcode === 0) {
				that.list.reset(respone.data);

				if (respone.data.length === firstPageSize) {
					that.$moreLoading.show();
					that.noMore = false;
				} else {
					that.noMore = true;
					that.$moreLoading.hide();
				}
				that.$list.show();
			} else {

				point.shortShow({
					text: global.tools.getErrmsg(respone.errcode),
					type: "error",
					time: 5000
				});

			}
		}

		function error(){
			that.$error.show();
		}

		function complete(){
			that.$loading.hide();
			that.loading = false;
		}
	},

	// 加载更多主题（滑动到底部时触发）
	loadMore: function() {
		if ( this.moreLoading ) {
			return;
		}

		this.moreLoading = true;

		var that = this,
			lastId = this.list.last().get("id");

		this.$moreLoading.show();
		this.$moreError.hide();

		var url = global.baseUrl + "/orgs/" + global.data.org.get("id") + "/members/" + 
			global.data.user.get("id") + "/mail/subjects" +
			"?seq=" + lastId + "&ps=" + that.pageSize;
		$.ajax({
			type: "GET",
			url: url,
			contentType: "application/json",
			success: success,
			error: error,
			complete: complete
		});

		function success(respone){
			if (respone.errcode === 0) {

				$.each(respone.data, function(index, obj) {
					that.list.add(obj);
				});

				if (respone.data.length === that.pageSize) {
					that.noMore = false;
					that.$moreLoading.show();
				} else {
					that.$moreLoading.hide();
					that.$noMore.show();
					that.noMore = true;
				}
			} else {
				that.$moreLoading.hide();
				that.$moreError.show();
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(respone.errcode)
				})
			}
		}

		function error(){
			that.$moreLoading.hide();
			that.$moreError.show();
		}

		function complete(){
			that.moreLoading = false;
		}
	},

	// 隐藏所有的视图
	hideAll: function(){
		this.$empty.hide();
		this.$loading.hide();
		this.$error.hide();
		this.$moreLoading.hide();
		this.$moreError.hide();
		this.$list.hide();
		this.$noMore.hide();
	},

	clear: function(){
		
	},

	// 添加列表项
	addItem: function(model, list, options) {
		var view = new ItemView({
			model: model
		});

		view.parentView = this;

		model.view = view;
		
		if ( options === undefined || options.at === undefined ) {
			this.$list.append(view.$el);
			this.itemViews.push( view );
			return;
		}

		if ( options.at === 0 ) {
			this.$list.prepend(view.$el);
			this.itemViews.unshift(view);
		} else {
			list.at(options.at - 1).view.$el.after(view.$el);
			this.itemViews.splice( options.at - 1, 0, view);
		}

	},

	// 删除列表项
	removeItem: function(model){
		var id = model.get("id"),
			index;
		var view = _.find(this.itemViews, function(obj, i){
			index = i;
			return obj.model.get("id") === id;
		});

		if ( view ) {
			this.itemViews.splice( index, 1 );
			view.destroy();
		}
	},

	// 获取列表项
	getItem: function(id){
		var view = _.find(this.itemViews, function(obj){
			return obj.model.get("id") === id;
		});

		return view;
	},

	destroy: function(){
		this.list.reset([]);
		this.remove();
	}
});

module.exports = ListView;