var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
	initialize: function(option){
		this.$node = option.$node;
		this.render();
		this.initEvent();
	},

	render: function(){
		$("#wraper").append(this.$el);
	},

	initEvent: function(){
		var that = this,
			$doc = $( document ),
			x,
			y;

		function move( event ){
			var left, top, width, height;
			if ( event.pageX >= x ) {
				that.$el.css("width", event.pageX - x);
				left = x;
				width = event.pageX - x;
			} else {
				that.$el.css({
					left:event.pageX,
					width:x - event.pageX 
				});
				left = event.pageX;
				width = x - event.pageX;
			}

			if ( event.pageY > y ) {
				that.$el.css("height", event.pageY - y);
				top = y;
				height = event.pageY - y;
			} else {
				that.$el.css({
					top:event.pageY,
					height: y - event.pageY
				});
				top = event.pageY;
				height = y - event.pageY;
			}

			select(left, top, width, height);
			event.preventDefault();
			// event.stopPropagation();
			// return false;
		}

		// 每隔50ms执行一次
		var select = _.throttle(selectHandle, 100);

		// 选择文件
		function selectHandle( left, top, width, height ){
			that.$node.find("li").each( function(){
				$(this).removeClass("selected");
			});
			that.$node.find("li").each(function(){

				var $this = $( this ),
					offset = $this.offset(),
					iheight = $this.height(),
					iwidth = $this.width();
				if ( (left < offset.left + iwidth) && (top < offset.top + iheight) &&
					(left + width > offset.left) && (top + height) > offset.top){
					$this.addClass("selected");
				}

			});
		}

		function down( event ) {
			that.$el.show();
			x = event.pageX;
			y = event.pageY;

			that.$el.css({
				left:event.pageX - 2,
				top:event.pageY,
				width:0,
				height:0
			});

			$doc.on("mousemove", move);
		}

		function up(event){
			that.$el.hide();
			$doc.off("mousemove", move);
		}
		
		that.$node.on("mousedown", down);
		$doc.on("mouseup", up);


	},

	attributes:{
		class:"select-layer"
	}
});

module.exports = View;