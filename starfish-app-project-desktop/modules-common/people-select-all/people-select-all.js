var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Modal = require("modules-common/modal/modal.js"),
	PeopleSelect = require("modules-common/people-select-modules/people-select-all/people-select-all.js"),
	SelectedList = require("./selected-list/selected-list.js");

var View = Modal.extend({
	title: "选择人员",

	arrtibutes:{
		"class":"people-select-all"
	},

	content:__inline("people-select-all.html"),

	render: function(){
		View.__super__.render.call( this );

		this.$leftContent = this.$el.find(".JS-left-content");
		this.$rightContent = this.$el.find(".JS-right-content");
		
		this.modules = {};
		this.modules.peopleSelect = new PeopleSelect();
		this.selectedList = this.modules.peopleSelect.getSelectedList();

		this.modules.selectedList = new SelectedList({
			selectedList: this.selectedList
		});

		this.$leftContent.append(this.modules.peopleSelect.$el);
		this.$rightContent.append( this.modules.selectedList.$el );

		this.$el.addClass("people-select-all");
	},

	initEvent: function(){
		View.__super__.initEvent.call( this );
		var that = this;

		this.$ok = this.$el.find(".JS-ok");

		this.$ok.on("click", function(){
			that.trigger("ok", that.selectedList.toJSON());
		});
	},

	get: function(){
		return that.selectedList.toJSON();
	},

	addLoadingState: function(){
		this.$ok.addClass("loading");
	},

	removeLoadingState: function(){
		this.$ok.removeClass("loading");
	},

	destroy: function(){
		this.modules.peopleSelect.destroy();
		this.modules.selectedList.destroy();
		View.__super__.destroy.call( this );
	}
});


module.exports = View;