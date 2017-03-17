var $ = require("modules-common/zepto/zepto.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    router = require("modules-common/router/router.js"),
    fastclick = require("modules-common/fastclick/fastclick.js"),
    point = require("modules-common/point/point.js"),
    topBar = require("modules-common/top-bar/top-bar.js");

// 设置backbone的$为zepto
Backbone.$ = $;

// 框架点击返回时，调用此方法
window.starfishBack = function() {}

// 文件回调
window.starfishFile = function() {};

// 设置全局对象
window.global = window.global || {};

// 定义全局数据的命名空间
global.data = {};

// 页内独立的模块
global.components = [];

// 定义全局模块的命名空间
global.modules = {};

// api url域名
global.baseUrl = "https://api.starfish.im/v1";

// 定义全局事件对象
global.event = $.extend({}, Backbone.Events);

// 根节点的jquery对象
global.$doc = $("#wraper");

global.errcodeMap = {
    "0": "成功",
    "1": "手机号码重复",
    "2": "用户名或密码错误",
    "3": "您尚未登录",
    "4": "您没有权限执行该操作",
    "5": "发生未知错误",
    "6": "数据库错误",
    "7": "该组织不存在",
    "8": "该讨论组不存在",
    "9": "该用户不存在",
    "10": "该组织中不存在该用户",
    "11": "没有这条消息",
    "12": "无效的消息目的类型",
    "13": "该邀请不存在",
    "14": "该任务不存在",
    "15": "不存在该关注者",
    "16": "您没有邮箱",
    "17": "邮箱是有效的",
    "18": "令牌无效",
    "19": "令牌过期",
    "20": "没有这个邮件",
    "21": "没有这个邮件附件",
    "22": "您没有手机号",
    "23": "手机号是无效的",
    "24": "邮箱地址已经设置了",
    "25": "授权令牌已经无效",
    "26": "无效的查询字符串",
    "27": "重复的邮件地址",
    "28": "创建组织失败",
    "29": "该用户已在该组织中",
    "30": "no such message attachment",
    "31": "no such mail",
    "32": "无此会话",
    "33": "原始密码错误",
    "34": "目前已经是最新版本了",
    "35": "该项目不存在",
    "36": "该组织不存在该负责人",
    "37": "不能删除创建者",
    "38": "该任务附件不存在",
    "39": "该组织不存在这个关注者",
    "40": "该组织不存在该项目成员",
    "41": "无效的文件名",
    "42": "该文件已存在",
    "43": "该目录不存在",
    "44": "该文件不存在",
    "45": "目录不为空",
    "46": "文件或目录是只读的",
    "47": "改成员组不存在",
    "48": "不支持该图像尺寸",
    "49": "令牌过老，已无效",
    "50": "该邀请码不存在",
    "51": "该联系人不存在",
    "52": "微信服务器出错",
    "53": "missing phone and token",
    "54": "invalid auth token no session",
    "55": "no such section",
    "56": "该消息类型不存在",
    "57": "无效的邮件地址",
    "58": "无效的目标",
    "59": "目录已存在",
    "60": "时间格式错误",
    "61": "该标签不存在",
    "62": "域名已存在",
    "63": "域名不能修改",
    "64": "字符过长",
    "65": "附件过大",
    "66": "邮件内容过大",
    "67": "无效的电话号码"
}

global.texts = {
    netError: "网络异常，请检查您的网络设置"
}

// 设置rem的基础值
$("html").css("font-size", global.$doc.width() * 5 / 36);

// window.onorientationchange = function() {
//     $("html").css("font-size", global.$doc.width() *5 / 36 );
// }

window.onresize = function() {
    $("html").css("font-size", global.$doc.width() * 5 / 36);
}

global.tools = {};

global.tools.getErrmsg = function(errcode) {
    return global.errcodeMap[errcode] || ("发生未知错误，错误码是" + errcode);
}

global.tools.encodeHTML = function(text) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

global.tools.decodeHtml = function(text) {
        return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    // 设置全局ajax
$.ajaxSettings.timeout = 15000;
$.ajaxSettings.contentType = "application/json";
$.ajaxSettings.xhrFields = {
    withCredentials: true //设置后，跨域也会附带cookies信息
};

// 常量定义
global.DEST_TYPE = {
    ORG_MEMBER: 0,
    DISCUSSION_GROUP: 1,
    ORG: 2,
    DEPARTMENT: 3
}

global.MSG_TYPE = {
    TYPE_FILES_CREATED: 48
}

global.UPLOAD_FILE_STATE = {
    WAIT: 1,
    SENDING: 2,
    FINISH: 3,
    ERROR: 4
};

global.ACTION_TYPE = {
    NEW_SUBJECT: 1,
    REPLY: 2,
    FORWARD: 4
}

global.SRC_TYPE = {
    SYSTEM: 0,
    ORG_MEMBER: 1,
    EXTERNAL_CONTACTS: 2
}

// 获取平台
var userAgent = navigator.userAgent;
if (!!userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    global.platform = "ios";
} else if (userAgent.indexOf('Android') > -1 || userAgent.indexOf('Linux') > -1) {
    global.platform = "android";
}

// 统一设置ios与android框架接口
global.starfishBridge = require("./javascripte-bridge.js");

// 添加ios下css命名空间
if (global.platform === "ios") {
    $("html").addClass("ios");
}

// 获取当前用户的信息，并显示加载中的UI
var View = Backbone.View.extend({
    attributes: {
        "class": "init"
    },

    initialize: function(option) {
        topBar.setBack($.proxy(this.back, this));
        option = option || {};
        this.callback = option.callback;
        this.render();
        this.initEvent();
        this.fetchInfo();
    },

    render: function() {
        this.$el.html(__inline("init.html"));
        this.$loading = this.$el.find(".JS-loading");
        this.$loadError = this.$el.find(".JS-error");
        global.$doc.append(this.$el);
    },

    initEvent: function() {
        var that = this;
        this.$loadError.on("click", function() {
            that.fetchInfo();
        });
    },

    fetchInfo: function() {
        var that = this;
        if (this.fetchInfoing) {
            return;
        }
        this.fetchInfoing = true;

        this.$loading.show();
        this.$loadError.hide();

        return $.ajax({
            url: global.baseUrl + "/users/self",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    global.data.user = new Backbone.Model(response.data);
                    global.data.org = new Backbone.Model(response.data.last_org);

                    global.data.org.set("domain", global.data.org.get("api_url"));
                    that.callback && that.callback();
                    that.destroy();
                } else {
                    that.$loadError.show();
                }
            },

            error: function() {
                that.$loadError.show();
                point.shortShow({
                    type: "error",
                    text: "加载失败， 请检查网络"
                });
            },

            complete: function() {
                that.fetchInfoing = false;
                that.$loading.hide();
            }
        });
    },

    back: function() {
        global.starfishBridge("finish");
    },

    destroy: function() {
        this.remove();
    }
});

// 消除click事件的延迟
fastclick(document.body);

// 清除业内组件 在url中的痕迹
// router.clearComponent();

var view;
module.exports = function(fn) {
    if (!view) {
        view = new View({
            callback: fn
        });
    }
}
