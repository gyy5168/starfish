var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js");

var View = Backbone.View.extend({
    attributes: {
        class: "crumb-list-wrapper"
    },

    template: __inline("crumb-list.tmpl"),

    crumbPointTemplate: __inline("crumb-point.tmpl"),

    initialize: function (option) {
        this.list = new Backbone.Collection();
        this.itemViews = [];
        this.parentView = option.parentView;

        this.render();
        this.initEvent();
    },

    render: function () {
        this.$el.html(__inline("crumb-list.html"));
        this.$list = this.$el.find(".JS-move-hd-list");
    },

    initEvent: function () {
        var that = this;
        this.$el.on("click", "li", function () {
            var id = $(this).data("id");
            that.parentView.set(id);
        });
    },

    set: function (list) {
        var that = this;
        this.$list.html("");
        this.list.reset(list);
        this.$list.append(that.template({list: list}));
        this.needWrap();
    },

    needWrap: function () {
        var that = this,
            elWidth = that.$el.width(),
            liWidth,
            id,
            pdLeft = that.$el.css("padding-left");


        //递归删除宽度比较大的li
        that.$el.find(".crumb-point").remove();
        handle();
        function handle() {
            var liWidth = 0;
            that.$list.find("li").each(function () {
                liWidth += $(this).width()
            });

            if (elWidth < liWidth + parseInt(pdLeft)) {
                that.$el.find(".crumb-point").remove();
                var dom = that.$list.find("li").eq(-2);
                id = dom.data("id");
                dom.remove();
                that.$list.find("li").last().before(that.crumbPointTemplate({id: id}));
                handle();
            }
        }
    },

    get: function () {
        return this.list.toJSON();
    },

    destroy: function () {
        this.list.reset([]);
        this.remove();
    }
});
module.exports = View;