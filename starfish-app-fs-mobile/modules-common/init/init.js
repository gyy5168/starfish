/*
 * @file 初始化环境
 * @version 1.1.0
 */
// 1.0.0 添加依赖 modules-common/tools/tools.js
// 1.0.0 修复初始化失败的bug， 取消IOS的input 默认的阴影
//  2.0.0 添加动态url
var $ = require("modules-common/zepto/zepto.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    fastclick = require("modules-common/fastclick/fastclick.js"),
    point = require("modules-common/point/point.js");

// 设置全局对象
window.global = window.global || {};

// 获取平台
var userAgent = navigator.userAgent;
if (!!userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    global.platform = "ios";
} else if (userAgent.indexOf('Android') > -1 || userAgent.indexOf('Linux') > -1) {
    global.platform = "android";
}

// 设置backbone的$为zepto
Backbone.$ = $;

function noop() {}

// 框架点击返回时，调用此方法
window.starfishBack = noop;

// 文件回调
window.starfishFile = noop;

// 定义全局数据的命名空间
global.data = {};

// 定义全局模块的命名空间
global.modules = {};

// 定义全局工具命名空间
global.tools = require("modules-common/tools/tools.js");

// api url域名
global.baseUrl = "https://api.starfish.im/v1";

// 定义全局事件对象
global.event = $.extend({}, Backbone.Events);

global.starfishBridge = require("./javascripte-bridge.js");

// 根节点的jquery对象
global.$doc = $("#wraper");

global.texts = {
    netError: "网络异常，请检查网络设置",
    searchEmpty:"暂无搜索结果"
}

// 设置全局ajax
$.ajaxSettings.timeout = 15000;
$.ajaxSettings.contentType = "application/json";
$.ajaxSettings.xhrFields = {
    withCredentials: true //设置后，跨域也会附带cookies信息
};

// 设置rem的基础值
function getFontSize(){
    var num = global.$doc.width() * 5 / 36;
    return num;
}

$("html").css("font-size", getFontSize());
window.onorientationchange = function() {
    $("html").css("font-size", getFontSize());
};

// 以下代码可以使起可以在浏览器上浏览
if ( global.platform !== "ios" && global.platform !== "android" ) {
    window.starfish = window.starfish || {};
    window.starfish.showMenu = window.starfish.showMenu || noop;
    window.starfish.showTitle = window.starfish.showTitle || noop;
}

// 消除click事件的延迟
fastclick(document.body);

var View = require("./view.js"),
    view;
module.exports = function(fn) {

    global.starfishBridge("getInfo", null, function(data) {
        data.id = data.orgId;
        data.domain = data.domain;
        global.data.org = new Backbone.Model(data);

        if (!view) {
            view = new View({
                callback: fn
            });
        }
    });

};