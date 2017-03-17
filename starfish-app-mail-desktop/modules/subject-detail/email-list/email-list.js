var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	mailList = require("modules/collections/mail-list.js"),
	ItemView = require("./email-list-item/email-list-item.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	attributes: {
		class: "email-list"
	},

	initialize: function() {
		this.list = mailList;
		this.itemViews = [];

		this.render();
		this.initEvent();
		this.initScrollEvent();

		global.modules.mailList = this;
	},

	render: function(){
		this.$el.html(__inline("email-list.html"));
		this.$list = this.$el.find("ul");
		this.$replayWraper = this.$el.find(".JS-main-replay");
	},

	initEvent: function() {
		var that = this;

		this.listenTo(this.list, "add", this.addItem);
		this.listenTo( this.list, "remove", this.removeItem);
		this.listenTo( this.list, "reset", function(list, options){
			$.each(options.previousModels, function(index, model){
				that.removeItem(model);
			});
			that.list.each( function(model){
				that.addItem(model, list);
			});

			that.scrollFirstUnreadAndSetRead();
		});

		// 快捷回复、回复所有、转发
		this.$replayWraper.on("click", "span", function(){
			var $this = $( this ),
				action = $this.data("action");

			that.itemViews[that.itemViews.length - 1 ].trigger("reply", action);
		});

		// 点击空白处，隐藏邮件的信息面板
		this.docHandle = function(){
			_.each( that.itemViews, function(view){
				view.hidePanel();
			});
		}
		$(document).on("click.email-list", this.docHandle);
		
	},

	initScrollEvent: function(){
		var that = this;

		this.$el.on("scroll", function(){
			// 如果正在执行滚动动画，则返回。
			// 第一次进入邮件列表后，会定位到相应的邮件， 定位到相应邮件的过程是动画。
			if ( that.animating ) {
				return;
			}

			handle();
		});

		var handle = _.throttle(_.bind(this.setReadByView, this), 100);
	},

	// 滚动到第一个未读的邮件， 并设置已读
	scrollFirstUnreadAndSetRead: function(){
		var that = this,
			model = this.list.find(function(model){
				return model.get("is_read") === 0;
			});

		// 如果不存在未读邮件，则返回
		if ( !model ) {
			return;
		}

		// 滚动到第一个未读邮件，并将视图内的邮件设置已读
		this.scrollTo(model.get("id"), handle);
		function handle(){
			that.setReadByView();
		}
	},

	// 滚动到某个ID为id的邮件， 并在滚动结束后执行fn（如果传递fn的话）
	scrollTo: function(id, fn){
		var view = this.getItem(id),
			that = this;
		if ( !view ) {
			return;
		}

		var top = view.$el.offset().top - this.$el.offset().top;
		this.animating = true;
		this.$el.animate({scrollTop: top}, 400, function(){
			that.animating = false;
			fn && fn();
		});
	},

	// 根据是否在视野内，设置邮件已读
	setReadByView: function(){

		var that = this,
			preHeight = 25,   //当内容显示超过此高度， 该邮件才算在视野中
			viewTop = that.$el.offset().top,
			viewBottom = viewTop + that.$el.outerHeight() - preHeight,
			itemsInView = [],
			idsInView = [];

		// 获取在视野内，未读的邮件
		that.$list.find("li.unread").each( function(index){
			var $this = $( this ),
				itemTop = $this.offset().top,
				itemBottom = itemTop + $this.outerHeight();

			if ( itemTop <= viewBottom && itemBottom >= viewTop ) {
				itemsInView.push( $this );
				idsInView.push( $this.data("id") );
			}
		});

		// 如果在视野内，没有未读邮件， 则反悔
		if ( itemsInView.length === 0 ) {
			return;
		}

		// 标记要设置已读的邮件
		_.each( itemsInView, function($node){
			$node.removeClass("unread").addClass("setReading");
		});

		this.setRead(idsInView).success( function(response){
			if ( response.errcode === 0 ) {
				successHandle(itemsInView);
			} else {
				errorHandle(itemsInView);
			}
		}).error( function(){
			errorHandle(itemsInView);
		});

		// 成功后，取消正在设置的标志
		function successHandle(itemsInView){
			_.each( itemsInView, function($node){
				$node.removeClass("setReading");
			});
		}

		// 失败后，恢复邮件未读标识
		function errorHandle(){
			_.each( itemsInView, function($node){
				$node.removeClass("setReading").addClass("unread");
			});
		}
	},

	// 批量设置邮件已读
	setRead: function(arr){
		var that = this;

		return $.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+"/mail/mails/" + arr.join(","),
			type:"PATCH",
			data: JSON.stringify({
				is_read: 1
			}),

			success: function(response){
				if ( response.errcode === 0 ) {
					_.each( arr , function(id) {
						var model = that.list.get(id);
						if (model) {
							model.set("is_read", 1);
						}
					});
					
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
					text:"设置邮件已读失败, 请检查网络"
				});
			}
		});
	},

	// 添加列表项
	addItem: function(model, list, options) {
		var view = new ItemView({
			model: model
		});

		view.parentView = this;
		
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
		var view = _.find(this.itemViews, function(obj, index){
			return obj.model.get("id") === id;
		});

		return view;
	},
	
	// 邮件的表单是否全部为空
	isEmpty: function(){
		var flag = true;

		_.find( this.itemViews, function(view) {
			flag = view.isEmpty();

			if ( flag === false ) {
				return true;
			}
		});

		return flag;
	},

	clear: function(){
		this.list.reset([]);
	},

	destroy: function(){
		this.list.reset([]);
		this.remove();
		global.modules.mailList = null;
		$(document).off("click.email-list", this.docHandle);
	}
});

module.exports = View;