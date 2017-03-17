/**
 * Created by Administrator on 2015/9/17.
 */


var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    relayBar=require("../relay-bar/relay-bar.js"),
    fileIcon=require("modules/file-icon/file-icon.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    file=require("modules-common/file/file.js"),
    tools = require("modules/tools/tools.js");
var View = Backbone.View.extend({
    attributes: {
        class:"mail-item"
    },
    template:__inline("item-view.tmpl"),
    tagName:"li",

    initialize: function (option) {
        this.render();
        this.initEvent();
        this.parentView=option.parentView;
    },
    render: function () {
        var data=this.model.toJSON(),
            renderData={},
            that=this,
            d=tools.convertDate(data.date);

        renderData.sender=data.meta.from_detail.value.name;
        renderData.isRead=data.is_read ? "hide" : 'show';
        renderData.time=d.split(" ")[1];
        renderData.date=d;
        renderData.receiver=this.renderReceive();
        renderData.cc=this.renderCC();
        renderData.shortContent=this.renderShortContent();
        renderData.detailContent=this.renderDetailContent();
        renderData.attachments=this.renderAttachments();

        this.renderData=renderData;

        // 内容显示为“名字：内容”

        this.$el.html(that.template( renderData ));
        this.$unread=this.$el.find(".JS-unread");
        this.renderRead();

        this.$relayLogo=this.$el.find(".JS-relayLogo");
        this.$shortContent=this.$el.find(".JS-short-content");
        this.$detailContent=this.$el.find(".JS-detail-content");

        this.$receive=this.$el.find(".JS-detail-receive");
        this.$cc=this.$el.find(".JS-detail-cc");
        this.$showAll=this.$el.find(".JS-detail-showAll");
        this.$more=this.$el.find(".JS-detail-more");
        this.$attachment=this.$el.find(".JS-attachment");
        this.$el.attr("data-id", data.id);
        this.renderShowAll();
    },

    initEvent:function(){
        var that=this;
        this.listenTo(that.model,"change:is_read",function(){
            that.renderRead();
        });

        this.$relayLogo.on("click",function(){
            var actionBar=new relayBar({model:that.model});
        });

        this.$more.on("click",function(){
            that.showShort=!that.showShort
            if(that.showShort){
                that.$detailContent.show()
            }else{
                that.$detailContent.hide()
            }
            return false
        });

        this.$showAll.on("click",function(){
            that.open=!that.open
            if(that.open){
                that.$receive.find("li").show();
                if(that.$cc.hasClass("show")){
                    that.$cc.show()
                }
                $(this).text("隐藏")
            }else{
                that.$receive.find("li").eq(0).siblings().hide();
                that.$cc.hide();
                $(this).text("显示全部")
            }

            return false
        });

        this.$attachment.on("click",function(){
            var index=$(this).index(),
                data=that.renderData.attachments[index];

            var obj={
                url: global.data.org.get("domain")+ "/orgs/"+global.data.org.get("id")+
                "/mail/mails/"+that.model.get("id")+"/attachments/"+data.id,
                mimeType: data.mimetype,
                fileName: data.name,
            };

            file.openRemote(obj);

        })
    },

    renderRead:function(){
        if(this.model.get("is_read")==1){
            this.$unread.hide();
            this.$el.addClass("read").removeClass("unread");
        }else{
            this.$unread.show();
            this.$el.addClass("unread").removeClass("read");
        }
    },

    renderReceive:function(){
        var list=this.model.toJSON().meta.to,
            user=this.model.toJSON().meta.to_info,
            len=list.length,
            data=[];

        _.each(list,function(model,i){
            var obj={};
            obj.mailname=model;
            obj.username=user[i].name;
            obj.showClass = i==0? " show " : "hide";
            data.push(obj)
        });
        data.num=len==1 ? "hide" : "show";
        return data
    },

    renderCC:function(){
        var list=this.model.toJSON().meta.cc,
            user=this.model.toJSON().meta.cc_info,
            data=[];

        _.each(list,function(model,i){
            var obj={};
            obj.mailname=model;
            obj.username=user[i].name;
            data.push(obj)
        });
        data.showClass=data.length==0 ? "hide" : "show";
        return data
    },

    renderShortContent:function(){

        var data=this.model.toJSON(),
            detailContent;
        detailContent = global.tools.decodeHtml(data.content);
        // �ʼ�����ֻ��Ҫת��scrpit��ǩ��������ʽ��ǩ
        detailContent = data.content.replace(/<script(\s+[^>]*)?>/ig, "&lt;script $1 &gt; ");
        detailContent = data.content.replace(/<\/script\s*>/ig, "&lt;/script&gt; ");

        var originIndex = detailContent.indexOf("<div class=\"JS-orgin\">");
        // if ( data.id === 213 ) {
        // 	console.log( data.content)
        // 	console.log(originIndex);
        // }
        if ( originIndex >= 0 ) {
            detailContent = detailContent.substring( 0,originIndex);
        }

        detailContent = detailContent.replace(/&lt;/g, "<");
        detailContent = detailContent.replace(/&gt;/g, ">");

        return detailContent

    },

    renderDetailContent:function(){
        var data=this.model.toJSON(),
             detailContent;
        detailContent = global.tools.decodeHtml(data.content);
        // �ʼ�����ֻ��Ҫת��scrpit��ǩ��������ʽ��ǩ
        detailContent = data.content.replace(/<script(\s+[^>]*)?>/ig, "&lt;script $1 &gt; ");
        detailContent = data.content.replace(/<\/script\s*>/ig, "&lt;/script&gt; ");

        var originIndex = detailContent.indexOf("<div class=\"JS-orgin\">");
        // if ( data.id === 213 ) {
        // 	console.log( data.content)
        // 	console.log(originIndex);
        // }
        if ( originIndex >= 0 ) {
            detailContent = detailContent.substr( originIndex);
        }

        detailContent = detailContent.replace(/&lt;/g, "<");
        detailContent = detailContent.replace(/&gt;/g, ">");

        return detailContent
    },

    renderAttachments:function(){
        var data=this.model.toJSON(),
            obj=[];

        obj.attachmentsClass=data.attachments.length>0 ? "show" : "hide" ;

        $.each(data.attachments, function(index, attachment){
            var o = {};
            o.id = attachment.id;
            o.mimetype = attachment.mimetype;
            o.name = attachment.filename;
            o.filesize=tools.formatSize(attachment.filesize);
            o.type = fileIcon.getClassName( attachment.filename );
            o.url = global.data.org.get("domain")+ "/orgs/"+global.data.org.get("id")+"/mail/mails/"+data.id+"/attachments/" + attachment.id +"?width=70&height=70";
            obj.push(o);

        });

        return obj
    },

    renderShowAll:function(){
        if(this.$receive.find("li").length*1+this.$cc.find("li").length*1<2){
            this.$showAll.hide()
        }
        if(this.$receive.find("li").length>1){
            this.$receive.find("li").eq(0).siblings().hide()
        }
        this.$cc.hide()

    },

    read:function(){
        this.model.set("is_read",1)
    },

    unread:function(){
        this.model.set("is_read",0)
    },

    isRead:function(){
        return this.model.get("is_read");
    },

    destroy: function () {
        this.remove()
    }
});
module.exports=View


