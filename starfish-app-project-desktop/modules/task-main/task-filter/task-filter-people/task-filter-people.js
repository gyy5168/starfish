var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	_ = require("modules-common/underscore/underscore.js"),
	point = require("modules-common/point/point.js"),
	PeopleSelect = require("modules/form-people-select/form-people-select.js");

var View = Backbone.View.extend({
	tagName: "div",

	template:__inline("task-filter-people.tmpl"),

	initialize: function(option) {
		this.option = option;
		this.projectObj = option.projectObj;

		this.projectId = this.projectObj.id;

		this.list = new Backbone.Collection();

		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("task-filter-people.html"));
		this.$list = this.$el.find("ul");
		this.$loading = this.$el.find(".JS-loading");
		this.$error = this.$el.find(".JS-error");
		this.$add = this.$el.find(".JS-add");
	},

	initEvent: function() {
		var that = this;

		this.$el.find(".JS-title").html( this.option.title );
		this.$add.on("click", function( event ) {
			var offset = that.$add.offset(),
				left = offset.left,
				top = offset.top + that.$add.height();

			if ( !that.peopleSelect) {
				that.peopleSelect = new PeopleSelect({
					projectId:that.projectId
				});

				that.listenTo( that.peopleSelect, "select", function(obj){
					handle( obj );
					// that.peopleSelect.hide();
				});

				that.listenTo( that.peopleSelect, "hide", function(){
					that.stopListening(that.peopleSelect);
					that.peopleSelect.destroy();
					that.peopleSelect = null;
				});
			}
			
			that.peopleSelect.toggle({
				css:{
					left:left,
					top:top,
                    "z-index": 20
				}
			});

			event.stopPropagation();
		});

		this.$list.on("click", ".JS-remove", function(){
			var id = $(this).parent().data("id");
			that.list.remove(id);
		});

		function handle(obj){
			if ( that.hasItem( obj.id ) ) {
				return;
			}
			that.list.add(obj);
		}

		this.initListEvent();
	},

	initListEvent: function(){
		var that = this;

		this.listenTo( this.list, "add", this.addItem );
		this.listenTo( this.list, "remove", this.removeItem );
		this.listenTo( this.list, "reset", function(models, options){
			_.each(options.previousModels, function(model){
				that.removeItem(model);
			});
			that.list.each(function(model){
				that.addItem( model );
			});
		});
	},

	fetchPeopleData: function(arr){
		var that = this;
		if ( this.fetchPeopleDataing ) {
			return;
		}
		this.fetchPeopleDataing = true;
		this.$loading.show();
		this.$list.hide();
		this.$error.hide();

		return $.ajax({
			url: global.baseUrl + "/user_summaries/" + this.setValue.join(","),
			type:"GET",
			success: success,
			error: error,
			complete: complete
		});

		function success(response){
			if ( response.errcode === 0 ) {
				that.$list.show();
				that.list.reset(response.data);
			} else {
				that.$error.show();
				point.shortShow({
					type:"error",
					text:global.tools.getErrmsg(response.errcode)
				});
			}
		}

		function error(){
			that.$error.show();
			point.shortShow({
				type:"error",
				text:"网络异常，请检查您的网络设置"
			});
		}

		function complete(){
			that.fetchPeopleDataing = false;
			that.$loading.hide();
		}
	},

	hasItem: function(id){
		var len = this.$list.find("li[data-id="+id+"]").length;
		if ( len > 0 ) {
			return true;
		}
		return false;
	},

	addItem: function(model, list, option){
		var obj = model.toJSON();
		option = option || {};
		if ( option.at === 0 ) {
			this.$list.prepend(this.template(obj));
		} else {
			this.$list.append(this.template(obj));
		}
	},

	removeItem: function(model){
		var id = model.get("id");
		this.$list.find("li[data-id="+id+"]").remove();
	},

	get: function(){
		return this.list.pluck("id");
	},

	set: function(arr){
		var that = this;
		this.setValue = arr;
		this.fetchPeopleData();
	},

	clear: function(){
		this.$list.html("");
	},

	attributes: {
		class: "task-filter-people"
	},

	destroy: function(){
		this.peopleSelect && this.peopleSelect.destroy();
		this.peopleSelect = null;
		this.remove();
	}
});

module.exports = View;