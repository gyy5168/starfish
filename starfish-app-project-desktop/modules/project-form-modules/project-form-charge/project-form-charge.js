var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	peopleTool = require("modules-common/tools/people.js"),
	ProjectPeopleSelect = require("modules/form-people-select/form-people-select.js");
	PeopleSelect = require("modules-common/people-select-organization/people-select-organization.js");
	// PeopleSelect = require("modules-common/people-select/people-select.js");

var View = Backbone.View.extend({
	tagName: "div",

	template:__inline("project-form-charge.tmpl"),

	attributes: {
		class: "project-form-charge form-group"
	},

	initialize: function(option) {
		option = option || {};
		this.type = option.type || "create";

		this.render();
		this.initEvent();
	},

	render: function() {
		this.$el.html(__inline("project-form-charge.html"));
		this.$content = this.$el.find(".JS-content");
		this.$edit = this.$el.find(".JS-edit");
	},

	initEvent: function() {
		var that = this;

		this.$edit.on("click", function( event ){
	
			var offset = that.$edit.offset(),
				left = offset.left,
				top = offset.top + that.$edit.height();

			if ( !that.peopleSelect ) {
				if ( that.type === "create" ) {
					that.peopleSelect = new PeopleSelect();
				} else {
					that.peopleSelect = new ProjectPeopleSelect({
						projectId: that.projectId
					});
				}
				
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

		function handle(obj){
			if ( that.type === "create" ) {
				that.set(obj);
			} else {
				that.trigger("change", {
					data:obj
				});
			}
		}
	},

	get: function(){
		return this.data;
	},

	setProjectId: function(id){
		this.projectId = id;
	},

	set: function(obj){
		this.data = obj.id;
		this.$content.html(this.template(obj));
	},

	clear: function(){
		this.set(global.data.user.toJSON());
	},

	destroy: function(){
		if ( this.peopleSelect ) {
			this.peopleSelect.destroy();
			this.peopleSelect = null;
		}

		this.$el.removeData();
		this.remove();
	}
});

module.exports = View;