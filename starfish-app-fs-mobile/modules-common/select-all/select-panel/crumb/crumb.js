var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    _ = require("modules-common/underscore/underscore.js");

var View = Backbone.View.extend({

    tagName: "ul",

    template: __inline("item.tmpl"),

    attributes: {
        "class": "crumb-list"
    },

    initialize: function (option) {
        this.parentView = option.parentView;
        this.list = new Backbone.Collection();
        this.itemViews = [];
        this.render();
        this.initClickEvent();
    },

    render: function () {

    },

    set: function (list) {
        var that = this;
        this.$el.html("");
        this.$el.append(that.template({list: list}));
        this.needWrap();
    },

    needWrap: function () {
        var that = this;
        var ulWidth = that.$el.width(),
            liWidth,
            pdLeft = this.$el.css('padding-left'),
            crumbPoint = $('<li class="crumb-point JS-crumb-item"><span>...></li>');

        handle();
        function handle() {
            liWidth = 0;
            that.$el.find(".JS-crumb-item").each(function () {
                liWidth += $(this).width()
            });

            if (liWidth + parseInt(pdLeft) > ulWidth) {
                that.$el.find(".crumb-point").remove();
                that.$el.find(".JS-crumb-item").eq(-2).remove()
                that.$el.find(".JS-crumb-item").last().before(crumbPoint);
                handle();
            }
        }
    },

    initClickEvent: function () {
        var that = this;
        this.$el.on("click", '.JS-crumb-item', function () {
            var index = $(this).index();
            that.parentView.dirStack = that.parentView.dirStack.splice(0, index + 1);
            var department = that.parentView.dirStack[that.parentView.dirStack.length - 1];
            that.parentView.setData(department);
        });
        return false
    },

    destroy: function () {
        this.remove();
    }
});

module.exports = View;