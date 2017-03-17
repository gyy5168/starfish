var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Panel = require("modules-common/panel/panel.js");

var SelectedList = Backbone.Collection.extend({
	modelId: function( attrs ) {
		return attrs.type +""+ attrs.id;
	}
});

var View = Backbone.View.extend({

	attributes:{
		"class": "people-select"
	},

	pageSize: 20,

	initialize: function(option){
		this.option = option;
		this.selectedList = new SelectedList();
		this.render();
		this.initEvent();
	},

	render: function(){
		this.$el.html(__inline("people-select.html"));
		this.$listWraper = this.$el.find(".JS-list-wraper");
		this.$input = this.$el.find("input");
		this.$inputClean = this.$el.find(".JS-clean");

		this.modules = {};
		this.modules.searchList = new this.SearchList({
			parentView: this,
			selectedList: this.selectedList,
			option: this.option
		});

		this.modules.peopleList = new this.PeopleList({
			parentView: this,
			selectedList: this.selectedList,
			option: this.option
		});

		this.$listWraper.append( this.modules.searchList.$el );
		this.$listWraper.append( this.modules.peopleList.$el );

		global.$doc.append( this.$el );
	},

	initEvent: function(){
		var that = this;
		// 选中人员
		this.listenTo( this.selectedList, "add", function(model){
			that.trigger("select", model.toJSON());
		});

		// 取消选中人员
		this.listenTo( this.selectedList, "remove", function(model){
			that.trigger("unselect", model.toJSON());
		});

		this.initSearchEvent();
	},

	initSearchEvent: function(){
		var that = this;

		this.$inputClean.on("click", function(){
			that.$input.val("").trigger("input");
		});

		this.$input.on("input", function(){
			var value = $(this).val();

			value = value.replace(/(^\s*)|(\s*$)/g, "");

			if ( value === "" ) {
				that.modules.peopleList.show();
				that.modules.searchList.hide();
				that.$inputClean.hide();
				return false;
			}

			that.$inputClean.show();

			that.modules.peopleList.hide();
			that.modules.searchList.show();

			that.modules.searchList.search(value);
		});
	},

	// 清除组件， 使组件保持新建状态
	clear: function(){
		this.modules.searchList.clear();
		this.modules.peopleList.clear();
		this.$input.val("");
		this.modules.searchList.hide();
		this.modules.peopleList.show();
	},

	get: function(){
		return this.selectedList.toJSON();
	},

	// 设置选中的值、位置
	set: function(option){
		if ( !option ) {
			return;
		}

		if ( option.selectedList ) {
			this.selectedList.reset(option.selectedList );
		}

		if ( option.css ) {
			this.setPosition(option.css);
		}
	},

	getSelectedList: function(){
		return this.selectedList;
	},

	select: function(obj){
		this.selectedList.add( obj );
	},

	unselect: function(obj){
		this.selectedList.remove( this.selectedList.modelId(obj) );
	},

	destroy: function(){
		this.modules.peopleList.destroy();
		this.modules.searchList.destroy();
		this.remove();
	}
});

module.exports = View;