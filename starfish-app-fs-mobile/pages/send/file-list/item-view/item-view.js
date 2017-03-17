var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    point = require("modules-common/point/point.js"),
    fileIcon = require("modules/file-icon/file-icon.js"),
    tools = require("modules-common/tools/tools.js"),
    topbar = require("modules-common/top-bar/top-bar.js"),
    file = require("modules-common/file/file.js");
router = require("../../router/router.js");


var View = Backbone.View.extend({
    tagName: "li",
    template: __inline("item-view.tmpl"),
    initialize: function(model) {
        this.render(model);
        this.initEvent();
    },
    render: function(model) {
        var modelData = this.model.toJSON(),
            data = {};

        data.name = modelData.name;
        data.date = tools.formatDate(new Date(modelData.date_updated * 1000), "yyyy-MM-dd HH:mm");
        data.size = "";

        // 设置文件图标
        if (modelData.is_file) {
            data.icon = fileIcon.getClassName(modelData.name);
        } else {
            data.icon = "file-folder";
        }

        //设置文件大小
        if (modelData.is_file) {
            data.size = tools.formatSize(modelData.size);
        }
        this.id = modelData.id
        this.$el.html(this.template(data));
    },

    initEvent: function() {
        var that = this
        this.$el.on("click", function() {
            var isFile = that.model.get("is_file");

            if (isFile) {
                file.openRemote({
                    url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +
                        "/file/files/" + that.model.get("id") + "/attachment",
                    mimeType: that.model.get("mimetype"),
                    fileName: that.model.get("name")
                });

                return;
            }

            topbar.showTitle(that.model.get("name"));
            router.navigate("share?type=parent&id=" + that.model.get("id"), {
                trigger: true
            });

        });
    },

    destroy: function() {
        this.remove();
    }
})
module.exports = View