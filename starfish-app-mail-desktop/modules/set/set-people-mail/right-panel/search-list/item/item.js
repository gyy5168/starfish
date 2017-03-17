var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js"),
	_ = require("modules-common/underscore/underscore.js"),
	SelectDepartment = require("modules/set-select-department/set-select-department.js");

var View = Backbone.View.extend({

	tagName:"li",

	template: __inline("item.tmpl"),

	attributes: {
		class: "set-search-item"
	},

	initialize: function() {
		this.render();
		this.renderSelect();
		this.initEvent();
	},

	render: function() {
		var mail=this.work_mail_divide()
		var emailUser = mail.name,
			emailDomain = mail.domain;

		this.$el.append( this.template({
			name: this.model.get("name"),
			id: this.model.get("id"),
			user: emailUser,
			domain: emailDomain
		}));

		this.$select = this.$el.find("select");
		this.$input = this.$el.find("input");
		this.$info = this.$el.find(".JS-info");

	},

	renderSelect: function(){
		var that = this;
		this.$select.html("");
		var html = "";
		global.data.domainList.each(function(model) {
			var name = model.get("name");
			html += "<option value="+name+">"+name+"</option>";
		});
		this.$select.html(html);

		var unset=!this.model.get("work_mail")
		var domain
		if(unset){
			domain=global.data.domainList.find(function(model){
				return model.get("is_default")==1
			}).get("name")

		}else{
			domain=this.work_mail_divide().domain
		}

		this.$select.val( domain );
	},

	work_mail_divide:function(){
		var that=this
		var mail=this.model.get("work_mail"),
			name=mail.substr( 0, mail.indexOf("@")).trim(),
			domain= mail.substr( mail.indexOf("@") + 1),
			id=that.getDomainIdByDomain(domain)

		return {
			name:name,
			domain:domain,
			id:id,
		}
	},

	initEvent: function(){
		var that=this
		this.listenTo( global.data.domainList, "add change", function(model){
			that.renderSelect();
		});

		this.listenTo( global.data.domainList, "change", function(model){
			var mail = that.work_mail_divide(),
				name=mail.name,
				domain= mail.domain;

			if (model.previous("name") ===domain) {
				that.model.set("work_mail", name + "@" + model.get("name"));
			}
		});

		this.listenTo( this.model, "change:work_mail", function(model){
			var domain=that.work_mail_divide().domain
			that.$select.val(domain  );
		});
	},

	isChange: function(){
		var oldData=this.model.get("work_mail")
		var newData=this.getWorkMail()

		if(oldData!=newData){
			return true
		}
		return false
	},

	updateModel:function(){
		var that=this
		this.model.set("work_mail",that.getWorkMail())
	},

	getWorkMail:function(){
		var name=this.$input.val().trim()
		var domain=this.$select.val()
		return name+"@"+domain
	},

	get: function(){
		var that=this;
		return {
			domain_id:that.getDomainIdByDomain(that.$select.val()),
			user_id:this.model.get("id"),
			work_mail_local_part:that.$input.val()
		}
	},

	set: function(option){
		var domain;
		global.data.domainList.find(function(model){
			if (model.get("id") === option.domainId ) {
				domain = model.get("name");
				return true;
			}
		});

		this.model.set("work_mail", option.emailUser + "@" + domain);
	},

	getDomainIdByDomain: function(domain){

		var model = global.data.domainList.find(function(model){
			return model.get("name") === domain;
		});


		if ( model ) {
			return model.get("id");
		}

		return 0;
	},

    verify: function() {
        var reg = /^[a-zA-Z0-9\.][a-zA-Z0-9\._]*$/,
            str = this.$input.val();

        this.hideInfo();

        if ( str === "" ) {
            return true;
        }

        if (reg.test(str)) {
            return true;
        }
        this.showInfo("邮件地址格式错误");
        return false;
    },

	//一般情况下显示错误信息时，这个输入框就高亮了，所以逻辑没有拆开
	showInfo: function(text){
        this.$info.find(".JS-info-text").text( text );
		this.$info.show();
		this.$input.addClass("highlight")
	},

	hideInfo:function(){
		this.$info.hide();
		this.$input.removeClass("highlight")
	},

	destroy: function(){

		this.remove();
	}
});

module.exports = View;