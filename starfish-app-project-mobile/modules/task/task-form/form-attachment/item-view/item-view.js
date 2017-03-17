var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    fileIcon = require("../file-icon/file-icon.js"),
    file = require("modules-common/file/file.js");

// var uploadList = global.data.uploadList || (global.data.uploadList = new Backbone.Collection());

var View = Backbone.View.extend({

    template: __inline("item-view.tmpl"),

    attributes: {
        class: "file-list-item"
    },

    initialize: function(opts) {
        this.uploadList = opts.uploadList;
        this.render();
        this.initEvent();
        this.changeState();
        this.changeProgress();
    },

    render: function() {
        var modelData = this.model.toJSON(),
            data = {};

        data.type = modelData.type || "";
        data.name = modelData.filename;
        data.size = this.formatSize(modelData.filesize);

        // 设置文件图标
        data.icon = fileIcon.getClassName(modelData.filename);

        this.$el.html(this.template(data));
        if (data.type) {
            this.$el.addClass(this.model.get("state"));
        }
        this.$progressInner = this.$el.find(".JS-progress-inner");
        this.$progressNum = this.$el.find(".JS-progress-num");
        this.$remove = this.$el.find(".JS-remove");
    },

    initEvent: function() {
        var that = this;

        this.listenTo(this.model, "change:state", function(model, value) {
            that.changeState();
        });

        this.listenTo(this.model, "change:progress", function(value) {
            that.changeProgress();
        });

        this.$remove.on("click", function() {
            var isUploaded = ((that.model.get("state") === "success") || (that.model.get("state") === "saved"));
            // 如果没有上传成功,则取消上传
            if (!isUploaded) {
                file.cancelUpload({
                    uuid: that.model.get("uuid")
                });
            }
            that.uploadList.remove(that.model);
            event.stopPropagation();
        });
        this.$el.on("click", function () {
            var isFile = that.model.get("is_file");
            if (isFile) {
                file.openRemote({
                    url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") +
                    "/project/tasks/"+that.model.get("taskId")+"/attachments/" + that.model.get("uuid") + "/attachment",
                    mimeType: that.model.get("mimetype"),
                    filename: that.model.get("filename"),
                    filesize: that.model.get("filesize")
                });
                
                return;
            }
        });

    },

    changeState: function() {
        this.$el.removeClass("wait success error progress");
        this.$el.addClass(this.model.get("state"));
    },

    changeProgress: function() {
        var value = this.model.get("progress") || 0;
        this.$progressInner.css("width", value + "%");
        this.$progressNum.html(value + "%");
    },
    formatSize: function(bytes) {
        if (bytes == 0) {
            return "0 B";
        }
        var s = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        var e = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(e))).toFixed(1) + " " + s[e];
    },
    destroy: function() {
        this.remove();
    }
});


module.exports = View;
