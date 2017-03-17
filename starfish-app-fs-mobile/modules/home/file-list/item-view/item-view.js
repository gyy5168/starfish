var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    tools = require("modules-common/tools/tools.js"),
    router = require("modules-common/router/router.js"),
    fileIcon = require("modules/file-icon/file-icon.js"),
    file = require("modules-common/file/file.js");

var View = Backbone.View.extend({

    template: __inline("item-view.tmpl"),

    attributes: {
        class: "file-list-item"
    },

    initialize: function () {
        this.render();
        this.initEvent();
    },

    render: function () {
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

        data.isImage = false;
        if (data.icon === "file-image") {
            data.isImage = true;
            data.url = global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +
                "/file/files/" + modelData.id + "/attachment?width=70&height=70";
        }
        //设置文件大小
        if (modelData.is_file) {
            data.size = tools.formatSize(modelData.size);
        }
        this.$el.html(this.template(data));
    },

    initEvent: function () {
        var that = this;

        this.listenTo(this.model, "change:selected", function (model, value) {
            if (value) {
                that.$el.addClass("selected");
            } else {
                that.$el.removeClass("selected");
            }
        });

        this.$el.find(".JS-checkbox").on("click", function (event) {
            that.model.set("selected", !that.model.get("selected"));
            event.stopPropagation();
        });

        this.$el.on("click", function () {
            var isFile = that.model.get("is_file");

            if (isFile) {
                file.openRemote({
                    url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +
                    "/file/files/" + that.model.get("id") + "/attachment",
                    mimeType: that.model.get("mimetype"),
                    fileName: that.model.get("name"),
                    fileSize: that.model.get("size")
                });
                return;
            }

            global.data.dirNameCache.set(that.model.get("id"), that.model.get("name"));
            router.navigate("dir/" + that.model.get("id"), {trigger: true});
        });
    },

    destroy: function () {
        this.remove();
        this.model.unset("selected");
    }

});


module.exports = View;

