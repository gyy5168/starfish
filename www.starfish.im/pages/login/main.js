var $ = require("./js/jquery.js");

$.support.cors = true;
var $user = $(".JS-login-username"),
    $password = $(".JS-login-password"),
    $check = $(".JS-login-check"),
    $submit = $(".JS-login-submit"),
    wrongPhone="";

// 检查帐号是否合格的手机号
function checkUserName() {
    var value = $.trim($user.find("input").val());
    
    if(!wrongPhone||wrongPhone!=value){
        $user.find("p").hide();
    }
    if (value === "") {
        $user.find("p").show().text("手机号码不能为空");
        $user.removeClass("correct").addClass("wrong");
        return false;
    }

    if (value.length === 11) {
        $user.addClass("correct").removeClass("wrong");
        return true;
    } else {
        $user.find("p").show().text("手机号码格式错误");
        $user.removeClass("correct").addClass("wrong");
        return false;
    }

}

// 生成8位随机字符串, 用于生成验证码
var jschars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

function generateRandom() {
    var res = "";
    for (var i = 0; i < 8; i++) {
        var id = Math.ceil(Math.random() * 35);
        res += jschars[id];
    }
    return res;
}

// 生成或替换验证码图片
var currentRandom = "";

function createSecurityImg() {
    currentRandom = generateRandom();
    $check.find("img").attr("src", "https://api.starfish.im/v1/validate-code-avatars?generated_key=" + currentRandom);
    $check.find("input").val("");
}


// 获取url上指定key的值
function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r !== null) {
        return decodeURI(r[2]);
    }
    return null;
}

// 检查验证码是否正确
function checkSecurityCode() {
    // 开始验证
    var value = $.trim($check.find("input").val());

    return $.ajax({
        url: "https://api.starfish.im/v1/validate-code-validate?generated_key=" + currentRandom + "&code=" + value,
        type: "GET",
        success: function(response) {
            if (response.errcode !== 0 || !response.data.is_valid) {
                $check.addClass("wrong");
                createSecurityImg();
            }
        },

        error: function() {
            // console.log(response);
            // console.log(status);
            // console.log(statusText);
            $password.find("p").show().text("登录超时，请检查您的网络设置");
        }
    });
}

// 登录
function login() {
    var data = {
        "password": $.trim($password.find("input").val()),
        "phone": $.trim($user.find("input").val())
    };

    return $.ajax({
        url: "https://api.starfish.im/v1/sessions",
        data: data,
        type: "POST",
        xhrFields: {
            withCredentials: true
        },

        success: function(response) {
            switch (response.errcode) {
                case 0:
                    var url = getQueryString("redirectURL") || "http://test.starfish.im/pages/manage/index.html";
                    location.href = url;
                    return;
                case 2:
                    $password.find("p").show().text("您输入的账号或密码不正确，请重新输入");
                    createSecurityImg();
                    return;
                case 9:
                    wrongPhone=data.phone;
                    $user.find("p").show().text("您输入的账号不存在，请重新填写");
                    createSecurityImg();
                    return;
                default:
                    $password.find("p").show().text("发生未知错误");
                    createSecurityImg();
                    return;
            }
        },

        error: function() {
            $password.find("p").show().text("登录超时，请检查您的网络设置");
            createSecurityImg();
        }
    });
}

// 初始化事件

function initEvent() {
    $user.find("input").blur(checkUserName);
    $user.find("input").focus(function(){
        $(this).parent().find("p").hide();
    });
    $check.find(".JS-check-refresh").on("click", createSecurityImg);

    var logining = false;

    $submit.on("click", function() {
        if (logining) {
            return;
        }
        // 清除错误信息
        $password.find("p").hide();

        if (!checkUserName()) {
            // $user.find("input").focus();
            return;
        }
        if(!$password.find("input").val()){
            $password.find("p").show().text("请输入密码");
            return;
        }
        logining = true;
        $submit.html("登录中...");
        checkSecurityCode().then(function(response) {
            if (response.errcode === 0 && response.data.is_valid) {
                login();
            } else {
                return false;
            }
        }).always(function() {
            logining = false;
            $submit.html("登录");
        });

    });

    // 回车登录
    $check.find("input").on("keydown", function(event) {
        if (event.keyCode === 13) {
            $submit.trigger("click");
        }

        $check.removeClass("wrong");
    });

    $password.find("input").on("keydown", function(event) {
        if (event.keyCode === 13) {
            $submit.trigger("click");
        }
    });
    $password.find("input").focus(function(){
        $(this).parent().find("p").hide();
    });
}

// 加载验证码图片
(function() {
    createSecurityImg();
    initEvent();
}());
