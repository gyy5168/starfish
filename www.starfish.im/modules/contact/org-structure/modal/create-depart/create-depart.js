var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    Modal = require("modules-common/modal/modal.js"),
    point = require("modules-common/point/point.js");

var View = Modal.extend({

    attributes: {
        "class": "create-depart-modal"
    },

    title: "创建部门",

    content: __inline("create-depart.html"),

    initialize: function(option) {
        View.__super__.initialize.call(this);

        this.render();
        this.initEvent();
        this.set(option);
    },

    render: function() {
        View.__super__.render.call(this);
        this.$ok = this.$el.find(".JS-ok");
        this.$input = this.$el.find(".JS-input");
        this.$content = this.$el.find(".JS-content");
        this.$cancel = this.$el.find(".JS-modal-close");
        this.$error = this.$el.find(".JS-error");
        this.$error.hide();
    },

    initEvent: function() {
        var that = this;
        View.__super__.initEvent.call(this);
        this.$ok.on("click", function() {
            that.createDepart();
        });

        this.$cancel.on("click", function() {
            that.cancelCallback && that.cancelCallback();
        });

        this.$input.blur(function() {
            if ($(this).val()) {
                that.$error.hide();
            } else {
                that.$error.show();
            }
        });
        this.$input.on("focus", function() {
            that.$error.hide();
        });
    },

    set: function(option) {
        option = option || {};
        this.callback = option.callback;
        this.hideCallback = option.hideCallback;
        this.cancelCallback = option.cancelCallback;
        this.parentOrgId = option.parentOrgId;
        // this.$content.html(option.text);
        this.hideDestroy = option.hideDestroy;
        this.setTitle(option.title || this.title);
    },

    createDepart: function() {
        var that = this;
        var data = {
            members: [],
            name: that.$el.find("input").val(),
            parent: that.parentOrgId
        }
        if (data.name == "") {
            this.$error.show();
            // this.$input.focus();
            return;
        }
        $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/departments",
            type: "POST",
            data: JSON.stringify(data),
            success: function(response) {
                that.hide();
                that.callback && that.callback(response.data);
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
