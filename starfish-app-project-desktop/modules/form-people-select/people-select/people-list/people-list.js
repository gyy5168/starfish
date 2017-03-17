var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

	attributes:{
		"class": "people-list"
	},

	pageSize: 20,

	itemTemplate: __inline("item.tmpl"),

	initialize: function(option){
		this.data = {};
		this.option = option.option;
		this.parentView = option.parentView;
		this.selectedList = this.parentView.selectedList;
		this.projectId = this.option.projectId;

		this.render();
		this.initEvent();
		this.fetchData();
	},

	render: function(){
		this.$el.html(__inline("people-list.html"));
		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$list = this.$el.find("ul");
		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$moreError = this.$el.find(".JS-more-error");
		this.$noMore = this.$el.find(".JS-no-more");
	},

	initEvent: function(){
		var that = this;

		// 点击人员
		this.$el.on("click", ".JS-item", function(event){
			var id = $(this).data("id"),
				list = that.selectedList,
				model = list.get(id);

			if ( model ) {
				list.remove(model);
			} else {
				list.add(that.data[id]);
			}

			event.stopPropagation();
		});

		this.listenTo( this.selectedList, "add", function(model){
			var id = model.get("id");
			that.$el.find(".JS-item[data-id="+id+"]").addClass("selected");
		});

		this.listenTo( this.selectedList, "remove", function(model){
			var id = model.get("id");
			that.$el.find(".JS-item[data-id="+id+"]").removeClass("selected");
		});


		this.$el.on("scroll", function(event){
			if (that.noMore) {
				return;
			}

			var scrollTop = that.$el.scrollTop();
			// 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
			if ( scrollTop === 0 ) {
				return;
			}

			var height = that.$el.outerHeight();

			if (scrollTop + height == this.scrollHeight) {
				that.fetchMoreData();
			}
		});
	},

	fetchData: function(){
		var that = this;

		if ( this.fetchDataing ) {
			return;
		}

		this.fetchDataing = true;

		this.$error.hide();
		this.$loading.show();
		this.$list.hide();

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+
				"/project/projects/"+this.projectId+"/members?detail=1&page=1&count=" + this.pageSize,
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				that.page = 1;
				that.$list.show();
				that.addData(response.data);
				if ( response.data.length < that.pageSize ) {
					that.noMore = true;
					that.$moreLoading.hide();
				} else {
					that.noMore = false;
					that.$moreLoading.show();
				}
			} else {
				that.$error.show();
			}
		}

		function error(){
			that.$error.show();
		}

		function complete(){
			that.fetchDataing = false;
			that.$loading.hide();
		}
	},


	fetchMoreData: function(){
		var that = this;

		if ( this.fetchMoreDataing ) {
			return;
		}

		this.fetchMoreDataing = true;

		this.$moreError.hide();
		this.$moreLoading.show();

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+
				"/project/projects/"+this.projectId+"/members?detail=1&page="+
				(this.page + 1)+"&count=" + this.pageSize,
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				that.page++;
				that.addData(response.data);
				if ( response.data.length < that.pageSize ) {
					that.noMore = true;
					that.$moreLoading.hide();
					that.$noMore.show();
				} else {
					that.noMore = false;
					that.$moreLoading.show();
				}
			} else {
				that.$moreError.show();
			}
		}

		function error(){
			that.$moreError.show();
		}

		function complete(){
			that.fetchMoreDataing = false;
			that.$moreLoading.hide();
		}
	},


	addData: function(arr){
		var that = this;

		_.each( arr, function(obj){
			that.data[obj.id] = obj;
			obj.className = that.selectedList.get(obj.id) ? "selected" : "";
			that.$list.append(that.itemTemplate(obj));
		});
	},

	clear: function(){
		that.$list.html("");
		this.$list.show();
		this.$error.hide();
		this.$loading.hide();
		this.data = {};
	},

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = View;