var Backbone = require("modules-common/backbone/backbone.js"),
    Header = require("./header/header.js"),
    Container = require("./container/container.js"),
    DepartmentSelect = require("modules/department-select/department-select.js");

var View = Backbone.View.extend({
    attributes: {
        class: "manage-container"
    },

    initialize: function () {
        this.render();
        this.initEvent();
    },

    render: function () {
        this.$el = global.$doc;

        this.modules = {
            header: new Header(),
            container: new Container()
        };

        this.$el.append(this.modules.header.$el);
        this.$el.append(this.modules.container.$el);
    },

    initEvent: function () {
        //var that = this;
        //this.listenTo(global.event, "orgSwitch", function(){
        //    that.modules.container.destroy();
        //    that.modules.container = new Container();
        //    that.$el.append(that.modules.container.$el);
        //});
    },

    destroy: function(){
        this.modules.header.destroy();
        this.modules.container.destroy();
        this.remove();
    }
});

module.exports = View;