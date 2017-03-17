var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    tools = require("modules-common/tools/tools.js"),
    fileDirectory = require("modules/file-directory/file-directory.js"),
    fileIcon = require("modules/file-icon/file-icon.js");

var View = Backbone.View.extend({
    tagName: "li",

    template: __inline("item-view.tmpl"),

    initialize: function (model) {
        this.render();
    },

    render: function () {
        var modelData = this.model.toJSON(),
            data = {};

        data.name = modelData.name;
        data.date = tools.formatDate(new Date(modelData.date_updated * 1000), "yyyy-MM-dd HH:mm");
        data.size = "";

        if (!fileDirectory.isAllow("upload", modelData.permissions)) {
            this.$el.addClass("unable-move");
        }

        this.$el.attr("data-id", modelData.id);
        data.icon = "file-folder";
        this.$el.html(this.template(data));
    },

    isFile: function () {
        return !!this.model.get("is_file");
    },

    destroy: function () {
        this.remove();
    }
});
module.exports = View;