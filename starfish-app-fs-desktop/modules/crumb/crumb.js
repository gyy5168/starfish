var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js");

var View = Backbone.View.extend({

	template: __inline("crumb.tmpl"),

	attributes: {
		class: "crumb"
	},
	

	initialize: function() {
		this.render();
		this.initEvent();
	},

	render: function() {
	},

	initEvent: function() {
		var that = this;

		// 点击路由到相应的地址
		this.$el.on("click", ".JS-item", function(){
			var id = $(this).data("id"),
				hash = window.location.hash;

            if( id < 0 ) {
                return;
            }

			hash = urlTool.replaceParam(hash, "parent", id);

			router.navigate(hash, {
				trigger: true
			});
		});

		// 如果路径改变，则重新根据路径渲染
		global.event.on("changePath", function(arr){
			that.set(arr);
		});
	},

	setShare: function() {
	},

	set: function(arr) {
		var that = this;

		this.$el.html("");

        if ( arr.length <= 4 ) {
            $.each( arr, function( index, obj ) {
                that.$el.append(that.template({
                    name: obj.name,
                    id: obj.id
                }));
            });
            return;
        }

        // 如果大于4个, 显示第一个和后面3个, 中间用省略号
        that.$el.append(that.template({
            name: arr[0].name,
            id: arr[0].id
        }));

        that.$el.append(that.template({
            name: "...",
            id: -1
        }));

        $.each( arr.slice(-3), function( index, obj ) {
            that.$el.append(that.template({
                name: obj.name,
                id: obj.id
            }));
        });

	}

	
});

module.exports = View;