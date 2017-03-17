var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    point = require("modules-common/point/point.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    confirm = require("modules-common/confirm/confirm.js"),
    CrumbList = require("./crumb-list/crumb-list.js"),
    FileList = require("./file-list/file-list.js"),
    tools = require("modules-common/tools/tools.js");

require("modules/operate-modules/new-folder/new-folder.js");

var View = Backbone.View.extend({
    attributes: {
        class: "move-panel"
    },

    pageSize: 30,

    initialize: function (list, sourceId) {
        this.selectList = list;
        this.sourceId = sourceId;
        this.render();
        this.initEvent();
        this.set(0);
    },

    render: function () {
        var that = this;
        this.$el.html(__inline("move.html"));
        this.$hd = this.$el.find(".JS-move-hd");
        this.$bd = this.$el.find(".JS-move-bd");
        this.$ft = this.$el.find(".JS-move-ft");
        this.$newFolder = this.$ft.find(".JS-new-folder");
        this.$startMove = this.$ft.find(".JS-start-move");

        that.$loadInfo = this.$el.find(".JS-load-info");
        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$errorTxt = this.$error.find(".JS-common-text");


        this.modules = {};

        this.modules.fileList = new FileList({
            parentView: this
        });
        this.$bd.append(this.modules.fileList.$el);
        this.modules.crumbList = new CrumbList({
            parentView: this
        });
        this.$hd.append(this.modules.crumbList.$el);

        this.prevBack = topBar.getBack();
        this.prevTitle = topBar.getTitle();
        this.prevMenu = topBar.getMenu();

        topBar.setBack(_.bind(this.back, this));
        topBar.setTitle("选择存储位置");

        topBar.setMenu({
            name: "取消",
            callback: function () {
                that.destroy()
            }
        });

        global.$doc.append(this.$el);
    },

    initEvent: function () {

        var that = this;

        this.$newFolder.on("click", function () {
            global.event.trigger("newFolder", {
                id: that.id
            });
        });

        this.$error.on("click", function () {
            that.set(that.id);
        });

        //未重名文件和重名又覆盖的文件数组
        this.moveList = [];
        this.$startMove.on("click", function () {

            if (that.sourceId == that.id) {
                point.shortShow({
                    text: "文件已在该目录",
                    time: 1000
                });
                return;
            }

            var fileList = that.modules.fileList.get(),
                selectList = that.selectList;

            //将文件分成重名的文件和未重名的文件
            var files = seperateFile(fileList, selectList),
                noDupNameFile = files.noDupName,
                dupNameFile = files.dupName;

            if (noDupNameFile.length) { //获取没有重名的文件
                _.each(noDupNameFile, function (obj) {
                    that.moveList.push(obj)
                });
            }

            if (dupNameFile.length) { //获取重名了的文件
                //递归获取想要覆盖的文件项
                askCover();
            } else {
                that.move();
            }

            function askCover() {
                var f = dupNameFile.shift();
                confirm.show({
                    text: "当前文件夹内\"" + f.name + "\"已存在，是否确认覆盖？",
                    okCallback: function () {
                        that.moveList.push(f);
                        dupNameFile.length ? askCover() : that.move();
                    },
                    cancelCallback: function () {
                        dupNameFile.length ? askCover() : that.move();
                    }
                });
            }
        });


        function seperateFile(fileList, selectList) {
            var same = [],
                noSame = [];

            _.each(selectList, function (obj1, i) {
                var check = false;
                _.each(fileList, function (obj2, j) {
                    if (obj1.name == obj2.name) {
                        check = true
                    }
                });
                check ? same.push(obj1) : noSame.push(obj1)
            });

            return {
                noDupName: noSame,
                dupName: same
            };
        }
    },

    move: function () {
        var that = this;

        if (that.moving) {
            return
        }
        that.moving = true;

        if (!that.moveList.length) {
            point.shortShow({
                text: "已取消移动"
            });
            that.destroy();
            return;
        }

        var ids = [];
        _.each(that.moveList, function (obj) {
            ids.push(obj.id)
        });

        ids = ids.join(",");
        point.show({
            text: "移动中",
            type: "loading"
        });

        return $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files/" + ids,
            type: "PATCH",
            data: JSON.stringify({
                parent: that.id,
                replace: 1
            }),

            success: function (response) {
                if (response.errcode !== 0) {
                    point.shortShow({
                        text: tools.getErrmsg(response.errcode)
                    });
                    return;
                }
                //获取返回结果中的  代表动成功的数据项
                var successFile = _.filter(response.data, function (obj) {
                    return obj.errcode == 0;
                });

                var successFileIdArr = _.pluck(successFile, "id");
                //还剩下没有移动的文件   that.moveList = that.moveList - 移动成功的文件

                function filterJsonByIdArr(json, idArr) {
                    var newArr = [];
                    _.each(idArr, function (id) {
                        var ele = _.filter(json, function (obj) {
                            return obj.id === id
                        });
                        ele && newArr.push(ele[0])
                    });
                    return newArr
                }

                var successFileData = filterJsonByIdArr(that.moveList, successFileIdArr);

                function delJsonByIdArr(arr, idList) {
                    var newArr = [];
                    _.each(arr, function (obj) {
                        var flag = _.find(idList, function (id) {
                            return obj.id == id
                        });
                        flag || newArr.push(obj)
                    });
                    return newArr;
                }

                that.moveList = delJsonByIdArr(that.moveList, successFileIdArr);

                if (that.moveList.length === 0) {
                    point.shortShow({
                        text: "移动成功",
                        time: 1000
                    });
                    that.destroy();
                } else {
                    var failFile = _.filter(response.data, function (obj) {
                        return obj.errcode != 0
                    });
                    var failFileName = _.pluck(failFile, "name").join(",")
                    point.shortShow({
                        text: "文件" + failFileName + "没有移动成功"
                    });
                }

                //文件移动成功后，销毁在首页的选中的列表项
                global.event.trigger("fileMoved", {
                    sourceId: that.sourceId,
                    targetId: that.id,
                    data: successFileData
                });
            },

            error: function (jqXHR, status) {
                point.shortShow({
                    type: "error",
                    text: global.texts.netError
                });
            },

            complete: function () {
                that.moving = false;
            }
        });
    },

    back: function () {
        //this.destroy();
        var pathArr = this.modules.crumbList.list.toJSON();
        pathArr.pop();

        if (pathArr.length) {
            var path = pathArr[pathArr.length - 1],
                id = path.id,
                name = path.name;

            this.set(id);
        } else {
            this.destroy();
        }
        this.cancelCallback && this.cancelCallback();
    },

    createPath: function (response) {
        var data = [];

        //根目录
        data.push({
            id: 0,
            name: "文件系统"
        });

        // 如果没有data，就认为是在根目录
        if (!response.all_parents) {
            this.pathArr = data;
            return data
        }

        //所有的父目录
        _.each(response.all_parents.ids, function (id, index) {
            data.push({
                id: id,
                name: response.all_parents.names[index]
            });
        });

        //当前目录
        data.push({
            id: response.id,
            name: response.name
        });
        this.pathArr = data;
        return data;
    },

    set: function (id) {
        var that = this;

        id = parseInt(id);

        if (id == that.id && that.noError) {
            return;
        }

        this.id = id;
        this.load();
    },

    load: function () {
        var that = this;

        this.$bd.hide();
        this.$loading.show();
        this.$error.hide();

        this.modules.fileList.hideMore();

        this.ajaxObj = $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files?&" + "parent=" + that.id +
            "&page=1&count=" + that.pageSize,
            type: "GET",
            success: function (response) {
                if (response.errcode === 0) {
                    that.$bd.show();
                    that.modules.fileList.set(response.data.children, that.id);
                    that.modules.crumbList.set(that.createPath(response.data));
                    //that.changeHead();
                    that.noError = true;
                } else {
                    var errorTxt = tools.getErrmsg(response.errcode) + ",点击加载更多";
                    that.noError = false;
                    that.$errorTxt.text(errorTxt);
                    that.$error.show();
                }
            },

            error: function (jqXHR, state) {
                that.noError = false;
                that.$errorTxt.text(global.texts.netError);
                that.$error.show();
            },

            complete: function (response) {
                that.$loading.hide();
                that.ajaxObj = null;
            }
        });
    },

    destroy: function () {
        _.each(this.modules, function (view) {
            view.destroy();
        });
        this.remove();

        topBar.setTitle(this.prevTitle);
        topBar.setMenu(this.prevMenu);
        topBar.setBack(this.prevBack);
    }
});

global.event.on("move", function (list, homeId) {
    var fileMoveView = new View(list, homeId);
});