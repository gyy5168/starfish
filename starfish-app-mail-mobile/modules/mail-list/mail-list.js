
var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    ItemView=require("./item-view/item-view.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    CreateForm = require("modules/create-form/create-form.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
    attributes: {
        class:"mail-list"
    },

    pageSize:30,

    initialize: function () {
        var that=this
        this.list=new Backbone.Collection();
        this.itemViews=[];
        this.render();
        this.initEvent();
        this.initScrollEvent();
    },

    back:function(){
        history.back();
    },

    render: function () {
        this.$el.html(__inline("mail-list.html"));
        this.$content=this.$el.find(".JS-content");
        this.$header=this.$content.find(".JS-mail-list-header");
        this.$list=this.$content.find(".JS-mail-list-content");
        this.$operatepane=this.$content.find(".JS-mail-operate-panel");

        this.$empty=this.$el.find(".JS-empty");
        this.$error=this.$el.find(".JS-error");
        this.$loading=this.$el.find(".JS-loading");
        global.$doc.append(this.$el)
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
        this.listenTo(this.list,'remove reset',function(){
            if(that.list.length===0){
                that.$empty.show();
                that.$list.hide();
                that.$error.hide();
                that.$loading.hide();
            }
        })

        this.$operatepane.on("click","span",function(){
            var model=that.list.at(that.list.length-1);
            var action=$(this).data("action");
            var createForm = new CreateForm();
            createForm.set(action,model);
        });

        this.$error.on("click",function(){
            that.load()
        })

        this.listenTo(global.event,'mailSended',function(data){
            that.list.add(data)
        })
        //this.listenTo(this.list,'change',function(model){
        //    console.log(model.toJSON())
        //})
    },

    initScrollEvent:function(){
        var that = this;

        this.$list.on("scroll", function(){
            handle();
        });
        var handle = _.throttle(_.bind(this.setReadByView, this), 600);
    },

    scrollToUnread:function(){
        var that=this;
        var view=_.find(this.itemViews,function(view){
            return view.isRead()==0

        });

        if(!view){
            return
        }
        var $el=view.$el;
        var top=$el.offset().top-this.$header.height();
        this.$list.scrollTop(top)
    },

    scrollTo:function(id){
        var view=_.find(this.itemViews,function(view){
            return view.model.get("id")==id
        })
        var $el=view.$el;
        var top=$el.offset().top-this.$header.height();
        this.$list.scrollTop(top)
    },

    // 根据是否在视野内，设置邮件已读
    setReadByView: function(){

        var that = this,
            upHeight = 0,   //当内容显示超过此高度， 该邮件才算在视野中
            downHeight=0,
            viewTop = that.$el.offset().top+upHeight,
            viewBottom = that.$el.height() - downHeight,
            itemsInView = [],
            idsInView = [];

        // 获取在视野内，未读的邮件

        this.$list.find("li.unread").each(function(view){
            var el=$(this);
            var itemTop = el.offset().top;
            var itemBottom=itemTop+el.height();
            if(itemTop<viewBottom && itemTop>viewTop){
                itemsInView.push( el );
                idsInView.push( el.data("id") );
            }
        });

        // 如果在视野内，没有未读邮件， 则反悔
        if ( itemsInView.length === 0 ) {
            return;
        }

        var that=this;


        this.setRead(itemsInView,idsInView);

    },

    setRead:function(itemsInView,arr){
        var that=this;
        _.each(itemsInView,function(view){
            view.addClass("setRead");
        });

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/mail/mails/" + arr.join(","),
            type:"PATCH",
            data: JSON.stringify({
                is_read: 1
            }),
            success:function(response){
                if ( response.errcode === 0 ) {
                    _.each( arr , function(id) {
                        var model = that.list.get(id);
                        if (model) {
                            model.set("is_read", 1);
                        }
                    });
                    var subjectRead=1;
                    _.each(that.itemViews,function(view){
                        if(!view.isRead()){
                            subjectRead=0
                        }
                });
                    if(subjectRead){
                        global.event.trigger("subjectRead",that.subjectId)
                    }
                } else {
                    point.shortShow({
                        type:"error",
                        text:global.getErrmsg(response.errcode)
                    });
                }
            },
            error: function(){
                point.shortShow({
                    type:"error",
                    text:"设置邮件已读失败, 请检查网络"
                });

                _.each( itemsInView, function($node){
                    $node.addClass("unread").removeClass("read");
                });
            },
            complete:function(){
                _.each( itemsInView, function($node){
                    $node.removeClass("setRead");
                });
            }
        });
    },

    set:function(obj){
        if(obj.type="subject"){
            this.subjectId=obj.id;
            this.url=global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+ "/mail/subjects/"+this.subjectId+"/mails?ps="+this.pageSize;

        }else{ //type="mail"
            this.mailId=obj.id;
            this.url= global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+ "/members/"+global.data.user.get("id")+"/mail/subjects?mail_id="+this.mailId+"&ps="+this.pageSize
        }
        this.load();
    },

    load:function(){
        var that=this;
        if(this.loadding){
            return
        }
        this.loadding=true

        that.$content.hide();
        that.$error.hide();
        that.$empty.hide();
        that.$loading.show();
        $.ajax({
            url:that.url,
            type:"GET",

            dataFilter: function(response){
                response = response.replace("<", "&lt;");
                response = response.replace(">", "&gt;");
                return response;
            },

            success:function(response){
                var data=response.data;
                that.list.reset(response.data);
                if(that.list.length===0){
                    return
                }
                if(response.errcode==0){
                    that.$header.text(data[0].meta.subject);
                    that.$loading.hide();
                    that.$content.show();
                    that.$list.trigger("scroll");
                    that.scrollToUnread();
                }else{
                    point.shortShow({
                        "text":global.tools.getErrmsg(response.errcode)
                    })
                }
            },

            error:function(){
                that.$error.show();
                that.$empty.hide();
                that.$loading.hide();
            },

            complete:function(){
                that.loadding=false
            }
        })
    },

    show:function(){
        this.$el.show();
   
        topBar.setTitle( "邮件详情" );
        topBar.setBack(_.bind(this.back, this));
        topBar.setMenu([]);
    },

    hide:function(){
        this.$el.hide()
    },

    addItem: function(model, collection, options) {
        var that=this;
        var view = new ItemView({
            model: model,
            parentView:that
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

        view.destroy();
        _.each(this.itemViews,function(itemView,index){
            if(itemView==view){
                that.itemViews.splice(index,1);
                return true
            }
        });
    },

    getItem: function (id) {

        var view= _.find(this.itemViews,function(view){
            return id == view.model.get("id")
        });
        return view
    },

    destroy: function () {
        _.each(this.itemViews,function(view){
            view.destroy()
        });
        this.remove();
    }
});
module.exports=View
