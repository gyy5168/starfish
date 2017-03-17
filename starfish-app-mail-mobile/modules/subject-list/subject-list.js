var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/zepto/zepto.js"),
	_ = require("modules-common/underscore/underscore.js"),
    point = require("modules-common/point/point.js"),
	topBar = require("modules-common/top-bar/top-bar.js"),
	router = require("modules-common/router/router.js"),
	CreateForm = require("modules/create-form/create-form.js"),
	ItemView = require("./item/item.js");

var View = Backbone.View.extend({

	attributes: {
		"class":"subject-list"
	},

	pageSize: 30,

	back: function(){
		global.starfishBridge("finish");
	},

	initialize: function(){
		this.list = new Backbone.Collection();
		this.itemViews = [];
		this.render();
        this.initGlobalEvent();
        this.initClickEvent();
		this.initListEvent();
		this.initScrollEvent();
		this.initErrorEvent();

		this.load();
	},

	render: function(){
		this.$el.html(__inline("subject-list.html"));
		this.$list = this.$el.find("ul");
		this.$empty = this.$el.find(".JS-empty");
		this.$error = this.$el.find(".JS-error");
		this.$loading = this.$el.find(".JS-loading");
		this.$moreError = this.$el.find(".JS-more-error");
		this.$moreLoading = this.$el.find(".JS-more-loading");
		this.$noMore = this.$el.find(".JS-no-more");

		global.$doc.append( this.$el );
	},

    initGlobalEvent:function(){
        var that=this;

        this.listenTo( global.event, "subjectRead", function(id) {
			that.list.get(id).set("is_read", 1);
		});

        this.listenTo(global.event, "mailSended", function(data){

			// 如果是回复或者转发，不产生新的主题，只是将老的主题内容改变，位置提到前面
			if ( data.meta.action_type === 2 || data.meta.action_type === 4 ) {
				var view = that.getItem(data.subject_id);

				if ( !view ) {
					return;
				}
				var model = view.model;

				// 通过删除和添加，来完成位置变换，并完成主题内容的修改
				that.list.remove(model);
				that.list.unshift(data.subject);

			} else {
				that.list.unshift(data.subject);
			}
		});

		this.listenTo(global.event, "subjectRemoved", function(id){
			that.list.remove(id);
		});

    },

    initClickEvent:function(){
        var that=this
        this.$el.on("click",'li',function(){
            var id=$(this).data("id"),
                item=that.getItem(id),
                data=item.model.toJSON(),
				id=data.subject_id;

			router.navigate("mailList/"+id,{trigger:true})
        })
    },

	initListEvent: function(){
		var that = this;
		this.listenTo(this.list, "add", this.addItem);
		this.listenTo(this.list, "remove", this.removeItem);

		this.listenTo(this.list, "reset", function(models, options) {
			_.each(options.previousModels, function(model) {
				that.removeItem(model);
			});

			that.list.each(function(model) {
				that.addItem(model);
			});
		});

		this.listenTo(this.list, "add reset remove destroy", function(){
			if ( that.list.length === 0 ) {
				that.$empty.show();
				that.$list.hide();
			} else {
				that.$list.show();
				that.$empty.hide();
			}
		});
	},

	initScrollEvent: function(){
		var that = this;
		var moreHeight;
		this.$list.on("scroll", function(event) {

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

	initErrorEvent: function(){
		var that = this;
		this.$error.on("click", function(){
			that.load();
		});

		this.$moreError.on("click", function(){
			that.loadMore();
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
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+
				"/members/"+global.data.user.get("id")+"/mail/subjects?ps=" + this.pageSize,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					that.showList();
					that.list.reset(response.data);

					if ( response.data.length < that.pageSize ) {
						that.noMore = true;
						that.$moreLoading.hide();
					} else {
						that.noMore = false;
						that.$moreLoading.show();
					}

				} else {
					that.showError();
					point.shortShow({
						type:"error",
						text: global.getErrmsg(response.errcode)
					});
				}
			},

			error: function(){
				that.$moreLoading.hide();
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
		var lastId = this.list.last().get("id");

		return $.ajax({
			url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+
				"/members/"+global.data.user.get("id")+"/mail/subjects?seq="+lastId+"&ps=" + this.pageSize,
			type: "GET",
			success: function( response ) {
				if ( response.errcode === 0 ) {

					that.list.set(response.data, {
						remove: false
					});

					if ( response.data.length < that.pageSize ) {
						that.noMore = true;
						that.$moreLoading.hide();
						that.$noMore.show();
					} else {
						that.noMore = false;
						that.$moreLoading.show();
					}
				} else {
					that.$moreLoading.hide();
					that.$moreError.show();
				}
			},

			error: function(){
				that.$moreLoading.hide();
				that.$moreError.show();
				point.shortShow({
					type:"error",
					text:"请检查网络"
				});
			},

			complete: function(){
				that.loadMoring = false;
			}
		});
	},

	// 根据ID获取列表项
	getItem: function(id){
		var view = _.find( this.itemViews, function( view ) {
			return id === view.model.get("id");
		});

		return view;
	},

	// 添加列表项
	addItem: function(model, collection, options) {
		var view = new ItemView({
			model: model
		});

		options = options || {};

		if ( options.at !== undefined ) {
			if ( options.at === 0 ) {
				this.$list.prepend(view.$el);
				this.itemViews.unshift(view);
			} else {
				var id = collection.at(options.at - 1).get("id"),
					itemview = this.getItem(id);
				itemview.$el.after(view.$el);
				this.itemViews.splice( options.at, 0, view );
			}
		} else {
			this.$moreLoading.before(view.$el);
			this.itemViews.push(view);
		}
	},

	// 删除列表项
	removeItem: function(model){
		var view = this.getItem(model.get("id")),
			that = this;

		if ( !view ) {
			return;
		}
		view.destroy();

		_.find( this.itemViews, function(itemView, index){
			if ( itemView === view ) {
				that.itemViews.splice(index, 1);
				return true;
			}
		});
	},

	showList: function(){
		this.$list.show();
		this.$error.hide();
		this.$loading.hide();
		this.$empty.hide();
	},

	showLoading: function(){
		this.$list.hide();
		this.$error.hide();
		this.$loading.show();
		this.$empty.hide();
	},

	showError: function(){
		this.$list.hide();
		this.$error.show();
		this.$loading.hide();
		this.$empty.hide();
	},

	showEmpty: function(){
		this.$list.hide();
		this.$error.hide();
		this.$loading.hide();
		this.$empty.show();
	},

	show: function(){
		this.$el.show();

		topBar.setTitle("邮件");
		topBar.setBack(_.bind(this.back, this));
		topBar.setMenu([{
			name:"写邮件",
			callback: function(){
				var createForm = new CreateForm();
				createForm.set("new");
			}
		}]);
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
});



module.exports = View;