var Backbone = require("modules-common/backbone/backbone.js"),
	router = require("modules/routers/router.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js"),
	point = require("modules-common/point/point.js"),
	PeopleList = require("./people-list/people-list.js"),
	SelectedList = require("./selected-list/selected-list.js"),
	Modal = require("modules-common/modal/modal.js");

var View = Modal.extend({

	title:"人员选择",

	content: __inline("people-select-enhanced.html"),

	initialize: function(option) {
		this.list = new Backbone.Collection();
		View.__super__.initialize.call(this);
		this.render();
		this.initEvent();
		this.set(option);
	},

	render: function() {
		this.$search = this.$el.find("input");
		this.$content = this.$el.find(".JS-content");
		this.$listWraper = this.$el.find(".JS-list-wraper");
		this.$ok = this.$el.find(".JS-ok");

		this.peopleList = new PeopleList({
			list:this.list
		});
		this.selectedList = new SelectedList({
			list:this.list
		});

		this.$listWraper.append(this.peopleList.$el);
		this.$listWraper.append(this.selectedList.$el);
		
		$("#wraper").append( this.$el );
	},

	initEvent: function() {
		var that = this;

		this.$search.on("input", _.throttle(function(){
			var value = that.$search.val();
			that.peopleList.filter(value);
		},200, {
			leading: false
		}));

		this.listenTo( this, "hide", function(){
			that.clear();
		});

		this.initOkEvent();
	},

	initOkEvent: function(){
		var that = this;
		this.$ok.on("click", function(){
			var result = that.get();
			if ( result.length === 0 ) {
				point.shortShow({
					text:"请选择成员"
				});
			} else {
				that.callback && that.callback(result);
			}
		});
	},

	clear: function(){
		this.$search.val("").trigger("input");
		this.list.each(function(model){
			model.view.clear();
		});
	},

	set: function(option){
		option = option || {};
		if ( option.data ) {
			this.list.reset(option.data);
		}

		if ( option.callback ) {
			this.callback = option.callback;
		}
	},

	get: function(){
		return this.selectedList.get();
	},

	destroy: function(){
		this.remove();
	},

	attributes: {
		class: "people-select-enhanced"
	}
});

module.exports = View;