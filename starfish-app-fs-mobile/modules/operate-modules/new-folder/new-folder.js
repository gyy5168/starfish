var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    _ = require("modules-common/underscore/underscore.js"),
    prompt = require("modules-common/prompt/prompt.js"),
    tools = require("modules-common/tools/tools.js"),
    fileDirectory = require("modules/file-directory/file-directory.js"),
    point = require("modules-common/point/point.js");

// 创建文件夹
var createFoldering = false;
function createFolder(data, option) {
    if (createFoldering) {
        return;
    }

    createFoldering = true;

    point.show({
        text: "正在创建文件夹..."
    });

    return $.ajax({
        url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/file/files",
        type: "POST",
        data: JSON.stringify({
            name: data,
            parent: option.id
        }),

        success: function (response) {
            if (response.errcode === 0) {
                point.shortShow({
                    type: "success",
                    text: "创建成功"
                });
                // 成功后，抛出删除文件事件
                global.event.trigger("folderNewed", {
                    id: option.id,
                    data: response.data
                });
            } else {
                point.shortShow({
                    type: "error",
                    text: "创建失败," + tools.getErrmsg(response.errcode)
                });
            }
        },

        error: function () {
            point.shortShow({
                type: "error",
                text: "创建失败，请检查网路"
            });
        },

        complete: function () {
            createFoldering = false;
        }
    });
}

// 监听删除事件
global.event.on("newFolder", function (option) {
    if (!fileDirectory.isAllow("upload")) {
        point.shortShow({
            text: "该目录下，你没有权限新建文件夹"
        });
        return;
    }

    prompt.show({
        text: "请输入文件夹名称",
        okCallback: function (data) {
            if (getStrLength(data) > 50) {
                point.shortShow({
                    type: "error",
                    text: "输入文件夹名称过长"
                });
            } else {
                createFolder(data, option);
            }

            function getStrLength(str) {
                var realLength = 0, len = str.length, charCode = -1;
                for (var i = 0; i < len; i++) {
                    charCode = str.charCodeAt(i);
                    if (charCode >= 0 && charCode <= 128) realLength += 1;
                    else realLength += 2;
                }
                return realLength;
            }
        }
    });
});

module.exports = {};