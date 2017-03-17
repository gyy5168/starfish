var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js");

var List = Backbone.Collection.extend({
	modelId: function( attrs ) {
		return attrs.type +""+ attrs.id;
	}
});

var View = Backbone.View.extend({

	attributes: {
		"class": "form-select-group"
	},

	pageSize: 30,

	template: __inline("group.tmpl"),

	initialize: function(option) {
		this.selectedList = option.selectedList;
		this.list = new List();
		this.render();
		this.initEvent();
		this.initScrollEvent();
		this.load();
	},

	render: function() {
		this.$el.html(__inline("group.html"));

		this.$list = this.$el.find("ul");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");
		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$moreError = this.$el.find(".JS-more-error");
		this.$noMore = this.$el.find(".JS-no-more");
	},

	initEvent: function() {
		var that = this;

		this.listenTo( this.list, "reset", function(option){
			that.$list.find(".JS-item").remove();

			that.list.each(function(model){
				that.addItem(model);
			});
		});

		this.listenTo( this.selectedList, "add", function(model){
			var id = that.selectedList.modelId(model.toJSON());
			that.$el.find("li[data-id="+id+"]").addClass("selected");
		});

		this.listenTo( this.selectedList, "remove", function(model){
			var id = that.selectedList.modelId(model.toJSON());
			that.$el.find("li[data-id="+id+"]").removeClass("selected");
		});

		this.$el.on("click", "li", function(){
			var $this = $(this),
				id = $this.data("id"),
				isSelected = that.selectedList.get(id);
			if ( isSelected ) {
				that.selectedList.remove(id);
				return;
			}

			if ( $this.hasClass("loading") ) {
				return;
			}
			$this.addClass("loading");

			var model = that.list.get(id);

			$.ajax({
				url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
					"/discussion_groups/"+model.get("id")+"/members?detail=2&page=1&count=100",
				type:"GET",
				success: function(response){
					if ( response.errcode === 0 ) {
						var obj = model.toJSON();
						obj.members = response.data;
						that.selectedList.add(obj);
					} else {
						point.shortShow({
							type:"error",
							text:global.tools.getErrmsg(response.errcode)
						});
					}
					$this.removeClass("loading");
				},
				error: function(){
					point.shortShow({
						type:"error",
						text:"请检查网络"
					});
					$this.removeClass("loading");
				}
			});
		});

		this.listenTo(this.list, "add", this.addItem);

		this.$error.on("click", function(){
			that.load();
		});

		this.$moreError.on("click", function(){
			that.loadMore();
		});
	},

	initScrollEvent: function(){
		var that = this;
		var moreHeight;
		this.$list.on("scroll", function(){
			if (that.noMore) {
				return;
			}

			// 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
			if ( that.$list.scrollTop() === 0 ) {
				return;
			}

			var height = that.$list.height();
			moreHeight = moreHeight || that.$moreLoading.height();


			if (this.scrollTop + that.$list.height() + moreHeight >= this.scrollHeight) {
				that.loadMore();
			}
		});
	},

	load: function(){
		var that = this;
		if ( this.loading ) {
			return;
		}
		this.loading = true;

		this.showLoading();

		return $.ajax({
			url:global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/members/"+global.data.user.get("id")+
				"/discussion_groups?normal=1&page=1&count=" + that.pageSize,
			type:"GET",
			dataFilter: function(response){
				response = JSON.parse(response);
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				_.each( response.data, function(data){
					data.type = "group";
				});
				response = JSON.stringify(response);
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				return response;
			},

			success: function(response){
				if ( response.errcode === 0 ) {
					that.list.reset(response.data);
					that.showContent();

					if ( response.data.length < that.pageSize ) {
						that.$moreLoading.hide();
						that.noMore = true;
					} else {
						that.$moreLoading.show();
						that.noMore = false;
					}

				} else {
					point.shortShow({
						type:"error",
						text: global.tools.getErrmsg(response.errcode)
					});
					that.showError();
				}
			},

			error: function(){
				that.showError();

				point.shortShow({
					type:"error",
					text:"请检查网络"
				});
			},

			complete: function(){
				that.loading = false;
			}
		});
	},

	loadMore: function(){
		var that = this;

		if ( this.loadMoring ) {
			return;
		}
		this.loadMoring = true;
		this.$moreLoading.show();
		this.$moreError.hide();

		this.page = this.page || 1;

		return $.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/members/"+global.data.user.get("id")+
				"/discussion_groups?normal=1&page="+(this.page + 1)+"&count=" + that.pageSize,
			type:"GET",
			dataFilter: function(response){
				response = JSON.parse(response);
				if ( response.errcode !== 0 ) {
					return JSON.stringify(response);
				}

				_.each( response.data, function(data){
					data.type = "group";
				});
				response = JSON.stringify(response);
				response = response.replace("<", "&lt;");
				response = response.replace(">", "&gt;");
				return response;
			},
			success: function(response){
				if ( response.errcode === 0 ) {
					that.page++;

					that.list.set( response.data , {
						remove: false
					});
					if ( response.data.length < that.pageSize ) {
						that.$moreLoading.hide();
						that.$noMore.show();
						that.noMore = true;
					} else {
						that.$moreLoading.show();
						that.noMore = false;
					}
				} else {
					point.shortShow({
						type:"error",
						text: global.tools.getErrmsg( response.errcode )
					});
					that.$moreLoading.hide();
					that.$moreError.show();
				}
			},

			error: function(jqXHR, status){
				point.shortShow({
					type:"error",
					text:"请检查网络"
				});
				// 使scroll失效
				that.noMore = true;
				that.$moreError.show();
				that.$moreLoading.hide();
			},

			complete: function(){
				that.loadMoring = false;
			}
		});
	},

	addItem: function(model){
		var obj = model.toJSON();
		obj.uuid = this.selectedList.modelId(obj);
		this.$moreLoading.before( this.template(obj) );
	},

	showLoading: function(){
		this.$loading.show();
		this.$error.hide();
		this.$list.hide();
	},

	showError: function(){
		this.$loading.hide();
		this.$error.show();
		this.$list.hide();
	},

	showContent: function(){
		this.$loading.hide();
		this.$error.hide();
		this.$list.show();
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
	
});

module.exports = View;