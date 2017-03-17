var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    _ = require("modules-common/underscore/underscore.js"),
    FileList = require("./file-list/file-list.js"),
    router = require("modules-common/router/router.js"),
    point = require("modules-common/point/point.js"),
    UploadState = require("./upload-state/upload-state.js"),
    fileDirectory = require("modules/file-directory/file-directory.js"),
    topBar = require("modules-common/top-bar/top-bar.js");

//添加文件系统删除、新建文件夹、上传、上传管理、发送、移动、显示之前的上传数据的功能
require("modules/operate-modules/remove/remove.js");
require("modules/operate-modules/new-folder/new-folder.js");
require("modules/operate-modules/upload/upload.js");
require("modules/operate-modules/send/send.js");
require("modules/operate-modules/recovery-file/recovery-file.js");
require("modules/operate-modules/move/move.js");
require("modules/operate-modules/upload-manage/upload-manage.js");

var View = Backbone.View.extend({
    attributes: {
        class: "home"
    },

    initialize: function () {
        global.data.dirNameCache = new Backbone.Model();
        global.data.dirNameCache.set(0, "文件系统");
        this.render();
        this.initSelectEvent();
        this.initFootbarEvent();

        topBar.setBack(_.bind(this.back, this));
        topBar.setMenu([]);
    },

    render: function () {
        var that = this;
        this.$el.append(__inline("home.html"));
        this.$bd = this.$el.find(".JS-bd");
        this.$ft = this.$el.find(".JS-ft");
        this.$upload = this.$ft.find(".JS-upload");
        this.$newFolder = this.$ft.find(".JS-new-folder");
        this.$remove = this.$ft.find(".JS-remove");
        this.$send = this.$ft.find(".JS-send");
        this.$move = this.$ft.find(".JS-move");

        this.modules = {};
        this.modules.uploadState = new UploadState({
            parentView: that
        });
        this.modules.fileList = new FileList({
            parentView: that
        });
        this.$bd.append(this.modules.uploadState.$el);
        this.$bd.append(this.modules.fileList.$el);

        global.$doc.append(this.$el);
    },

    initSelectEvent: function () {
        var that = this;

        // 根据是否有选中文件, 来切换底部操作菜单, 更改标题
        this.listenTo(this.modules.fileList, "selectSome selectAll", function () {
            that.changeFootbar("action2");

            // 显示选择了多少文件
            var len = that.modules.fileList.getSelect().length,
                title = len <= 99 ? "已选择" + len + "个文件" : "已选择99+个文件";
            topBar.setTitle(title);
        });

        // 根据是否有选中文件, 来切换底部操作菜单, 更改标题
        this.listenTo(this.modules.fileList, "noSelect", function () {
            that.changeFootbar("action1");

            // 显示当前目录的名字
            var name = global.data.dirNameCache.get(that.dirId);
            topBar.setTitle(name);
            topBar.setMenu([]);
        });

        // 当文件列表一个或者多个被选中， topbar 显示全选
        this.listenTo(this.modules.fileList, "selectSome", function () {
            topBar.setMenu([{
                name: "全选",
                callback: function () {
                    that.modules.fileList.selectAll()
                }
            }]);
        });

        // 当文件列表全部被选中， topbar 显示全不选
        this.listenTo(this.modules.fileList, "selectAll", function () {
            topBar.setMenu([{
                name: "全不选",
                callback: function () {
                    that.modules.fileList.unSelectAll()
                }
            }]);
        });

    },

    initFootbarEvent: function () {
        var that = this;

        this.$upload.on("click", function () {
            global.event.trigger("upload");
        });

        this.$newFolder.on("click", function () {
            global.event.trigger("newFolder", {
                id: fileDirectory.getCurrentId()
            });
        });

        this.$remove.on("click", function () {
            var data = that.modules.fileList.getSelect();
            that.modules.fileList.unSelectAll();
            global.event.trigger("remove", data);
        });

        this.$send.on("click", function () {
            var data = that.modules.fileList.getSelect();
            that.modules.fileList.unSelectAll();
            global.event.trigger("send", data);
        });

        this.$move.on("click", function () {
            var data = that.modules.fileList.getSelect();
            that.modules.fileList.unSelectAll();
            global.event.trigger("move", data, that.dirId);
        });

    },

    back: function () {
        if (this.dirId === 0) {
            global.starfishBridge("finish");
        } else {
            history.back();
        }
    },

    showUploadState: function () {
        this.$bd.addClass("upload-state-show");
    },

    hideUploadState: function () {
        this.$bd.removeClass("upload-state-show");
    },

    show: function () {
        this.$el.show();
    },

    hide: function () {
        this.$el.hide();
    },

    // 更换底部操作，action1代表上传和新建；action2代表发送、删除；
    changeFootbar: function (flag) {
        if (this.$ft.hasClass(flag)) {
            return;
        }
        this.$ft.removeClass("action1 action2");
        this.$ft.addClass(flag);
    },

    set: function (id) {
        if (this.dirId === id) {
            return;
        }
        this.dirId = id;

        // 重置UI
        topBar.showMenu([]);
        topBar.setTitle(global.data.dirNameCache.get(id));

        this.changeFootbar("action1");
        this.modules.fileList.set(id);
    },

    destroy: function () {
        this.modules.uploadState.destroy();
        this.modules.fileList.destroy();
        this.remove();
    }

});

module.exports = View;