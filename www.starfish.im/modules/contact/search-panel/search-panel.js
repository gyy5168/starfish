var _=require("modules-common/underscore/underscore.js"),
    $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    People=require("./search-people/search-people.js"),
    Department=require("./search-department/search-department.js"),
    FloatPanel=require("./float-panel/float-panel.js");

var View=Backbone.View.extend({
    attributes:{
        class:"search-panel"
    },
    initialize:function(){
        this.render();
        this.initEvent();
    },
    render:function(){
        this.$el.html(__inline("search-panel.html"));
        this.$content=this.$el.find(".JS-search-content");
        this.$head=this.$el.find(".JS-search-head");
        this.$back=this.$el.find(".JS-search-back");
        this.$keyPeople=this.$el.find(".JS-keyword-people");
        this.$keyDepartment=this.$el.find(".JS-keyword-department");

        this.modules={
            people:new People(),
            department:new Department(),
            floatPanel:new FloatPanel({})
        };

        this.$content.append(this.modules.people.$el);
        this.$content.append(this.modules.department.$el);
        this.$el.append(this.modules.floatPanel.$el);

    },
    initEvent:function(){
        var that=this;
        this.$keyPeople.on("click",function(){
            that.set({
                type:"all",
                keyword:that.keyword
            });

            return false
        });

        this.$keyDepartment.on("click",function(){
            that.set({
                type:"other",
                keyword:that.keyword
            });

            return false
        });

        this.$back.on("click",function(){

            that.trigger("back");
            that.modules.floatPanel.goRight()
            return false;
        })

        this.$el.on("click",function(){
            that.modules.floatPanel.goRight();
        })

        this.listenTo(this.modules.department,'set',function(data){
            that.modules.floatPanel.set({
                type:"department",
                model:new Backbone.Model(data),
                data:data
            })
        });

        this.listenTo(this.modules.people,'set',function(data){
            that.modules.floatPanel.set({
                type:"people",
                model:new Backbone.Model(data),
                data:data
            })
        })
    },

    set:function(option){
        this.keyword=option.keyword;

        this.$head.find("span").text(this.keyword);

        this.$keyPeople.removeClass("active");
        this.$keyDepartment.removeClass("active");
        this.modules.floatPanel.goRight();
        switch (option.type){
            case "member":
                this.$keyPeople.addClass("active");
                this.setPeople(option);
                return;
            case "depart":
                this.$keyDepartment.addClass("active");
                this.setDepartment(option);
                return;
            case "all":
                this.$keyPeople.addClass("active");
                this.searchPeople();
                return
            case "other":
                this.$keyDepartment.addClass("active");
                this.searchDepartment();
        }
    },

    setPeople:function(option){
        this.modules.people.show();
        this.modules.people.set(option.data);
        this.modules.department.hide();
    },

    setDepartment:function(option){
        this.modules.department.show()
        this.modules.department.set(option.data);
        this.modules.people.hide()
    },

    searchDepartment:function(){
        this.modules.department.show();
        this.modules.people.hide();
        this.modules.department.search(this.keyword)
    },

    searchPeople:function(){
        this.modules.department.hide();
        this.modules.people.show();
        this.modules.people.search(this.keyword);

    },

    show:function(){
        this.$el.show();
    },

    hide:function(){
        this.$el.hide();
    },

    destroy:function(){
        this.remove();
    }
});
module.exports=View;