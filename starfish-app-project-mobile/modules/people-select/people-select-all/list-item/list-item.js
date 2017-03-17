var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js");

var ItemView = Backbone.View.extend({
    tagName: "li",
    attributes: {
        class: "member-item"
    },
    template: __inline("list-item.tmpl"),
    initialize: function() {

        this.render();

        //this.listenTo(this.model, "change", this.render);
    },



    render: function() {
        var data = this.model.toJSON();

        data.item_type_class=(data.item_type==1)?"depart":"people";
        this.$el.append(this.template(data));

    }
});
module.exports = ItemView;
