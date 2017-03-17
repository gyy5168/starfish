var _=require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
    tagName:"li",
    attributes:{
        class:"item-view"
    },

    initialize: function(option) {
        this.render();
        this.initEvent();
        this.update()
        this.renderSelect()
    },

    render: function() {
        this.$el.html(__inline("item-view.html"));
        this.$input = this.$el.find("input");
        this.$select = this.$el.find("select");
        this.$info = this.$el.find(".JS-info");
        this.$infoTxt=this.$info.find(".JS-infoTxt")
    },

    update:function(){
        var data=this.model.toJSON(),
            mailName = this.work_mail_divide().name || "",
            groupName=data.name;

        this.$input.val(mailName );
        this.$el.find("label").html(groupName);
        this.$el.attr("data-id", data.id);
    },

    initEvent:function(){
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

    show:function(){
        this.$el.show()
    },

    hide:function(){
        this.$el.hide()
    },

    set:function(obj){
        for(var key in obj){
            this.model.set(key,obj[key])
        }
    },

    renderSelect: function(){
        var that = this,
            options="",
            defaultName=null;

        global.data.domainList.each( function(model){
            var obj = model.toJSON()
            if(obj.id ) {
                options += "<option value=" + obj.name + ">" + obj.name + "</option>"
            }
        });
        that.$select.html(options);

        defaultName= _.find(global.data.domainList.toJSON(),function(model){
            return model.is_default==1
        }).name

        var domain=this.work_mail_divide().domain;

        if(domain){
            this.$select.val( domain );
        }else{
            this.$select.val(defaultName);
        }
    },

    isChange:function(){

        var oldData=this.model.get("work_mail")
        var newData=this.getWorkMail()

        if(oldData!==newData){
            return true
        }

        return false
    },

    getWorkMail:function(){
        var name=this.$input.val().trim()
        var domain=this.$select.val();
        return name+"@"+domain
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

    updateModel:function(){
        var that=this
        this.model.set("work_mail",that.getWorkMail())
    },

    showInfo:function(text){
        this.$info.show()
        this.$infoTxt.text(text)
        this.$input.addClass("highlight")
    },

    hideInfo:function(){
        this.$info.hide()
        this.$input.removeClass("highlight")
    },

    get:function(){
        var that=this
        return {
            domain_id:that.getDomainIdByDomain(that.$select.val()),
            group_id:this.model.get("id"),
            work_mail_local_part:that.$input.val()
        }
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

    destroy: function() {
        this.remove()
    },
});


module.exports = View;