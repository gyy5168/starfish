var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	Modal = require("modules-common/modal/modal.js"),
	PeopleSelect = require("modules-common/people-select-modules/people-select-all/people-select-all.js"),
	SelectedList = require("./selected-list/selected-list.js"),
	RoleSelect = require("./role-select/role-select.js");

var View = Modal.extend({
	title: "选择人员",

	backdrop: false,

	content:__inline("content.html"),

	render: function(){
		View.__super__.render.call( this );

		this.$ok = this.$el.find(".JS-ok");

		this.modules = {};
		this.modules.peopleSelect = new PeopleSelect();

		var selectedList = this.modules.peopleSelect.getSelectedList();

		this.modules.selectedList = new SelectedList({
			selectedList: selectedList
		});

		this.$el.find(".JS-people-select-wraper").append( this.modules.peopleSelect.$el );

		this.$el.find(".JS-selected-list-wraper").append( this.modules.selectedList.$el );

		this.modules.roleSelect = new RoleSelect();

		this.$el.find(".JS-role-wraper").append( this.modules.roleSelect.$el );
	},

	initEvent: function(){
		View.__super__.initEvent.call( this );
		var that = this;
		this.$ok.on("click", function(){
			that.trigger("ok", that.get());
		});
	},

	get: function(){
		var data = {
			role: this.modules.roleSelect.get(),
			selectedList: this.modules.selectedList.get()
		};
		return data;
	},

	getRole: function(){
		return this.modules.roleSelect.get();
	},

	getSelectedList: function(){
		return this.modules.selectedList.get();
	},

	setLoading: function(){
		this.$ok.addClass("loading");
	},

	unsetLoading: function(){
		this.$ok.removeClass("loading");
	},

	destroy: function(){
		this.modules.roleSelect.destroy();
		this.modules.peopleSelect.destroy();
		this.modules.selectedList.destroy();
		View.__super__.destroy.call(this);
	}
});

module.exports = View;