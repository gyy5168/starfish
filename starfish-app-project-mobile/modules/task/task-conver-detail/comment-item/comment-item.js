var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    router = require("modules/routers/router.js");


var ItemView = Backbone.View.extend({
    tagName: "li",
    attributes: {
        class: "comment-item"
    },
    template: __inline("comment-item.tmpl"),
    initialize: function() {
        this.render();
    },

    render: function() {
        var data = this.model.toJSON();
        data.time = this.dateFormat(data.date_added);
        this.$el.append(this.template(data));
    },
    dateFormat: function(utc) {
        var date = new Date(utc * 1000);
        var dateFormat = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
        var today = new Date();
        var todayFormat = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
        var hour = date.getHours(),
            minute = date.getMinutes();
        hour=(hour>10)?hour:("0"+hour);
        minute=(minute>10)?minute:("0"+minute);
        var time = (dateFormat == todayFormat) ? (hour + ":" + minute) : dateFormat;
        return time;
    }
});
module.exports = ItemView;
