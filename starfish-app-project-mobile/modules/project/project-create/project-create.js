var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    PeopleSelectAll = require("modules/people-select/people-select-all/people-select-all.js"),
    FormName = require("../project-form/form-name/form-name.js"),
    FormIntro = require("../project-form/form-intro/form-intro.js"),
    point = require("modules-common/point/point.js");


var View = Backbone.View.extend({
    attributes: {
        class: "project-create"
    },

    initialize: function() {
        topBar.showTitle("创建项目");
        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            name: "保存",
            callback: $.proxy(this.projectCreate, this)
        }]);
        this.render();
        this.initEvent();
    },

    render: function() {
        var that = this;

        this.$el.append(__inline("project-create.html"));
        this.$form = this.$el.find(".JS-form");
        this.modules = {};

        this.modules.name = new FormName({
            type: "create"
        });
        this.modules.intro = new FormIntro({
            type: "create"
        });
        this.modules.person_in_charge = new PeopleSelectAll({
            type: "charge"
        });
        this.modules.person_in_charge.set(global.data.user.toJSON());
        this.modules.members = new PeopleSelectAll({
            type: "members"
        });

        this.$form.append(this.modules.name.$el);
        this.$form.append(this.modules.intro.$el);
        this.$form.append(this.modules.person_in_charge.$el);
        this.$form.append(this.modules.members.$el);

        global.$doc.append(this.$el);
    },

    initEvent: function() {
        var that = this;
        
    },

    projectCreate: function() {
        if (this.creating) {
            return;
        }
        var that = this;
        var data = this.get()

        if (data.name == "") {
            point.shortShow({
                type: "error",
                text: "项目名称不能为空",
                time: 2000
            });
            return;
        }

        that.creating = true;
        $.ajax({
            type: "POST",
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/projects",
            data: JSON.stringify(data),
            success: function(res) {
                if (res.errcode === 0) {
                    point.shortShow({
                        text: "创建成功"
                    });
                    that.back();
                } else {
                    point.shortShow({
                        text: res.errmsg
                    });
                }
            },
            error: function(res) {
                point.shortShow({
                    text: "请检查网络，稍后重试"
                });
            },
            complete: function() {
                that.creating = false;
            }
        })
    },

    get: function() {
        var data = {};
        $.each(this.modules, function(key, module) {
            data[key] = module.get();
        });

        return data;
    },

    back: function() {
        this.destroy();
        router.navigate('', {
            trigger: true
        });
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View;
