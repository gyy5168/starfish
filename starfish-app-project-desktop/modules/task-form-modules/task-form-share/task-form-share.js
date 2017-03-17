var Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	PeopleSelectEnhanced = require("modules-common/people-select-enhanced/people-select-enhanced.js");


var View = PeopleSelectEnhanced.extend({
	title:"分享",

	initialize: function(){
		View.__super__.initialize.call(this);
		this.set({
			data: this.createData()
		});
	},

	initOkEvent: function(){
		var that = this;
		this.$ok.on("click", function(){
			var result = that.get();
			if ( result.length === 0 ) {
				point.shortShow({
					text:"需要选择成员"
				});
				return;
			}

			that.trigger("ok",result);
			that.hide();
		});
	},

	createData: function(){
		// 组装数据
		var groupData = {
				name:"讨论组",
				data:[]
			},
			departmentData = {
				name:"部门",
				data:[]
			},
			peopleData = {
				name:"成员",
				data:[],
				open: true
			};

		global.data.departmentList.each(function(model){
			var obj = model.toJSON();
			obj.type = 1;
			departmentData.data.push(obj);
		});
		global.data.groupList.each(function(model){
			var obj = model.toJSON();
			if ( obj.related_project_id == 0 ) {
				return;
			}
			obj.type = 2;
			groupData.data.push(obj);
		});
		global.data.peopleList.each(function(model){
			var obj = model.toJSON();
			obj.type = 0;
			peopleData.data.push(obj);
		});

		return [departmentData, groupData, peopleData];
	}
});

// var View = Backbone.View.extend({
// 	initialize: function() {
// 		this.render();
// 		this.initEvent();
// 	},

// 	render: function() {
// 		this.$el.html(__inline("task-form-share.html"));

// 		this.peopleSelectView = new PeopleSelectView();

// 		this.$el.find(".JS-bd").html(this.peopleSelectView.$el);

// 		this.$mask = $("<div class='share-mask'></div>");

// 		$("#wraper").append(this.$el).append(this.$mask);
// 	},

// 	initOkEvent: function(){
// 		var that = this;
// 		this.$ok.on("click", function(){
// 			var result = that.get();
// 			if ( result.length === 0 ) {
// 				point.shortShow({
// 					text:"需要选择成员"
// 				});
// 				return;
// 			}

// 			that.trigger("ok",result);
// 			that.hide();
// 		});
// 	},

// 	// initEvent: function() {
// 	// 	var that = this;
// 	// 	// $(document).on("share", function() {
// 	// 	// 	that.show();
// 	// 	// });

// 	// 	this.$el.find(".JS-cancel").on("click", function() {
// 	// 		that.hide();
// 	// 		that.peopleSelectView.clear();
// 	// 		that.trigger("cancel");
// 	// 	});

// 	// 	this.$el.find(".JS-ok").on("click", function() {
// 	// 		that.hide();
// 	// 		that.trigger("ok",that.peopleSelectView.get());
// 	// 		that.peopleSelectView.clear();
// 	// 	});

// 	// 	this.$mask.on("mousedown mouseup click", function(event) {
// 	// 		event.stopPropagation();
// 	// 	});
// 	// },

// 	// show: function() {
// 	// 	this.$el.show();
// 	// 	this.$mask.show();
// 	// },

// 	// hide: function() {
// 	// 	this.$el.hide();
// 	// 	this.$mask.hide();
// 	// },

// 	attributes: {
// 		class: "task-form-share"
// 	}
// });

// var view = new View();
module.exports = View;