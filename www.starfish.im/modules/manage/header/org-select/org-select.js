/*
* 组织切换
* */
var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({

    attributes:{
        class:"manage-org-select"
    },

    template:__inline("org-select-items.tmpl"),

    initialize: function(){
        this.list = global.data.orgList;

        // 默认值设为组织列表的第一个组织
        this.value = this.list.first().get("id");

        this.render();
        this.renderLabel();
        this.renderList();
        this.initClickEvent();
        this.initListEvent();

        if ( localStorage && localStorage.currentOrgId ) {
            var org = this.list.get(localStorage.currentOrgId);

            if ( org ) {
                this.select(org.get("id"));
                global.data.currentOrg = org;
            } else {
                global.data.currentOrg = this.list.first();
            }

        } else {
            global.data.currentOrg = this.list.first();
        }
    },

    render: function(){
        this.$el.html(__inline("org-select.html"));
        this.$orgName = this.$el.find(".JS-org-name");
        this.$orgLogo = this.$el.find(".JS-org-logo");
        this.$arrow = this.$el.find(".JS-arrow");
        this.$orgList = this.$el.find("ul");
    },

    // 渲染label
    renderLabel: function(){
        var obj = this.list.get( this.value ).toJSON();
        this.$orgName.html(obj.name);
        this.$orgLogo.attr("src", obj.avatar);
    },

    // 渲染下拉列表
    renderList: function(){
        this.$orgList.html(this.template({list:this.list.toJSON()}));
    },

    initClickEvent: function(){
        var that = this;

        //点击label
        this.$el.on("click", function(event){
            that.$orgList.toggle();
            that.$arrow.toggle();
            event.stopPropagation();
        });

        // 点击组织列表
        this.$orgList.on("click", "li", function(){
            that.select( $(this).data("id") );
        });

        // 点击空白处,隐藏列表
        this.docHandle = function(){
            that.$arrow.hide();
            that.$orgList.hide();
        };
        global.$doc.on("click.orgList", this.docHandle );

    },

    initListEvent: function(){
        var that = this;
        this.listenTo(this.list, "add", function(){
            that.renderList();
        });

        this.listenTo(this.list, "change", function(model){
            // 如果当前组织改变, 需要重新渲染label, 并抛出事件
            if ( that.value === model.get("id") ) {
                that.renderLabel();
                that.trigger("orgModify");
            }
            that.renderList();
        });
    },

    get: function(){
        return this.list.get(this.value).toJSON();
    },

    select: function(id){
        if( this.value === id ) {
            return;
        }

        if ( localStorage ) {
            localStorage.currentOrgId = id;
        }
        this.value = id;
        this.renderLabel();
        global.data.currentOrg = this.list.get(this.value);
        //组织切换时抛出组织切换事件
        this.trigger("orgSwitch");
    },

    destroy: function(){
        this.remove();
        global.$doc.off("click.orgList", this.docHandle );
    }

});

module.exports = View;