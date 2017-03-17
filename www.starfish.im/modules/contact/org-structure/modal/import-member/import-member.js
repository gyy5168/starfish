var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    Modal = require("modules-common/modal/modal.js"),
    point = require("modules-common/point/point.js");

var View = Modal.extend({

    attributes: {
        "class": "import-member-modal"
    },

    title: "删除部门",

    content: __inline("import-member.html"),

    initialize: function(option) {
        View.__super__.initialize.call(this);

        this.render();
        this.initEvent();
        this.set(option);
    },

    render: function() {
        View.__super__.render.call(this);
        this.$ok = this.$el.find(".JS-ok");
        this.$download = this.$el.find(".JS-download");
        this.$upload = this.$el.find(".JS-upload");
        this.$input = this.$el.find(".JS-input");
        this.$content = this.$el.find(".JS-content");
        this.$cancel = this.$el.find(".JS-modal-close");
    },

    initEvent: function() {
        var that = this;
        View.__super__.initEvent.call(this);
        this.$download.on("click", function() {
            window.open(location.origin+"/static/members.xlsx");
        });

        this.$input.on("change", function() {
            alert("上船喽")
        });
    },

    set: function(option) {
        option = option || {};
        this.callback = option.callback;
        this.hideCallback = option.hideCallback;
        this.cancelCallback = option.cancelCallback;
        this.orgId = option.orgId;
        this.$input.val(option.orgName);
        this.hideDestroy = option.hideDestroy;
    },

    createDepart: function() {
        var that = this;
        var data = {
            is_disbanded: 1
        };
        $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/departments/" + that.orgId,
            type: "PATCH",
            data: JSON.stringify(data),
            success: function(response) {
                that.hide();
                if (response.errcode === 74) {
                    point.shortShow({
                        "text": "该部门存在子部门或子成员，无法删除该部门"
                    });

                    return;
                }
                that.callback && that.callback();
            },
            
            error: function() {
                point.shortShow({
                    "text": global.texts.netError
                });
            },

            complete: function() {

            }
        })
    },

    show: function(option) {
        View.__super__.show.call(this);
        if (option) {
            this.set(option);
        }
    },

    hide: function() {
        View.__super__.hide.call(this);
        if (this.hideDestroy) {
            this.destroy();
        }
        this.hideCallback && this.hideCallback();
    }
});

var result = {
    show: function(option) {
        option = option || {};
        // 隐藏摧毁组件
        option.hideDestroy = true;
        this.confirm = new View(option);
        this.confirm.show();
    },

    hide: function() {
        this.confirm && this.confirm.hide();
    }
};

module.exports = result;
