var _=require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

    attributes:{
        class:"item-mail"
    },

    initialize: function() {
        this.render();
        this.initEvent();
    },

    render: function() {
        this.$el.html(__inline("item-mail.html"));
        this.$input = this.$el.find("input");
        this.$select = this.$el.find("select");
        this.$unset = this.$el.find(".JS-unset");
        this.$info = this.$el.find(".JS-info");
        this.$infoTxt=this.$info.find(".JS-infoTxt")
        this.$okCancel=this.$el.find(".JS-ok-cancel");
        this.$ok=this.$okCancel.find(".JS-ok");
        this.$cancel=this.$okCancel.find(".JS-cancel");
        this.$loading=this.$el.find(".JS-loading")

        this.$okCancel.hide()
    },

    initEvent:function(){
        var that=this

        this.$input.on("input",function(){
            that.$okCancel.show();
        });

        this.$select.on("change",function(){
            that.$okCancel.show();
        })

        this.$cancel.on("click",function(){
            that.$okCancel.hide();
        });

        this.$ok.on("click",function(){
            that.post()
        })


        this.listenTo( global.data.domainList, "add change", function(model){
            that.renderSelect();
        });

        this.listenTo( global.data.domainList, "change", function(model){
            var mail = that.work_mail_divide(),
                name=mail.name,
                domain= mail.domain;

            if (model.previous("name") ===domain) {
                that.model.set("work_mail", name + "@" + model.get("name"));
                that.$select.val(model.get("name")  );
            }
        });
    },

    show:function(){
        this.$el.show()
        this.$info.hide()
    },

    hide:function(){
        this.$el.hide()
    },

    isChange:function(){

        var oldData=this.model.get("work_mail")
        var newData=this.getWorkMail();

        if(oldData!==newData){
            return true
        }
        return false
    },

    getWorkMail:function(){
        var name=this.$input.val().trim();
        var domain=this.$select.val().trim();
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

    getDomainIdByDomain: function(domain){

        var model = global.data.domainList.find(function(model){
            return model.get("name") === domain;
        });


        if ( model ) {
            return model.get("id");
        }

        return 0;
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

    set:function(model){
        this.model=model

        var data=this.model.toJSON();

        var mail = data.work_mail || "";
        this.$input.val(  mail.substr( 0, mail.indexOf("@") ));
        this.$el.find("label").html(data.name);
        this.$el.attr("data-id", data.id);
        this.renderSelect()
    },

    renderSelect: function(){
        var that = this,
            options="",
            defaultName=null
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

    post:function(){
        var that=this
        var value=this.$input.val().trim()



        if(!this.isChange()){
            point.shortShow({
                text:"没有任何修改"
            });
            return;
        }

        if(this.setting){
            return
        }

        if(!this.verify()){
            return
        }

        this.setting=true;

        point.shortShow({
            type:"loading",
            text:"正在设置..."
        });

        var data=this.model.toJSON();

        var d=[{
            domain_id:that.getDomainIdByDomain(that.$select.val()),
            group_id:data.id,
            work_mail_local_part:that.$input.val()
        }]

        $.ajax({
            url:global.baseUrl + "/orgs/"+global.data.org.get("id")+"/departments",
            type:"PATCH",
            data:JSON.stringify(d),
            success:function(response){
                if(response.errcode===0){
                    var errcode=response.data[0].errcode
                    if(errcode===0){
                        point.shortShow({
                            type:"success",
                            text:"邮件地址修改成功"
                        });
                        that.model.set("work_mail",that.getWorkMail())
                        that.hideInfo()
                    }else{
                        that.showInfo(global.tools.getErrmsg(errcode));
                        point.shortShow({
                            type:"error",
                            text:"邮件设置失败"
                        });
                        that.$input.focus()
                    }
                }else{
                    point.shortShow({
                        type:"error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },
            error:function(j,q){
                point.shortShow({
                    type:"error",
                    text:"网络异常，请稍后重试"
                });
            },
            complete:function(){
                that.setting=false
            }
        })
    },

    verify: function() {
        var reg = /^[a-zA-Z0-9\.][a-zA-Z0-9\._]*$/,
            str = this.$input.val();

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
        var that = this;

        this.$el.hide("500", function(){
            that.$el.removeData();
            that.remove();
        });
    },
});


module.exports = View;