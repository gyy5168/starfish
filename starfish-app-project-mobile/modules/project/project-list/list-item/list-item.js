var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js");


var ItemView = Backbone.View.extend({
    tagName: "li",
    attributes: {
        class: "project-item"
    },
    template: __inline("list-item.tmpl"),

    initialize: function() {

        this.render();

    },

    render: function() {
        var data = this.model.toJSON(),
            obj = {};
        obj.name = data.name;
        this.$el.append(this.template(obj));
        this.$el.attr("data-id", data.id);
    }
});
module.exports = ItemView;
