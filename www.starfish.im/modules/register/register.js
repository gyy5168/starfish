var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    point = require("modules-common/point/point.js"),
    tools = require("modules-common/tools/tools.js");

var View = Backbone.View.extend({

    attributes: {
        "class": "register-view"
    },
    validateTemplate: __inline("validate.tmpl"),

    initialize: function() {
        this.render();
        this.initClickEvent();
        this.initVerifyEvent();
    },

    render: function() {
        this.$el.html(__inline("register.html"));
        this.$getTokenButton = this.$el.find(".JS-get-token");
        this.$firstStepButton = this.$el.find(".content-first .next-step");
        this.$secondStepButton = this.$el.find(".content-second .next-step");
        this.$finishStepButton = this.$el.find(".content-finish .finish-step");
        this.$telephone=this.$el.find(".JS-telephone");

        this.$provinceSelect = this.$el.find(".JS-province");
        this.$citySelect = this.$el.find(".JS-city");
        this.$industryInput = this.$el.find(".JS-industry");

        this.setPhone();
        // 添加省市联动
        this.addCityInfo();
        // 行业类型面板
        this.$el.append(__inline("industry/industry.html"));
        this.$industryPanel = this.$el.find(".JS-industry-panel");
        global.$doc.append(this.$el);

    },

    initClickEvent: function() {
        var that = this;

        // this.$el.on("click", ".JS-step", function() {
        //     var index = $(this).data("step");
        //     that.changeStep(index);
        // });

        // 获取验证码
        this.$getTokenButton.on("click", function() {
            that.getToken();
        });
        // 手机验证 下一步
        this.$firstStepButton.on("click", function() {
            that.toSecondStep();
        });
        // 阅读服务协议
        this.$el.on("click", ".JS-read-license", function() {
            if ($(this).hasClass("read")) {
                $(this).removeClass("read");
                that.$secondStepButton.addClass("disabled");
            } else {
                $(this).addClass("read");
                that.$secondStepButton.removeClass("disabled");
            }
        });
        // 组织注册 下一步
        this.$secondStepButton.on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            that.toFinishStep();
        });

        // 显示行业类型面板
        this.$industryInput.on("click", function(evt) {
            that.$industryPanel.show();
            that.industryPanelShow = true;
            evt.stopPropagation();
        });
        // 选择行业
        this.$industryPanel.on("click", ".industry-item", function() {
            that.$industryPanel.find(".industry-item").removeClass("selected");
            $(this).addClass("selected");
            that.$industryInput.val($(this).text());
            that.$industryPanel.hide();
        });
        // 点击行业面板外隐藏该面板
        this.$el.on("click", function(evt) {
                if (!that.industryPanelShow) {
                    return;
                }
                var target = $(evt.target);
                if (target.closest(".JS-industry-panel").length == 0) {
                    that.$industryPanel.hide();
                    that.industryPanelShow = false;
                }
            })
            // 完成注册 登录
        this.$finishStepButton.on("click", function() {
            if (this.finishIntval) {
                clearInterval(this.finishIntval)
            }
            window.location.href = window.location.origin + "/pages/manage/index.html";
        });
    },

    initVerifyEvent: function() {
        var that = this;

        this.$("input").on("focus", function(evt) {
            var validate=$(this).parent().find(".validate-info").attr("class","validate-info").text("");
        });

        // 手机号验证
        this.$el.find(".JS-telephone").blur(function() {
            that.verifyTelephone($(this).val());
        });
        // 验证码验证
        // this.$el.find(".JS-token").blur(function() {
        //     if ($(this).val()) {
        //         that.addValidateInfo($(this), {
        //             type: "",
        //             text: ""
        //         });
        //     } else {
        //         that.addValidateInfo($(this), {
        //             type: "error",
        //             text: "请输入验证码"
        //         });
        //     }
        // });

        // 组织名验证
        this.$el.find(".JS-organize-name").blur(function() {
            if ($(this).val()) {
                that.addValidateInfo($(this), {
                    type: "success",
                    text: "&nbsp;"
                });
            } else {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "组织名称不能为空"
                });
            }
        });
        // 姓名验证
        this.$el.find(".JS-person-name").blur(function() {
            if ($(this).val()) {
                that.addValidateInfo($(this), {
                    type: "success",
                    text: "&nbsp;"
                })
            } else {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "请输入用户姓名"
                })
            }
        });
        // 密码验证
        this.$el.find(".JS-password").blur(function() {
            that.verifyPassword = false;
            var password = $(this).val();
            if (!password) {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "密码不能为空"
                })
                return;
            }
            if (password.length < 6 || password.length > 15) {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "密码长度错误"
                })
                return;
            }
            var level = that.passwordLevel(password);
            if (level < 2) {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "密码格式错误"
                })
                return;
            }
            that.verifyPassword = true;
            that.addValidateInfo($(this), {
                type: "success",
                text: "&nbsp;"
            })
        });
        // 确认密码验证
        this.$el.find(".JS-confirm-password").blur(function() {
            that.verifyConfirmPassword = false;
            var confirmPassword = $(this).val();
            if (!confirmPassword) {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "请再次输入密码"
                })
                return;
            }
            if (confirmPassword.length < 6 || confirmPassword.length > 15) {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "密码长度错误"
                })
                return;
            }
            var level = that.passwordLevel(confirmPassword);
            if (level < 2) {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "密码格式错误"
                })
                return;
            }
            var password = that.$el.find(".JS-password").val();
            if (password == confirmPassword) {
                that.verifyConfirmPassword = true;
                that.addValidateInfo($(this), {
                    type: "success",
                    text: "&nbsp;"
                })
            } else {
                that.addValidateInfo($(this), {
                    type: "error",
                    text: "两次输入的密码不一致"
                })
            }
        });
    },

    setPhone: function() {
        var options=tools.parseURL();
        this.$telephone.val(options.phone||"")
    },
    addCityInfo: function() {
        var that = this;
        this.city = __inline("city.json");

        var provinceOptions = "<option value=''>请选择省份</option>";
        for (var key in this.city) {
            provinceOptions += "<option value=" + key + ">" + key + "</option>";
        }
        this.$provinceSelect.html(provinceOptions);
        this.$provinceSelect.change(function() {
                var province = $(this).val(),
                    cityOptions = "<option value=''>请选择城市</option>";
                if (province) {
                    var citys = that.city[province];
                    for (var i = 0; i < citys.length; i++) {
                        cityOptions += "<option value=" + citys[i] + ">" + citys[i] + "</option>";
                    };
                    that.$citySelect.html(cityOptions);
                }
            })
            // this.$citySelect.change(function() {
            //     var city = $(this).val();
            //     if (city) {
            //         $(this).removeClass("no-selected");
            //     }else{
            //         $(this).addClass("no-selected");
            //     }
            // })
    },

    passwordLevel: function(password) {
        var Modes = 0;
        for (i = 0; i < password.length; i++) {
            Modes |= charMode(password.charCodeAt(i));
        }
        return pwdLevel(Modes);

        function charMode(iN) {
            if (iN >= 48 && iN <= 57) //数字
                return 1;
            if (iN >= 65 && iN <= 90) //大写字母
                return 2;
            if ((iN >= 97 && iN <= 122) || (iN >= 65 && iN <= 90)) //大小写
                return 4;
            else
                return 8; //特殊字符
        }

        function pwdLevel(num) {
            modes = 0;
            for (i = 0; i < 4; i++) {
                if (num & 1) modes++;
                num >>>= 1;
            }
            return modes;
        }
    },

    changeStep: function(step) {
        this.$el.find(".step-item").removeClass("selected");
        this.$el.find(".step-" + step).addClass("selected");
        this.$el.find(".content-item").removeClass("active");
        this.$el.find(".content-" + step).addClass("active");
        if (step == "second" && this.userId) {
            this.$el.find(".content-" + step).addClass("registered");
        }
        if (step == "finish") {
            this.setFinishInterval();
        }
    },

    getToken: function() {
        if (this.tokenIntervaling) {
            return;
        }
        var $telephone = this.$el.find(".input-group.telephone"),
            phone = $telephone.find("input").val();

        if (!phone.length) {
            this.verifyPhone = false;
            this.addValidateInfo($telephone, {
                type: "error",
                text: "手机号码不能为空"
            })
            // $telephone.find("input").focus();
            return;
        }

        if (this.verifyPhone == false) {
            // $telephone.find("input").focus();
            return;
        }

        var data = {
            phone: phone,
            type: 0
        };

        // 发送后倒计时60秒
        this.setTokenInterval(this.$getTokenButton, "重新获取", 60);
        $.ajax({
            url: global.baseUrl + "/tokens",
            type: "POST",
            data: JSON.stringify(data),
            success: function(response) {

            },

            error: function(response) {

            },

            complete: function() {

            }
        })
    },

    setTokenInterval: function($selector, text, time) {
        var that = this;
        this.tokenIntervaling = true;
        time = time + 1;
        var preText = $selector.text();
        $selector.addClass("re-get");
        handle();
        this.tokenIntval = setInterval(handle, 1000);

        function handle() {
            time--;
            if (time == 0) {
                $selector.removeClass(".re-get")
                that.tokenIntervaling = false;
                $selector.text(preText);
                $selector.removeClass("re-get");
                clearInterval(that.tokenIntval);
                return;
            }
            $selector.text(text + "(" + time + ")")
        }
    },

    setFinishInterval: function() {
        var that = this,
            text = "立即进入",
            time = 4;

        this.finishIntervaling = true;
        handle();
        this.finishIntval = setInterval(handle, 1000);

        function handle() {
            time--;
            if (time == 0) {
                that.finishIntervaling = false;
                that.$finishStepButton.text(text);
                clearInterval(that.finishIntval);
                window.location.href = window.location.origin + "/pages/manage/index.html";
                return;
            }
            that.$finishStepButton.text(text + "(" + time + "s)")
        }
    },

    toSecondStep: function() {
        var that = this;
        this.verifyToken();
    },

    verifyTelephone: function(phone) {
        var $input = this.$el.find(".JS-telephone");
        if (phone.length == 0) {
            this.verifyPhone = false;
            this.addValidateInfo($input, {
                type: "error",
                text: "手机号码不能为空"
            })
            return;
        }
        if (phone.length != 11) {
            this.verifyPhone = false;
            this.addValidateInfo($input, {
                type: "error",
                text: "手机号码长度错误"
            })
            return;
        }
        var partten = /^1\d{10}$/;
        var isTelephone = partten.test(phone);
        if (isTelephone) {
            this.verifyPhone = true;
            this.addValidateInfo($input, {
                type: "success",
                text: "&nbsp;"
            })
        } else {
            this.verifyPhone = false;
            this.addValidateInfo($input, {
                type: "error",
                text: "手机号码格式错误"
            })
        }
    },

    verifyToken: function(phone, token) {
        var that = this;

        var $telephoneInput = this.$el.find(".JS-telephone"),
            $tokenInput = this.$el.find(".JS-token"),
            phone = $telephoneInput.val(),
            token = $tokenInput.val();

        if (!phone) {
            this.verifyPhone = false;
            this.addValidateInfo($telephoneInput, {
                type: "error",
                text: "手机号码不能为空"
            })
            // $telephoneInput.focus();
            return;
        }
        if (this.verifyPhone == false) {
            // $telephoneInput.focus();
            return;
        }
        if (!token) {
            this.addValidateInfo($tokenInput, {
                type: "error",
                text: "请输入验证码"
            })
            // $tokenInput.focus();
            return;
        } else {
            this.addValidateInfo($tokenInput, {
                type: "",
                text: ""
            })
        }
        this.$firstStepButton.addClass("loading");
        $.ajax({
            url: global.baseUrl + "/tokens?type=0&is_auto_login=1&account=" + phone + "&token=" + token,
            type: "GET",
            success: function(response) {
                if (response.errcode != 0) {
                    var text = global.tools.getErrmsg(response.errcode);
                    return;
                }
                if (response.data == null) {
                    that.addValidateInfo($tokenInput, {
                        type: "error",
                        text: "验证码错误"
                    })
                } else {
                    that.phone = response.data.account || "";
                    that.token = response.data.token || "";
                    that.userId = response.data.user_id || "";

                    that.changeStep("second");
                }
            },

            error: function() {
                point.shortShow({
                    "text": global.texts.netError
                });
            },

            complete: function() {
                that.$firstStepButton.removeClass("loading");
            }
        })
    },

    toFinishStep: function() {
        var that = this;

        var $organizeNameInput = this.$el.find(".JS-organize-name"),
            $personNameInput = this.$el.find(".JS-person-name"),
            $passwordInput = this.$el.find(".JS-password"),
            $confirmPasswordInput = this.$el.find(".JS-confirm-password"),
            $categoryInput = this.$el.find(".JS-industry");
        if (!$organizeNameInput.val()) {
            this.addValidateInfo($organizeNameInput, {
                type: "error",
                text: "组织名称不能为空"
            })
            // $organizeNameInput.focus();
            return;
        }
        if (!$categoryInput.val()) {
            this.addValidateInfo($categoryInput, {
                type: "error",
                text: "请选择组织所属行业类型"
            })
            // $categoryInput.focus();
            return;
        }
        if (!this.userId) {
            if (!$personNameInput.val()) {
                this.addValidateInfo($personNameInput, {
                    type: "error",
                    text: "请输入用户姓名"
                })
                // $personNameInput.focus();
                return;
            }
            if (!$passwordInput.val()) {
                this.addValidateInfo($passwordInput, {
                    type: "error",
                    text: "密码不能为空"
                })
                // $passwordInput.focus();
                return;
            }
            if (!this.verifyPassword) {
                $passwordInput.focus();
                return;
            }
            if (!$confirmPasswordInput.val()) {
                this.addValidateInfo($confirmPasswordInput, {
                    type: "error",
                    text: "请再次输入密码"
                })
                // $confirmPasswordInput.focus();
                return;
            }
            if (!this.verifyConfirmPassword) {
                // $confirmPasswordInput.focus();
                return;
            }

            that.registerPerson().success(function(response) {
                if (response.errcode === 0) {
                    that.$el.find(".content-second").addClass("registered-person");
                    that.registerOrganize().success(function(response) {
                        if (response.errcode === 0) {
                            that.changeStep("finish");
                        }
                    });
                }
            });
        }



        that.registerOrganize().success(function(response) {
            if (response.errcode === 0) {
                that.changeStep("finish");
            }
        });


    },

    registerPerson: function() {
        var that = this;
        var data = this.getPersonInfo();

        this.$secondStepButton.addClass("loading");
        return $.ajax({
            url: global.baseUrl + "/users",
            type: "POST",
            data: JSON.stringify(data),
            success: function(response) {

            },

            error: function() {
                point.shortShow({
                    "text": global.texts.netError
                });
            },

            complete: function() {
                that.$secondStepButton.removeClass("loading");
            }
        });
    },

    registerOrganize: function() {
        var that = this;
        var data = this.getOrganizeInfo();
        this.$secondStepButton.addClass("loading");
        return $.ajax({
            url: global.baseUrl + "/orgs",
            type: "POST",
            data: JSON.stringify(data),
            success: function(response) {
                if (response.errcode === 0) {
                    if (localStorage) {
                        localStorage.currentOrgId = response.data.id;
                        if(localStorage.guideList){
                            localStorage.guideList=localStorage.guideList+","+response.data.id;
                        }else{
                            localStorage.guideList = response.data.id;
                        }
                    }
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
            },

            complete: function() {
                that.$secondStepButton.removeClass("loading");
            }
        });
    },

    getPersonInfo: function() {

        var data = {};
        data.name = this.$el.find(".JS-person-name").val();
        data.password = this.$el.find(".JS-password").val();
        data.phone = this.phone;
        data.token = this.token;
        data.is_auto_login = 1;
        return data;
    },

    getOrganizeInfo: function() {
        var data = {};
        data.name = this.$el.find(".JS-organize-name").val();
        data.intro = this.$el.find(".JS-organize-intro").val();
        data.province = this.$el.find(".JS-province").val();
        data.city = this.$el.find(".JS-city").val()
        data.category = this.$el.find(".JS-industry").val();
        return data;
    },

    addValidateInfo: function($input, info) {
        var $container = $input.closest("div");
        var dataDefault = {
            type: "",
            text: ""
        };
        var data = info || dataDefault;
        $container.find(".validate-info").remove();
        $container.append(this.validateTemplate(data))
    },

    destroy: function() {
        this.remove();
    }
});

module.exports = View;
