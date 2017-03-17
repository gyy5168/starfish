var _=require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point=require("modules-common/point/point.js"),
    point2=require("modules-common/point2/point.js"),
    deleteModal=require("../delete-user/delete-user.js"),
    DepartmentSelect=require("modules/department-select/department-select.js");


var View=Backbone.View.extend({
    attributes:{
        class:"user-detail"
    },

    headTemplate:__inline("user-detail-head.tmpl"),
    textTemplate:__inline("user-detail-text.tmpl"),
    textActionTemplate:__inline("user-detail-text-actions.tmpl"),
    inputTemplate:__inline("user-detail-input.tmpl"),

    initialize:function(){
        this.currentDepartment=null;
        this.render();
        this.initEvent();
    },
    render:function(){
        this.$el.html(__inline("user-detail.html"));
        this.$textPanel=this.$el.find(".JS-user-detail-text");
        this.$textContent=this.$textPanel.find(".JS-text-content");
        this.$textActions=this.$textPanel.find(".JS-text-actions");
        this.$textPoint=this.$textPanel.find(".JS-point-panel");

        this.$inputPanel=this.$el.find(".JS-user-detail-input");
        this.$inputContent=this.$inputPanel.find(".JS-input-content");
        this.$inputActions=this.$inputPanel.find(".JS-input-actions");


        this.$head=this.$el.find(".JS-user-detail-head")

    },
    initEvent:function(){
        var that=this;
        this.listenTo(this.model,'change',this.reRender);

        this.$el.on("click",function(){
            return false
        });

        this.$textActions.on("click","span",function(){
            var action=$(this).data("action");

            switch (action){
                case "correct":
                    that.$textPanel.hide();
                    that.$inputPanel.show();
                    return;
                case "delete":
                    deleteModal.show({
                        okCallback:function(){
                            that.delete()
                        }
                    })
                    return;
                case "add-admin":
                    that.addAdmin();
                    return
                case "remove-admin":
                    that.removeAdmin();
                    return
            }
        });

        this.$inputActions.on("click","span",function(){
            var action=$(this).data("action");

            switch (action){
                case "cancel":
                    that.$textPanel.show();
                    that.$inputPanel.hide();
                    return;
                case "save":
                    that.update();
                    return
            }
        });

        this.$inputPanel.on("click",'.input-department input',function(){
            new DepartmentSelect({
                data:that.model.get("departments_info"),
                callback:function(data){
                    that.model.set("departments_info",data);
                    that.reRender()
                }
            })
        });

        this.$inputPanel.on("click",'.input-sex span',function(){
            $(this).addClass("selected").siblings("span").removeClass("selected")
        })
    },

    set:function(data){
        var that=this;
        this.model=new Backbone.Model(data);

        this.reRender()

    },

    reRender:function(){
        var data=this.model.toJSON();
        data.name=data.name || "请输入姓名";
        data.departments=data.departments || [];
        data.location=data.location || "";

        this.$head.html(this.headTemplate({data:data}));

        if(global.data.currentOrg.get("creator")==this.model.get("id")){
            this.$textActions.html(__inline("user-detail-text-actions-admin.tmpl"))
        }else {
            this.$textActions.html(this.textActionTemplate({data:data}));
        }

        this.$textContent.html(this.textTemplate({data:data}));


        this.$inputContent.html(this.inputTemplate({data:data}));
    },

    update:function(){
        var that=this;

        if(!this.check()){
            return
        }

        if(this.updating){
            return
        }
        this.updating=true;

        point2.show({
            text:"正在修改成员信息...",
            type:"loading"
        })

        var data=this.get();

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id")+"/members/"+that.model.get("id"),
            type:"PATCH",
            data:JSON.stringify(data),
            success:function(response){
                if(response.errcode===0){
                    _.each(data,function(value,key){
                        that.model.set(key,value)
                    });
                    that.reRender();
                    point2.shortShow({
                        text:"修改成功",
                        type:"success",
                    })
                }else {
                    point2.shortShow({
                        text:"修改失败，错误码是"+response.errcode,
                        type:"error"
                    })
                }
            },
            error:function(){
                point2.shortShow({
                    text:"网络异常，请检查您的网络设置",
                    type:"error"
                })
            },
            complete:function(){
                that.updating=false;
            }
        })
    },

    check:function(){
        var $name=this.$inputContent.find(".input-name").find("input");
        if(!$name.val()){
            $name.focus();
            $name.parent().next().show()
            return false
        }else {
            $name.parent().next().hide()
        }

        var $position=this.$inputContent.find(".input-position").find("input");
        if($position.val() && this.getStrLength($position.val()).length>30){
            $position.focus();
            $position.parent().next().show()
            return false
        }else {
            $position.parent().next().hide()
        }

        var $intro=this.$inputContent.find(".input-intro").find("textarea");
        if($intro.val() && this.getStrLength($intro.val()).length>300){
            $intro.focus();
            $intro.parent().next().show();
            return false
        }else {
            $intro.parent().next().hide()
        }
        return true
    },

    get:function(){
        var that=this;
        return {
            name:that.$inputPanel.find(".input-name input").val(),
            position:that.$inputPanel.find(".input-position input").val(),
            departments_info:that.model.get("departments_info"),
            gender:that.$inputPanel.find(".input-sex span.selected").index()*1-1,
            intro:that.$inputPanel.find(".input-intro textarea").val()
        }
    },

    addAdmin:function(){
        var that=this;

        if(this.isCreatorLogin()){
            if(this.isMyself()){
                point2.shortShow({
                    text:"您没有该操作权限",
                    type:"error"
                })
                return
            }
        }else {
            if(this.isCreator()){
                point2.shortShow({
                    text:"您没有该操作权限",
                    type:"error"
                })
                return
            }
        }


        if(this.addAdmining){
            return
        }
        this.addAdmining=false;

        point2.show({
            text:"正在设置管理员...",
            type:"loading"
        })

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id")+"/administrators",
            type:"POST",
            data:JSON.stringify({
                user_id:this.model.get("id")
            }),
            success:function(response){
                if(response.errcode===0){
                    point2.shortShow({
                        text:"设置成功",
                        type:"success"
                    })
                    that.model.set("is_admin",true)
                    that.reRender()
                }else {
                    point2.shortShow({
                        text:"您没有该操作权限",
                        type:"error"
                    })
                }
            },
            error:function(){

                point2.shortShow({
                    text:"网络异常，请检查您的网络设置",
                    type:"error"
                })
            },
            complete:function(){
                that.addAdmining=false
            }
        })
    },

    removeAdmin:function(){
        var that=this;

        if(this.isCreatorLogin()){
            if(this.isMyself()){
                point2.shortShow({
                    text:"您没有该操作权限",
                    type:"error"
                })
                return
            }
        }else {
            if(this.isCreator()){
                point2.shortShow({
                    text:"您没有该操作权限",
                    type:"error"
                })
                return
            }
        }

        if(this.removeAdmining){
            return
        }
        this.removeAdmining=false;

        point2.show({
            text:"正在撤销管理员...",
            type:"loading"
        })

        return $.ajax({
            url:global.baseUrl + "/orgs/" + global.data.currentOrg.get("id")+"/members/"+that.model.get("id"),
            type:"DELETE",

            success:function(response){
                if(response.errcode===0){
                    point2.shortShow({
                        text:"撤销成功",
                        type:"success"
                    });
                    that.model.set("is_admin",false)
                    that.reRender()
                }else {
                    point2.shortShow({
                        text:"您没有该操作权限",
                        type:"error"
                    })
                }
            },
            error:function(){

                point2.shortShow({
                    text:"网络异常，请检查您的网络设置",
                    type:"error"
                })
            },
            complete:function(){
                that.removeAdmining=false
            }
        })
    },

    //查看的是当前用户，或者是组织创建者，则没有删除权限

    //详情面板是管理员信息
    isCreator:function(){
        return global.data.currentOrg.get("creator")==this.model.get("id")
    },

    //详情面板是我自己信息
    isMyself:function(){
        return global.data.user.get("id")==this.model.get("id")
    },

    //管理员登陆
    isCreatorLogin:function(){
        return global.data.currentOrg.get("creator")==global.data.user.get("id")
    },

    delete:function(){
        var that=this;

        if(this.isCreatorLogin()){
            if(this.isMyself()){
                point2.shortShow({
                    text:"您没有该操作权限",
                    type:"error"
                })
                return
            }
        }else {
            if(this.isCreator() || this.isMyself()){
                point2.shortShow({
                    text:"您没有该操作权限",
                    type:"error"
                })
                return
            }
        }

        if(this.deleting){
            return
        }

        this.deleting=true;

        point2.show({
            text:"正在删除改成员...",
            type:"loading"
        })

        return $.ajax({
            url:global.baseUrl + "/orgs/" + global.data.currentOrg.get("id")+"/members/"+this.model.get("id"),
            type:"DELETE",
            success:function(responese){

                if(responese.errcode===0){
                    that.trigger("userDeleted",that.model);
                    point2.shortShow({
                        text:"删除成功",
                        type:"success"
                    })
                }else{
                    point2.shortShow({
                        text:"您没有该操作权限",
                        type:"error"
                    })
                }
            },
            error:function(){

                point2.shortShow({
                    text:"网络异常，请检查您的网络设置",
                    type:"error",
                })
            },
            complete:function(){
                that.deleting=false
            }
        })
    },

    showText:function(){
        this.$textPanel.show();
        this.$inputPanel.hide();
    },

    getStrLength: function(str){
        var realLength = 0, len = str.length, charCode = -1;
        for (var i = 0; i < len; i++) {
            charCode = str.charCodeAt(i);
            if (charCode >= 0 && charCode <= 128) realLength += 1;
            else realLength += 2;
        }
        return realLength;
    },

    hide:function(){
        this.$el.hide();
    },
    show:function(){
        this.$el.show();
    },
    isShow:function(){
        return !!this.$el.css("display");
    },
    destroy:function(){
        this.remove();
    }
});

module.exports=View;
