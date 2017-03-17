// 获取平台
var userAgent = navigator.userAgent;
if (!!userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    global.platform = "ios";
} else if (userAgent.indexOf('Android') > -1 || userAgent.indexOf('Linux') > -1) {
    global.platform = "android";
}

// @require use-browser.scss
// 提示用户使用浏览器打开该页面
var $ = require("modules-common/jquery/jquery.js");
global.tools.useBrowser = function() {
    var $node = $(__inline("use-browser.html"));
    global.$doc.append($node);
};

// 判断是否微信浏览器
global.tools.isWeixin = function() {
    var ua = navigator.userAgent.toLowerCase();
    return /micromessenger/.test(ua);
};

// 判断是否QQ浏览器
global.tools.isQQ = function(){
    var ua = navigator.userAgent.toLowerCase();
    return /qq/.test(ua);
};

// 如果安装了starfish,则打开, 否则下载
global.tools.openOrDownload = function () {

    if (global.platform !== "ios" && global.platform !== "android") {
        window.location = "http://www.bitbros.com";
        return false;
    }

    // 先打开本地starfish
    window.location = "starfish://bitbrothers";

    // 如果没有安装本地starfish,打开相应的下载地址
    setTimeout(function () {
        if (global.platform === "ios") {
            window.location = "https://itunes.apple.com/cn/app/starfish/id936299423?l=en&mt=8";
        } else {
            window.location = "https://api.starfish.im/v1/downloads/starfish/android";
        }
    }, 50);

};

module.exports = global.tools;
