var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

    attributes: {
        "class": "organization-set"
    },

    initialize: function() {

        this.org = global.data.currentOrg;
        this.render();
        this.initLogoEvent();
        this.initNameIntroEvent();
        this.initPlaceEvent();
        this.initIndustryEvent();
        this.initBtnEvent();

        // 根据this.org, 渲染数据
        this.set();

        // 当组织切换时, 重新渲染数据
        var that = this;
        this.listenTo(global.event, "orgSwitch", function() {
            that.org = global.data.currentOrg;
            that.set();
        });
    },

    render: function() {

        this.$el.html(__inline("organization-set.html"));

        this.$orgLogo = this.$el.find(".JS-org-logo");
        this.$orgLogoFile = this.$el.find(".JS-org-logo-file");
        this.$orgName = this.$el.find(".JS-org-name");
        this.$orgIntro = this.$el.find(".JS-org-intro");
        this.$orgPlace = this.$el.find(".JS-org-place");
        this.$provinceSelect = this.$orgPlace.find("select:first");
        this.$citySelect = this.$orgPlace.find("select:eq(1)");
        this.$orgIndustry = this.$el.find(".JS-org-industry");
        this.$orgIndustryPanel = this.$el.find(".JS-industry-panel");
        this.$btns = this.$el.find(".JS-org-btns");
        this.$cancel = this.$el.find(".JS-cancel");
        this.$save = this.$el.find(".JS-save");
    },

    initNameIntroEvent: function() {
        var that = this;

        // 为了实现当表单改变的时候, 显示确定和取消按钮的功能
        // 所有表单元素的变化, 都要抛出change事件
        this.$orgName.on("input", function() {
            that.trigger("change");
        });

        this.$orgIntro.on("input", function() {
            that.trigger("change");
        });
    },

    initLogoEvent: function() {
        var that = this;

        this.$orgLogoFile.on("change", function() {
            var file = this.files[0];
            if (!/image\/\w+/.test(file.type)) {
                // alert("文件必须为图片！");
                point.shortShow({
                    text: "文件必须为图片！"
                })
                that.$orgLogoFile.val("");
                return false;
            }
            var reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function() {
                that.$orgLogo.attr("src", this.result);
            };

            that.trigger("change");
        });

    },

    // 初始化选择省份,城市相关事件
    initPlaceEvent: function() {
        var that = this,
            cityMap = __inline("city.json");

        // 省份和城市的select的联动
        this.$provinceSelect.on("change", function() {
            var value = that.$provinceSelect.val();

            if (value) {
                that.$citySelect.html(createCityOptions(cityMap[value]));
            }

            that.trigger("change");
        });

        function createCityOptions(arr) {
            var text = "<option value=\"\">请选择城市</option>";
            $.each(arr, function(index, city) {
                text += "<option value=\"" + city + "\">" + city + "</option>>";
            });

            return text;
        }
    },

    // 初始化选择行业事件
    initIndustryEvent: function() {
        var that = this;

        //点击显示行业面板
        this.$orgIndustry.on("click", function(event) {
            that.$orgIndustryPanel.show();
            event.stopPropagation();
        });

        // 选择行业
        that.$orgIndustryPanel.on("click", "span", function() {
            that.$orgIndustryPanel.find("span").removeClass("selected");
            $(this).addClass("selected");
            var value = $(this).html();
            that.$orgIndustry.val(value);
            that.$orgIndustryPanel.hide();

            that.trigger("change");
        });

        // 点击其他地方, 面板隐藏
        this.industryHandle = function() {
            that.$orgIndustryPanel.hide();
        };

        global.$doc.on("click.industryPanel", this.industryHandle);

        // 阻止点击面板事件冒泡
        that.$orgIndustryPanel.on("click", function(event) {
            event.stopPropagation();
        });
    },

    initBtnEvent: function() {
        var that = this;

        this.listenTo(this, "change", function() {
            that.$btns.show();
        });

        this.$cancel.on("click", function() {
            that.set();
            that.$btns.hide();
        });

        this.$save.on("click", function() {
            that.save();
        });
    },

    get: function() {
        var data = {
            "name": this.$orgName.val(),
            "intro": this.$orgIntro.val(),
            "province": this.$provinceSelect.val(),
            "city": this.$citySelect.val(),
            "category": this.$orgIndustry.val()
        };

        return data;
    },

    getFormdata: function() {
        var formData = new FormData();

        formData.append("avatar", this.$orgLogoFile[0].files[0]);
        formData.append("name", this.$orgName.val());
        formData.append("intro", this.$orgIntro.val());
        formData.append("province", this.$provinceSelect.val());
        formData.append("city", this.$citySelect.val());
        formData.append("category", this.$orgIndustry.val());

        return formData;
    },

    // 将当前组织数据渲染到界面上
    set: function() {
        var data = this.org.toJSON();
        this.$orgLogo.attr("src", data.avatar);
        this.$orgName.val(data.name);
        this.$orgIntro.val(data.intro);

        this.$provinceSelect.val(data.province);
        if (data.province) {
            this.$provinceSelect.trigger("change", data.province);
            this.$citySelect.val(data.city);
        } else {
            this.$citySelect.val("");
        }


        if (data.category) {
            this.$orgIndustry.val(data.category);
        }
    },

    save: function() {
        var that = this;
        if (this.saving) {
            return;
        }
        var data = this.get();
        if(!data.name){
            point.shortShow({
                text:"组织名称不能为空"
            });
            return;
        }
        this.saving = true;
        this.$save.addClass("loading");
        
        if (this.$orgLogoFile[0].files.length > 0) {
            var formData = this.getFormdata();
            return $.ajax({
                url: this.org.get("api_url") + "/orgs/" + this.org.get("id"),
                data: formData,
                type: "PATCH",
                processData: false,
                contentType: false,
                success: function(response) {
                    if (response.errcode === 0) {
                        $.each(response.data, function(key, value) {
                            that.org.set(key, value)
                        });
                        
                        point.shortShow({
                            text: "修改成功"
                        });
                        that.$btns.hide();
                    } else {
                        point.shortShow({
                            text: global.tools.getErrmsg(response.errcode)
                        })
                    }
                },

                error: function() {
                    point.shortShow({
                        text: global.texts.netError
                    });
                },

                complete: function() {
                    that.$save.removeClass("loading");
                    that.saving = false;
                }
            });
        }

        

        return $.ajax({
            url: this.org.get("api_url") + "/orgs/" + this.org.get("id"),
            data: JSON.stringify(data),
            type: "PATCH",
            success: function(response) {
                if (response.errcode === 0) {
                    $.each(data, function(key, value) {
                        that.org.set(key, value)
                    });

                    point.shortShow({
                        text: "修改成功"
                    });
                    that.$btns.hide();
                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode)
                    })
                }
            },

            error: function() {
                point.shortShow({
                    text: global.texts.netError
                });
            },

            complete: function() {
                that.$save.removeClass("loading");
                that.saving = false;
            }
        });
    },

    show: function() {
        this.$el.show();
    },

    hide: function() {
        this.$el.hide();
    },

    destroy: function() {
        global.$doc.off("click.industryPanel", this.industryHandle);
        this.remove();
    }
});
module.exports = View;
