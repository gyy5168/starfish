/**
 * Created by Administrator on 2015/9/17.
 */


var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    ItemView=require("./item-view/item-view.js"),
    point = require("modules-common/point/point.js"),
    $ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({

    attributes:{
        class:"search-mail"
    },

    initialize: function () {
        this.list=new Backbone.Collection();

        this.itemViews=[];
        this.render();
        this.initEvent();
    },

    render:function(){
        this.$el.html(__inline("search-mail.html"));
        this.$empty=this.$el.find(".JS-empty");
        this.$error=this.$el.find(".JS-error");
        this.$errorBtn=this.$error.find(".JS-btn");
        this.$loading=this.$el.find(".JS-loading");

        this.$list=this.$el.find(".JS-mail-list");
        this.$ok=this.$el.find(".JS-ok")
    },

    initEvent: function () {
        var that=this;
        this.listenTo(this.list,"add",this.addItem);
        this.listenTo(this.list,"remove",this.removeItem);
        this.listenTo(this.list,"reset",function(models,options){
            _.each(options.previousModels, function(model) {
                that.removeItem(model);
            });

            that.list.each(function(model) {
                that.addItem(model);
            });
        });

        this.$ok.on("click",function(){
            that.groupSet()
        })

        this.$errorBtn.on("click",function(){
            that.loading()
            that.set(that.keyWord)
        })
    },

    show:function(){
        this.$el.show()
    },

    hide:function(){
        this.$el.hide()
    },

    loading:function(){
        this.$empty.hide();
        this.$error.hide()
        this.$list.hide();
        this.$ok.hide();
        this.$loading.show();
    },

    success:function(data){
        this.$loading.hide()
        this.$empty.hide();
        this.$error.hide()
        this.$list.show()
        this.$ok.show();
        this.list.reset(data)
    },

    empty:function(){
        this.$error.hide()
        this.$list.hide();
        this.$loading.hide();
        this.$ok.hide();
        this.$empty.show();
    },

    fail:function(){
        this.$empty.hide();
        this.$list.hide();
        this.$loading.hide();
        this.$ok.hide();
        this.$error.show()
    },

    set:function(value){
        this.keyWord=value
        var that=this
        var url=global.baseUrl+"/orgs/"+global.data.org.get("id")+"/search?q="+value+"&type=103&page=1&count=20&highlight=1"
        $.ajax({
            url:url,
            type:"GET",
            success:function(response){
                if(response.errcode===0){
                    var data=response.data.data
                    if(data.length===0){
                        that.empty()
                    }else{
                        var list=[]
                        _.each(data,function(model){
                            list.push(model.source)
                        })
                        that.success(list)
                    }
                }
            },
            error:function(){
                that.fail()
            },
            complete:function(){

            },
        })
        //that.list.reset(data)
    },

    addItem: function(model, collection, options) {
        var view = new ItemView({
            model: model
        });

        options = options || {};

        if ( options.at !== undefined ) {
            if ( options.at === 0 ) {
                this.$list.prepend(view.$el);
                this.itemViews.unshift(view);
            } else {
                var id = collection.at(options.at - 1).get("id"),
                    itemview = this.getItem(id);
                itemview.$list.after(view.$el);
                this.itemViews.splice( options.at, 0, view );
            }
        } else {
            this.$list.append(view.$el);
            this.itemViews.push(view);
        }
    },

    removeItem: function (model) {

        var view=this.getItem(model.get("id")),
            that=this;
        if(!view){
            return
        }

        view.destroy()
        _.each(this.itemViews,function(itemView,index){
            if(itemView==view){
                that.itemViews.splice(index,1);
                return true
            }
        })
    },

    getItem: function (id) {

        var view= _.find(this.itemViews,function(view){
            return id == view.model.get("id")
        })
        return view
    },

    groupSet:function(){
        var that=this,
            changedViews=[],
            changedViewsData=[],
            wrongItem=[];

        if(this.setting){
            return
        }
        this.setting=true

        _.each( that.itemViews, function(itemView) {
            if ( !itemView.verify()) {
                wrongItem.push( itemView );
            }
        });

        if(wrongItem.length>0){
            return
        }

        _.each(this.itemViews,function(view){
            if(view.isChange() && view.verify()){
                changedViews.push(view)
                changedViewsData.push(view.get())
            }
        })

        if(changedViews.length===0){
            point.shortShow({
                text:"没有任何修改"
            });
            this.setting=false
            return;
        }

        point.shortShow({
            type:"loading",
            text:"正在设置..."
        })

        $.ajax({
            url:global.baseUrl + "/orgs/"+global.data.org.get("id")+"/departments",
            type:"PATCH",
            data:JSON.stringify(changedViewsData),
            success:function(response){
                if(response.errcode===0){
                    handle(response.data)
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
                that.error()
            },
            complete:function(){
                that.setting=false
            }
        });

        function handle(list) {
            var errNum=0
            _.each(list, function (data, i) {
                if (data.errcode != 0) {
                    errNum++
                    changedViews[i].showInfo(global.tools.getErrmsg(data.errcode))
                }else{
                    changedViews[i].updateModel()
                    changedViews[i].hideInfo()
                }
            })

            if ( errNum > 0 ) {
                point.shortShow({
                    type:"error",
                    text:"邮件设置失败"
                });
            } else {
                point.shortShow({
                    type:"success",
                    text:"邮件地址修改成功"
                });
            }
        }
    },

    destroy: function () {
        _.each(this.itemViews,function(view){
            view.destroy()
        })
        this.remove()
    }
})
module.exports=View