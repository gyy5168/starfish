var $ = require("modules-common/zepto/zepto.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	SelectPanel = require("./select-all/select-all.js");
	ItemView = require("./item/item.js");

var List = Backbone.Collection.extend({
	modelId: function( attrs ) {
		return attrs.type +""+ attrs.id;
	}
});

var FormPeople = Backbone.View.extend({

	attributes: {
		class: "form-people form-group"
	},

	removeTemplate: __inline("remove-panel.tmpl"),

	initialize: function(option) {
		this.list = new List();
		this.itemViews = [];
		this.option = option || {};
		this.render();

		this.initListEvent();
		this.initPlusEvent();
		this.initInputEvent();
	},

	render: function() {
		this.modules = {};
		this.$el.html(__inline("form-people.html"));
		this.$inputWraper = this.$el.find(".JS-inputWraper");
		this.$input = this.$inputWraper.find("input");
		this.$inputSpan = this.$inputWraper.find("span");
		this.$add = this.$el.find(".JS-add");

		this.$el.find("label").html(this.option.label);
		if (this.option.class) {
			this.$el.addClass(this.option.class);
		}
	},

	initListEvent: function(){
		var that = this;

		this.listenTo( this.list, "add", that.addItem);
		this.listenTo( this.list, "remove", that.removeItem);

		this.listenTo( this.list, "reset", function(list, options){
			_.each(options.previousModels, function(model,index){
				that.removeItem(model);
			});

			that.list.each(function(model) {
				that.addItem(model);
			});
		});

		this.listenTo( this.list, "add", function(){
			that.$input.val("").trigger("changesize");
		});
	},

	initPlusEvent: function() {
		var that = this;
		this.$add.on("click", function(event){
			that.selectPanel = new SelectPanel({
				list: that.list,
				callback: _.bind(function(data){
					that.list.set(data, {
						remove: false
					});
				}, that)
			});
			
			event.stopPropagation();
		});
	},

	initInputEvent: function(){
		var that = this;

		this.$el.on("click", function(){
			that.$input.focus();
		});

		this.$input.on("changesize input", function() {
			that.$inputSpan.html(that.$input.val());
		});

		this.$input.on("click", function(event) {
			event.stopPropagation();
		});

		this.$input.on("blur", function(){
			that.handleInput();
		});

		this.$input.on("keydown", function(event) {
			var keyCode = event.keyCode;

			switch (keyCode) {
				case 8:// 删除delete
					if (that.$input.val() === "") {
						var $node = that.$inputWraper.prev();
						if ( $node.length > 0 ) {
							that.list.remove( $node.data("id"));
						}
					}
					break;
				case 13:// 回车
					that.handleInput();
					event.preventDefault();
					break;
	
			}
			event.stopPropagation();
		});
	},

	handleInput: function(){

		var value = this.$input.val().trim();
		if ( value === "" ) {
			return;
		}

		if ( this.isEmail( value ) ) {
			this.list.add({
				work_mail: value,
				type: "external",
				id: (+new Date())
			});
			this.$input.val("").trigger("changesize");
		} else {
			point.shortShow({
				text:"不是合法的邮箱地址"
			});
		}
	},

	showRemovePanel: function(model){
		var data = model.toJSON(),
			obj = {};

		this.hideRemovePanel();

		obj.name = data.name || "未知";
		obj.mail = data.work_mail;
		this.$removePanel = $(this.removeTemplate(obj));
		this.$el.after(this.$removePanel);

		var that = this;

		this.$removePanel.find(".JS-btn-ok").on("click", function(event){
			that.list.remove(model);
			that.hideRemovePanel();
		});

		this.$removePanel.find(".JS-btn-cancel").on("click", function(event){
			that.hideRemovePanel();
		});

		this.$removePanel.on("click", function(event){
			event.stopPropagation();
		});
	},

	hideRemovePanel: function(){
		if ( this.$removePanel ) {
			this.$removePanel.remove();
		}
	},

	// 根据ID获取列表项
	getItem: function(id){
		var that = this;
		var view = _.find( this.itemViews, function( view ) {
			return id ===  that.list.modelId(view.model.toJSON());
		});

		return view;
	},

	// 添加列表项
	addItem: function(model, collection, options) {
		var view = new ItemView({
			model: model,
			parentView: this
		});

		options = options || {};

		if ( options.at !== undefined ) {
			if ( options.at === 0 ) {
				this.$content.prepend(view.$el);
				this.itemViews.unshift(view);
			} else {
				var id = collection.at(options.at - 1).get("id"),
					itemview = this.getItem(id);
				itemview.$el.after(view.$el);
				this.itemViews.splice( options.at, 0, view );
			}
		} else {
			this.$inputWraper.before(view.$el);
			// this.$moreLoading.before(view.$el);
			this.itemViews.push(view);
		}
	},

	// 删除列表项
	removeItem: function(model){
		var view = this.getItem(this.list.modelId(model.toJSON())),
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

	clear: function() {
		this.list.reset([]);
		this.$input.val("").trigger("changesize");
		return this;
	},

	isEmail: function(str) {
		var reg = /^([$.a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+(.[a-zA-Z0-9_-])+/;
		return reg.test(str);
	},

	get: function() {
		// 去重
		var list = new List();
		this.list.each(function(model){
			var obj = model.toJSON();
			if ( obj.type === "group" ) {
				_.each(obj.members, function(data){
					if ( data.work_mail && data.work_mail !== "" ) {
						data.type = "member";
						list.add(data);
					}
				});
			} else {
				list.add(obj)
			}
		});

		var arr = [];
		list.each( function(model){
			var email = model.get("work_mail");
			arr.push(email);
		});

		return arr;
	},

	set: function(arr) {
		var that = this;
		this.list.reset(arr);
	},

	show: function() {
		this.$el.show();
	},

	hide: function() {
		this.$el.hide();
	},

	destroy: function(){
		_.each( this.modules, function(module){
			module.destroy();
		});
		this.remove();
	}

	
});


module.exports = FormPeople;