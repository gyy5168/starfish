var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js"),
    PeopleSelectAll = require("modules/people-select/people-select-all/people-select-all.js"),
    FormName = require("../project-form/form-name/form-name.js"),
    FormIntro = require("../project-form/form-intro/form-intro.js"),
    point = require("modules-common/point/point.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    confirm = require("modules-common/confirm/confirm.js"),
    Autosize = require("modules-common/autosize/autosize.js");

var View = Backbone.View.extend({
    tagName: "div",
    attributes: {
        class: "project-detail"
    },

    initialize: function(options) {
        this.model = global.data.projectList.get(parseInt(options.id));
        topBar.showTitle(this.model.get("name"));
        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            name: "保存",
            callback: $.proxy(this.projectModify, this)
        }]);
        
        this.render();
        this.initEvent();
    },

    render: function() {
        var that = this;
        var data = this.model.toJSON();
        this.$el.append(__inline("project-detail.html"));
        this.$form = this.$el.find(".JS-form");
        this.modules = {};

        this.modules.name = new FormName({
            type: "detail"
        });
        this.modules.name.set(data.name);
        this.modules.intro = new FormIntro({
            type: "detail"
        });
        this.modules.intro.set(data.intro);
        this.modules.person_in_charge = new PeopleSelectAll({
            type: "charge"
        });
        this.modules.person_in_charge.set(data.person_in_charge_info);
        this.modules.members = new PeopleSelectAll({
            type: "members"
        });
        this.modules.members.set(data.members_info);

        this.$form.append(this.modules.name.$el);
        this.$form.append(this.modules.intro.$el);
        this.$form.append(this.modules.person_in_charge.$el);
        this.$form.append(this.modules.members.$el);

        global.$doc.append(this.$el);
        Autosize($('textarea'));
    },

    initEvent: function() {
        var that = this;
        this.$el.on("click", '.JS-close', function() {
            that.closeProject()
        });
    },

    projectModify: function() {
        var that = this;
        var data = this.get();
        if (data.name == "") {
            point.shortShow({
                type: "error",
                text: "项目名称不能为空",
                time: 2000
            });
            return;
        }
        $.ajax({
            type: "PATCH",
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/projects/" + that.model.get("id"),
            data: JSON.stringify(data),
            success: function(response) {

                if (response.errcode === 0) {
                    that.back();
                } else {
                    point.shortShow({
                        "text": global.tools.getErrmsg(response.errcode)
                    })
                }
            },
            error: function() {
                point.shortShow({
                    text: global.texts.netError
                });
            }
        });

    },

    get: function() {
        var data = {};
        $.each(this.modules, function(key, module) {
            data[key] = module.get();
        });

        return data;
    },

    closeProject: function() {
        var that = this;
        confirm.show({
            type: "long",
            text: "关闭项目后，该项目将被隐藏，目前隐藏的项目将不能重新开启，是否继续？",
            okCallback: handleAjax
        });

        function handleAjax() {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/projects/" + that.model.get("id"),
                type: "PATCH",
                data: JSON.stringify({
                    "is_closed": 1
                }),
                success: function(response) {
                    if (response.errcode === 0) {
                        that.back();
                    } else if (response.errcode === 4) {
                        point.shortShow({
                            "text": global.tools.getErrmsg(response.errcode)
                        })
                    }
                },
                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                }
            });
        }
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
