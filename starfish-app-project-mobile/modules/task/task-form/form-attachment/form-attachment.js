var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    _ = require("modules-common/underscore/underscore.js"),
    router = require("modules/routers/router.js"),
    point = require("modules-common/point/point.js"),
    confirm = require("modules-common/confirm/confirm.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    file = require("modules-common/file/file.js"),
    ItemView = require("./item-view/item-view.js");

var View = Backbone.View.extend({
    tagName: "form",
    attributes: {
        class: "form-attachment"
    },

    initialize: function(options) {
        this.attachmentList = new Backbone.Collection();
        this.uploadList = new Backbone.Collection();
        this.itemViews = [];
        this.prevTitle = topBar.getTitle();
        this.prevBack = topBar.getBack();
        this.prevMenu = topBar.getMenu();
        this.taskId = options.taskId || "";
        this.type = options.type || "create";
        this.render();
        this.initEvent();
    },

    render: function() {
        var that = this;

        this.$el.html(__inline("form-attachment.html"));
        this.$infoPanel = this.$el.find(".info-panel");
        this.$num = this.$infoPanel.find(".item-num");

        this.$modifyPanel = this.$el.find(".modify-panel");
        this.$addNew = this.$modifyPanel.find(".add-new-attachment");
        if (this.type == "create") {
            this.$modifyPanel.addClass("no-attachment");
        }
    },

    initEvent: function() {
        var that = this;

        this.$infoPanel.on("click", function() {
            that.showModifyPanel()
        });
        this.$addNew.on("click", function() {
            that.addNewAttachment()
        });
        this.listenTo(this.uploadList, "add", this.addItem);
        this.listenTo(this.uploadList, "remove", this.removeItem);

        this.listenTo(this.uploadList, "reset", function(models, options) {
            _.each(options.previousModels, function(model) {
                that.removeItem(model);
            });

            this.uploadList.each(function(model) {
                that.addItem(model);
            });
        });

        this.listenTo(this.uploadList, "add reset remove destroy", function() {
            if (this.uploadList.length === 0) {
                this.$modifyPanel.addClass("no-attachment")
            } else {
                this.$modifyPanel.removeClass("no-attachment")
            }
        });
    },

    set: function(attachments) {
        var that = this;
        $.each(attachments, function(index, item) {
            that.attachmentList.add({
                uuid: item.id,
                id: item.id,
                taskId: that.taskId,
                filename: item.filename,
                filesize: item.filesize,
                is_file: true,
                mimetype: item.mimetype,
                progress: 100,
                state: "saved",
                type: "saved"
            });
        });
        this.uploadList.reset(this.attachmentList.toJSON());
        // this.attachmentList.reset(attachments);
        this.$num.html(this.attachmentList.length || "");
        if (!attachments.length) {
            this.$modifyPanel.addClass("no-attachment");
        }
    },

    get: function() {
        var attachments = this.attachmentList.map(function(item) {
            var attach = {
                bfs_file_id: item.get("id"),
                name: item.get("filename")
            };
            return attach;
        });
        return attachments;
    },

    showModifyPanel: function() {
        var that = this;
        topBar.setTitle("附件");
        topBar.setBack($.proxy(this.back, this));
        topBar.showMenu([{
            name: "确定",
            callback: $.proxy(this.finishModify, this)
        }]);
        // this.uploadList.reset(this.attachmentList.toJSON());
        this.$modifyPanel.show();
        if (this.type == "detail") {
            $(".modify-container").html(this.$modifyPanel);
            this.$modifyPanel.show();
            $(".modify-container").show();
        }
    },

    hideModifyPanel: function() {
        this.$modifyPanel.hide();
        if (this.type == "detail") {
            $(".modify-container").html("");
            $(".modify-container").hide();
        }
    },

    addNewAttachment: function() {
        var that = this;
        file.selectFile(handle);

        function handle(data) {
            if (!data.length) {
                return;
            }
            $.each(data, function(index, obj) {
                upload(obj, "", "", "")
            })
        }

        function upload(obj, path, pathId, isReplace) {
            // 创建初始数据，添加到上传列表中
            obj.state = "wait";
            // obj.extra = {
            //     filePath: "",
            //     pathId: ""
            // };
            // 设置参数（参照调用框架的文件上传接口，需要传递的配制）
            var option = {
                uuid: obj.uuid,
                progress: function(respone) {
                    var model = that.uploadList.find(function(model) {
                        return model.get("uuid") == obj.uuid;
                    });

                    if (model) {
                        model.set("state", "progress");
                        model.set("progress", respone.progress);
                    }
                },

                success: function(respone) {
                    var model = that.uploadList.find(function(model) {
                        return model.get("uuid") == obj.uuid;
                    });
                    if (model) {
                        model.set("taskId", that.taskId);
                        model.set("id", respone.fileId);
                        model.set("state", "success");
                    }

                },

                error: function(respone) {
                    var model = that.uploadList.find(function(model) {
                        return model.get("uuid") == obj.uuid;
                    });

                    if (model) {
                        model.set("state", "error");
                    }
                }
            };
            obj.filename=obj.fileName;
            obj.filesize=obj.fileSize;
            that.uploadList.add(obj);
            file.upload(option);
        }
    },

    getItem: function(id) {
        var view = _.find(this.itemViews, function(view) {
            return id === view.model.get("uuid");
        });

        return view;
    },

    addItem: function(model, collection, options) {
        var view = new ItemView({
            uploadList: this.uploadList,
            model: model
        });
        this.$modifyPanel.find(".attachment-list").append(view.$el);
        this.itemViews.push(view);
    },

    removeItem: function(model) {
        var view = this.getItem(model.get("uuid")),
            that = this;

        if (model.get("type") == "saved") {
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + that.taskId + "/attachments/" + model.get("id"),
                type: "DELETE",
                success: function(response) {
                    if (response.errcode === 0) {
                        point.shortShow({
                            text: "附件：" + model.get("filename") + "已删除"
                        });

                        if (!view) {
                            return;
                        }
                        view.destroy();

                        _.find(that.itemViews, function(itemView, index) {
                            if (itemView === view) {
                                that.itemViews.splice(index, 1);
                                return true;
                            }
                        });
                        that.attachmentList.reset(that.uploadList.toJSON())
                    } else {
                        point.shortShow({
                            text: global.tools.getErrmsg(response.errcode)
                        });
                    }
                },
                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                }
            });
        } else {
            if (!view) {
                return;
            }
            view.destroy();

            _.find(that.itemViews, function(itemView, index) {
                if (itemView === view) {
                    that.itemViews.splice(index, 1);
                    return true;
                }
            });
        }
    },

    finishModify: function() {
        var that = this;
        var submitList = [],
            uploadingList = [],
            uploadingNum = 0;

        if (this.type == "create") {
            this.attachmentList.reset(this.uploadList.toJSON());
            this.back();
            return;
        }
        this.uploadList.each(function(model) {
            if (model.get("id")) {
                if (model.get("state") != "saved") {
                    submitList.push({
                        bfs_file_id: model.get("id"),
                        name: model.get("filename")
                    })
                }

            } else {
                uploadingList.push({
                    uuid: model.get("uuid"),
                    name: model.get("filename")
                })
                uploadingNum++;
            }
        })
        if (uploadingNum > 0) {
            confirm.show({
                type: "long",
                text: "还有" + uploadingNum + "个附件未上传完毕，是否继续？",
                okCallback: handleAjax
            });
        } else {
            handleAjax();
        }

        function handleAjax() {
            $.each(uploadingList, function(index, item) {
                var model = that.uploadList.findWhere({
                    uuid: item.uuid
                })
                that.uploadList.remove(model);
            })
            $.ajax({
                url: global.data.org.get("domain") + "/orgs/" + global.data.org.id + "/project/tasks/" + that.taskId + "/attachments",
                type: "POST",
                data: JSON.stringify(submitList),
                success: function(response) {
                    if (response.errcode === 0) {
                        $.each(submitList, function(index, item) {
                            that.uploadList.remove({
                                id: item.bfs_file_id
                            });
                        });
                        $.each(response.data, function(index, item) {
                            item.taskId=that.taskId;
                            item.uuid=item.id;
                            item.is_file=true;
                            item.state="saved";
                            item.type="saved";
                            that.uploadList.add(item);
                        });
                        that.trigger("change", {
                            attachments: that.uploadList.toJSON()
                        });
                        that.attachmentList.reset(that.uploadList.toJSON());
                        that.back();
                    } else {
                        point.shortShow({
                            text: global.tools.getErrmsg(response.errcode)
                        });
                    }
                },
                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                }
            });
        }

    },

    back: function() {
        this.hideModifyPanel();
        this.$num.html(this.attachmentList.length || "");
        topBar.showTitle(this.prevTitle);
        topBar.showMenu(this.prevMenu);
        topBar.setBack(this.prevBack);
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View;
