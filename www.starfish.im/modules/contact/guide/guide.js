var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    Modal = require("modules-common/modal/modal.js"),
    point = require("modules-common/point/point.js");

var View = Modal.extend({

    attributes: {
        "class": "guide-modal"
    },

    title: "提示",

    content: __inline("guide.html"),

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
            var guideArr = localStorage.guideList.split(","),
            currentOrgID=String(global.data.currentOrg.get("id"));

            guideArr.splice(guideArr.indexOf(currentOrgID),1);

            localStorage.guideList=guideArr;

            that.destroy();
            that.callback && that.callback();
        });

        this.$cancel.on("click", function() {
            that.cancelCallback && that.cancelCallback();
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
