var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js");
var point = require("modules-common/point/point.js");

var ListView = Backbone.View.extend({
	tagName: "ul",
	initialize: function() {
		this.render();
		this.initEvent();
	},

	showEmpty: function() {
		this.$empty.show();
	},

	hideEmpty: function() {
		this.$empty.hide();
	},

	showLoading: function() {
		this.$loading.show();
	},

	hideLoading: function() {
		this.$loading.hide();
	},

	showMoreLoading: function() {
		this.$moreLoading.show();
	},

	hideMoreLoading: function() {
		this.$moreLoading.hide();
	},

	showError: function() {
		this.$error.show();
	},

	hideError: function() {
		this.$error.hide();
	},

	showMoreError: function() {
		this.moreError = true;
		this.$moreError.show();
	},

	hideMoreError: function() {
		this.moreError = false;
		this.$moreError.hide();
	},

	render: function() {
		this.$empty = this.$el.find(".JS-empty");
		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$moreError = this.$el.find(".JS-more-error");
	},

	initEvent: function() {
		var that = this;

		this.listenTo(this.list, "add", this.add);

		this.listenTo(this.list, "add reset remove", function() {

			if (that.list.length === 0) {
				that.showEmpty();
				that.trigger("emptyList");
			} else {
				that.hideEmpty();
			}

		});

		this.$error.on("click", function() {
			that.load();
		});

		this.$moreError.on("click", function() {

			that.hideMoreError();
			that.showMoreLoading();
			that.fetchMore();

		});

		var height, moreHeight;

		this.$el.on("scroll", function(event) {

			var target = event.target,
				scrollTop = target.scrollTop,
				scrollHeight = target.scrollHeight;

			if (that.noMore || scrollTop === 0) {
				return;
			}

			height = height || that.$el.height();
			moreHeight = moreHeight || that.$moreLoading.height();

			if (scrollTop + height + moreHeight >= scrollHeight) {
				that.fetchMore && that.fetchMore();
			}
		});
	},

	load: function() {
		if (this.loaded || this.loading) {
			return;
		}

		this.loading = true;
		this.showLoading();
		this.hideError();

		var that = this,
			firstPageSize = that.firstPageSize || 50;

		function success(list, data){
			if (data.errcode === 0) {

				if (that.list.length === firstPageSize) {
					that.showMoreLoading();
				} else {
					that.noMore = true;
					that.hideMoreLoading();
				}

				if (that.list.length === 0) {
					that.showEmpty();
				}

				that.trigger("loaded");

			} else {

				point.shortShow({
					text: data.errmsg,
					type: "error",
					time: 5000
				});

			}

			that.loaded = true;
		}

		function error(){
			that.showError();
		}

		function complete(){
			that.hideLoading();
			that.loading = false;
		}
		
		
		this.list.fetch({
			success: success,
			error: error,
			complete: complete,
			url: this.url + "?ps=" + firstPageSize
		});
	},

	fetchMore: function() {
		if (this.moreError || this.noMore || this.fetching) {
			return;
		}

		this.fetching = true;
		this.showMoreLoading();

		var that = this,
			lastId = this.list.last().get("id"),
			pageSize = this.pageSize || 20;

		function success(data){
			if (data.errcode === 0) {
				if (data.data.length < pageSize) {
					that.noMore = true;
				}

				$.each(data.data, function(index, obj) {
					that.list.add(obj);
				});
			}
		}

		function error(){
			that.showMoreError();
		}

		function complete(){
			that.hideMoreLoading();
			that.fetching = false;
		}

		$.ajax({
			type: "GET",
			url: this.url + "?start=" + lastId + "&ps=" + pageSize,
			contentType: "application/json",
			success: success,
			error: error,
			complete: complete
		});
	},

	add: function(model, list, options) {
		var view = new this.ItemView({
			model: model
		});

		view.parentView = this;

		model.view = view;

		// var view = new this.ItemView({
		// 	model: model
		// });

		// view.parentView = this;
		
		if ( options === undefined || options.at === undefined ) {
			// this.$el.append(view.$el);
			this.$moreLoading.before(view.$el);
			return;
		}

		if ( options.at === 0 ) {
			this.$el.prepend(view.$el);
		} else {
			list.at(options.at - 1).view.$el.after(view.$el);
		}

		// if (option.at !== undefined) {
		// 	var locationModel = this.list.at(option.at + 1);
		// 	if (locationModel && locationModel.view) {
		// 		locationModel.view.$el.before(view.$el);
		// 	} else {
		// 		this.$moreLoading.before(view.$el);
		// 	}
		// } else {
		// 	this.$moreLoading.before(view.$el);
		// }
	}

});

module.exports = ListView;