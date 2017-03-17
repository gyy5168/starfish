var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	peopleTool = require("modules-common/tools/people.js"),
	PeopleSelect = require("modules/form-people-select/form-people-select.js");

var View = Backbone.View.extend({
	tagName: "div",

	attributes: {
		class: "task-form-charge"
	},

	template: __inline("task-form-charge.tmpl"),

	initialize: function(option) {
		option = option || {};
		this.type = option.type || "create";

		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("task-form-charge.html"));
		this.$name = this.$el.find(".JS-name");
		this.$edit = this.$el.find(".JS-edit");
	},

	initEvent: function() {
		var that = this;

		this.$edit.on("click", function(event) {

			var offset = that.$edit.offset(),
				left = offset.left ,
				top = offset.top + that.$edit.height();

			if ( !that.peopleSelect) {
				that.peopleSelect = new PeopleSelect({
					projectId:that.projectId
				});

				that.listenTo( that.peopleSelect, "select", function(obj){
					handle( obj );
					that.peopleSelect.hide();
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
					top:top
				}
			});

			event.stopPropagation();
		});

		function handle(obj) {
			if (that.data.id !== obj.id) {
				that.trigger("change", obj.id);
			}

			that.set(obj);
		}
	},

	get: function() {
		return this.data.id;
	},

	setProjectId: function(id) {
		this.projectId = id;
	},


	set: function(obj) {
		this.data = obj;
		this.$name.text(obj.name);
	},

	clear: function() {
		this.data = null;
		this.$name.text("");
	},

	destroy: function(){
		this.peopleSelect && this.peopleSelect.destroy();
		this.peopleSelect = null;
		this.remove();
	}
});

module.exports = View;