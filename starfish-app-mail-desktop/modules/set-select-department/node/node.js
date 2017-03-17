var $ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Backbone = require("modules-common/backbone/backbone.js");

var View = Backbone.View.extend({

	attributes: {
		"class": "set-select-node"
	},

	template: __inline("node.tmpl"),

	pageSize: 30,

	initialize: function(option) {
		this.parentView = option.parentView;
		this.render();
		this.initEvent();
	},

	render: function() {
		var obj = this.model.toJSON();

		this.$el.data( "id", obj.id );
		this.$el.html( this.template(obj) );
		this.$list = this.$el.find("ul");
		this.$hd = this.$el.find(".JS-group-hd");

        this.$error=this.$el.find(".JS-error")
        this.$loadMore=this.$el.find(".JS-load-more")
		this.$moreError=this.$el.find(".JS-more-error")
		this.$loading=this.$el.find(".JS-loading")

	},

	initEvent: function() {
		var that = this;

		this.$hd.on("click", function(){
			if ( that.parentView.$selected ) {
				that.parentView.$selected.removeClass("selected");
			}
			that.$el.addClass("selected");
			that.parentView.$selected = that.$el;
			
			that.parentView.trigger("select", that.model);

			if ( that.model.get("children_count") === 0 ) {
				return;
			}

			if ( that.$el.hasClass("open")) {
				that.$el.removeClass("open");
				return;
			}

			if ( that.page ) {
				that.$el.addClass("open");
				return;
			}

			that.load().success(function(response){
				if ( response.errcode === 0 ) {
					that.$el.addClass("open");
				}
			});
		});

		this.$loadMore.on("click",function(){
			that.loadMore();
		})

        this.$moreError.on("click",function(){
            that.loadMore();
        })

        this.$error.on("click",function(){
            that.load()
        })
	},

	open: function(){
		this.$hd.trigger("click");
	},

	load: function(){
		var that = this;
		if ( this.loading ) {
			return;
		}
		this.loading = true;
		this.$el.addClass("state-loading");

		return $.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/departments?parent="+this.model.get("id")+"&page=1&count=" + this.pageSize,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					that.page = 1;
					that.addChildren( response.data );
					if ( response.data.length < that.pageSize ) {
                        that.hideLoadInfo();
					} else {
                        that.loadMoreShow();
					}
				} else {
					point.shortShow({
						type:"error",
						text: global.tools.getErrmsg(response.errcode)
					});
				}
			},

			error: function(){
				point.shortShow({
					type:"error",
					text: "加载失败，请检查网络"
				});
                that.error()
			},

			complete: function(){
				that.$el.removeClass("state-loading");
				that.loading = false;
			}
		});
	},

	loadMore: function(){
		var that = this;
		if ( this.loadMoring ) {
			return;
		}
		this.loadMoreing = true;

        that.loadingShow()

		return $.ajax({
			url: global.baseUrl + "/orgs/"+global.data.org.get("id")+
				"/departments?parent="+this.model.get("id")+"&page="+
				(this.page + 1)+"&count=" + this.pageSize,
			type:"GET",
			success: function(response){
				if ( response.errcode === 0 ) {
					that.page++;
					that.addChildren( response.data );
                    if ( response.data.length < that.pageSize ) {
                        that.hideLoadInfo();
                    } else {
                        that.loadMoreShow();
                    }
				} else {
					that.$el.addClass("state-more-error");
					point.shortShow({
						type:"error",
						text: global.tools.getErrmsg(response.errcode)
					});
				}
			},

			error: function(){
				that.$el.addClass("state-more-error");
				point.shortShow({
					type:"error",
					text: "加载失败， 请检查网络"
				});
                that.moreErrorShow()
			},

			complete: function(){
				that.loadMoring = false;
				that.$el.removeClass("state-more-load");
			}
		});
	},

	addChildren: function(list){
		var that = this;
		_.each(list, function(data){
			var itemView = new View({
				model: new Backbone.Model(data),
				parentView: that.parentView
			});
			that.$list.append( itemView.$el );
		});
	},

    hideLoadInfo:function(){
        this.$error.hide()
        this.$loading.hide()
        this.$moreError.hide()
        this.$loadMore.hide()
    },

    errorShow:function(){
        this.$error.show()
        this.$loading.hide()
        this.$moreError.hide()
        this.$loadMore.hide()
    },
    loadMoreShow:function(){
        this.$error.hide()
        this.$loading.hide()
        this.$moreError.hide()
        this.$loadMore.show()
    },
    loadingShow:function(){
        this.$error.hide()
        this.$loading.show()
        this.$moreError.hide()
        this.$loadMore.hide()
    },
    moreErrorShow:function(){
        this.$error.hide()
        this.$loading.hide()
        this.$moreError.show()
        this.$loadMore.hide()
    },

	destroy: function(){
		this.remove();
	}
	
});

module.exports = View;