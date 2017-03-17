var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point = require("modules-common/point/point.js");

// Backbone.$ = $;

// 定义全局对象
window.global = window.global || {};

global.$doc = $("#wraper");

// 定义 系统类型
// 消息类型
global.messageType = {
    taskShare: 5,
    fileShare: 48
};

// 成员、组织、部门类型
global.destType = {
    member: 0,
    group: 1,
    org: 2,
    department: 3
};

// 会话类型
global.peerType = {
    member: 0,
    group: 1,
    contacts: 2,
    department: 3
};

// 定义 url前缀
global.baseUrl = "https://api.starfish.im/v1";

// 定义模块空间
global.modules = global.modules || {};

// 定义事件对象
global.event = $.extend({}, Backbone.Events);

// 定义全局数据
global.data = global.data || {};

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
    "24": "邮件地址重复",
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
    "67": "无效的电话号码",
    "68": "无效的搜索类型",
    "69": "域名MX记录错误",
    "70": "app没有安装",
    "71": "文件目录覆盖失败",
    "72": "文件权限没有设置",
    "73": "搜索关键字错误",
    "74": "不能删除部门",
    "75": "参数错误",
    "76": "移动目录错误",
    "77": "不能删除负责人",
    "78": "不支持该api",
    "79": "域名不存在"
}

global.tools = {};
global.tools.getErrmsg = function(errcode) {
    var text = global.errcodeMap[errcode];
    return text || ("未知错误，错误码为" + errcode);
}

global.tools.encodeHTML = function( text ) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

global.tools.decodeHtml = function( text ) {
    return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
// 设置全局ajax
$.ajaxSetup({
    timeout: 10000,
    contentType: "application/json",
    xhrFields: {
        withCredentials: true
    },
    dataFilter: function(response) {
        return global.tools.encodeHTML(response);
    }
});

// 从框架获取组织信息
var info = window.starfish.getInfo();
info = JSON.parse(info);
global.data.org = new Backbone.Model({
    id: info.orgId,
    domain: info.domain,
    isAdmin: info.isAdmin
});

// 加载页面UI， 加载初始化信息（当前用户、当前组织）
var View = Backbone.View.extend({
    attributes: {
        "class": "init"
    },

    initialize: function(option){
        option = option || {};
        this.callback = option.callback;
        this.render();
        this.initEvent();
        this.fetchInfo();
    },

    render: function(){
        this.$el.html(__inline("init.html"));
        this.$loading = this.$el.find(".JS-loading");
        this.$loadError = this.$el.find(".JS-error");
        global.$doc.append( this.$el );
    },

    initEvent: function(){
        var that = this;
        this.$loadError.find(".JS-btn").on("click", function(){
            that.fetchInfo();
        });
    },

    fetchInfo: function(){
        var that = this;
        if ( this.fetchInfoing ) {
            return;
        }
        this.fetchInfoing = true;

        this.$loading.show();
        this.$loadError.hide();

        return $.ajax({
            url: global.baseUrl + "/users/self",
            type:"GET",
            // async:false,
            success: function(response){
                if ( response.errcode === 0 ) {
                    global.data.user = new Backbone.Model(response.data);

                    // for test
                    // global.data.user.set("is_admin", 1);

                    that.callback && that.callback();
                    that.destroy();
                } else {
                    that.$loadError.show();
                    point.shortShow({
                        text: global.tools.getErrmsg(data.errcode),
                        type: 'error'
                    });
                }
            },

            error: function(){
                that.$loadError.show();
                point.shortShow({
                    type:"error",
                    text:"网络异常，请检查您的网络设置"
                });
            },

            complete: function(){
                that.fetchInfoing = false;
                that.$loading.hide();
            }
        });
    },

    destroy: function(){
        this.remove();
    }
});



module.exports = function( fn ) {
    var view = new View({
        callback: fn
    });
}





