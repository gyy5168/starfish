var errcodeMap = {
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
    "79": "域名不存在",
};

module.exports = {

    formatDate: function(date, fmt) {

        var o = {
                "M+": date.getMonth() + 1,
                "d+": date.getDate(),
                "h+": date.getHours() % 12 === 0 ? 12 : date.getHours() % 12,
                "H+": date.getHours(),
                "m+": date.getMinutes(),
                "s+": date.getSeconds(),
                "q+": Math.floor((date.getMonth() + 3) / 3),
                "S": date.getMilliseconds()
            },
            week = {
                "0": "\u65e5",
                "1": "\u4e00",
                "2": "\u4e8c",
                "3": "\u4e09",
                "4": "\u56db",
                "5": "\u4e94",
                "6": "\u516d"
            };

        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }

        if (/(E+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? "\u661f\u671f" : "\u5468") : "") + week[date.getDay() + ""]);
        }

        for (var k in o) {
            if (new RegExp("(" + k + ")").test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            }
        }
        return fmt;
    },

    formatSize: function(bytes){
        if (bytes == 0) {
            return "0 B";
        }
        var s = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        var e = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(e))).toFixed(1) + " " + s[e];
    },

    getErrmsg: function(errcode) {
        return errcodeMap[errcode] || ("发生未知错误，错误码是" + errcode);
    },

    encodeHTML: function(text) {
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    decodeHtml: function(text) {
        return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
}