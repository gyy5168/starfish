var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    point = require("modules-common/point/point.js"),
    point2 = require("modules-common/point2/point.js"),
    deleteModal = require("../delete-user/delete-user.js"),
    DepartmentSelect = require("modules/department-select/department-select.js");


var View = Backbone.View.extend({
    attributes: {
        class: "user-detail"
    },

    headTemplate: __inline("user-detail-head.tmpl"),
    textTemplate: __inline("user-detail-text.tmpl"),
    textActionTemplate: __inline("user-detail-text-actions.tmpl"),
    inputTemplate: __inline("user-detail-input.tmpl"),

    initialize: function() {
        this.currentDepartment = null;
        this.render();
        this.initEvent();
    },
    render: function() {
        this.$el.html(__inline("user-detail.html"));
        this.$textPanel = this.$el.find(".JS-user-detail-text");
        this.$textContent = this.$textPanel.find(".JS-text-content");
        this.$textActions = this.$textPanel.find(".JS-text-actions");
        this.$textPoint = this.$textPanel.find(".JS-point-panel");

        this.$inputPanel = this.$el.find(".JS-user-detail-input");
        this.$inputContent = this.$inputPanel.find(".JS-input-content");
        this.$inputActions = this.$inputPanel.find(".JS-input-actions");
        this.$inutPoint = this.$inputPanel.find(".JS-point-panel");

        this.$head = this.$el.find(".JS-user-detail-head");

    },
    initEvent: function() {
        var that = this;
        this.listenTo(this.model, 'change', this.reRender);

        this.$el.on("click", function() {
            return false
        });

        this.$textActions.on("click", "span", function() {
            var action = $(this).data("action");

            switch (action) {
                case "correct":
                    that.$textPanel.hide();
                    that.$inputPanel.show();
                    that.$head.addClass("modify");
                    return;
                case "delete":
                    deleteModal.show({
                        okCallback: function() {
                            that.delete()
                        }
                    })
                    return;
                case "add-admin":
                    that.addAdmin();
                    return
                case "remove-admin":
                    that.removeAdmin();
                    return
            }
        });

        this.$inputActions.on("click", "span", function() {
            var action = $(this).data("action");

            switch (action) {
                case "cancel":
                    that.model.set("departments_info", that.cacheDepart || that.model.get("departments_info"));
                    that.reRender();
                    that.$textPanel.show();
                    that.$inputPanel.hide();
                    that.$head.removeClass("modify");
                    return;
                case "save":
                    that.update();
                    return
            }
        });

        this.$inputPanel.on("click", '.input-department input', function() {
            new DepartmentSelect({
                data: that.model.get("departments_info"),
                callback: function(data) {

                    that.model.set("departments_info", data);
                    that.reRender()
                }
            })
        });

        this.$inputPanel.on("click", '.input-sex span', function() {
            $(this).addClass("selected").siblings("span").removeClass("selected")
        });


    },

    set: function(data) {
        var that = this;
        this.model = new Backbone.Model(data);
        if (this.isMyself()) {
            this.inputTemplate = __inline("user-detail-input-self.tmpl");
            this.headTemplate = __inline("user-detail-head-self.tmpl");
        } else {
            this.inputTemplate = __inline("user-detail-input.tmpl");
            this.headTemplate = __inline("user-detail-head.tmpl");
        }
        this.cacheDepart = that.model.get("departments_info");
        // this.currentDepartment = option.currentDepartment;
        this.reRender();
    },

    reRender: function() {
        var data = this.model.toJSON();
        data.name = data.name || "请输入姓名";
        data.location = data.location || "";

        this.$head.html(this.headTemplate({
            data: data
        }));
        if (this.isMyself()) {
            this.$userLogo = this.$el.find(".JS-user-logo");

            this.$userLogoFile = this.$el.find(".JS-user-logo-file");
            this.$userLogoFile.on("change", function() {
                var file = this.files[0];
                if (!/image\/\w+/.test(file.type)) {
                    // alert("文件必须为图片！");
                    point2.shortShow({
                        text: "文件必须为图片！"
                    })
                    that.$userLogoFile.val("");
                    return false;
                }
                var reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = function() {
                    that.$userLogo.attr("src", this.result);
                };
            });
        }
        if (global.data.currentOrg.get("creator") == this.model.get("id")) {
            this.$textActions.html(__inline("user-detail-text-actions-admin.tmpl"))
        } else {
            this.$textActions.html(this.textActionTemplate({
                data: data
            }));
        }

        this.$textContent.html(this.textTemplate({
            data: data
        }));


        this.$inputContent.html(this.inputTemplate({
            data: data
        }));
    },

    update: function() {
        var that = this;
        if (!this.check()) {
            return
        }
        if (this.updating) {
            return
        }


        var position = {
            position: that.$inputPanel.find(".input-position input").val()
        };
        var selectedDepart = that.model.get("departments_info");
        this.updating = true;

        point2.shortShow({
            text: "正在修改成员信息...",
            type: "loading"
        })
        var depart = [];
        if (selectedDepart.length) {
            for (var i = 0; i < selectedDepart.length; i++) {
                depart.push(selectedDepart[i].id);
            }
        }


        var updateDepart = $.ajax({
            // url: global.baseUrl + "/users/"+that.model.get("id"),
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/members/" + that.model.get("id") + "/departments",
            type: "PATCH",
            data: JSON.stringify(depart),
            success: function(response) {
                if (response.errcode === 0) {
                    // _.each(data, function(value, key) {
                    //     that.model.set(key, value)
                    // });
                    that.model.set("departments_info", selectedDepart);
                    that.reRender();
                    point2.shortShow({
                            text: "部门信息修改成功",
                            type: "success",
                        })
                        // that.$textPanel.show();
                        // that.$inputPanel.hide();
                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode),
                        type: "error"
                    })
                }
            },
            error: function() {
                point.shortShow({
                    text: global.texts.netError,
                    type: "error"
                })
            },
            complete: function() {
                that.updating = false;
            }
        })
        var updatePosition = $.ajax({
            // url: global.baseUrl + "/users/"+that.model.get("id"),
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/members/" + that.model.get("id"),
            type: "PATCH",
            data: JSON.stringify(position),
            success: function(response) {
                if (response.errcode === 0) {
                    // _.each(data, function(value, key) {
                    //     that.model.set(key, value)
                    // });
                    that.model.set("position", position.position);
                    that.reRender();
                    point2.shortShow({
                        text: "职位信息修改成功",
                        type: "success"
                    });
                    // that.$textPanel.show();
                    // that.$inputPanel.hide();
                } else {
                    point.shortShow({
                        text: global.tools.getErrmsg(response.errcode),
                        type: "error"
                    })
                }
            },
            error: function() {
                point.shortShow({
                    text: global.texts.netError,
                    type: "error"
                })
            },
            complete: function() {
                that.updating = false;
            }
        })
        if (this.isMyself()) {
            if (this.$userLogoFile[0].files.length > 0) {
                var updateUser = $.ajax({
                    // url: global.baseUrl + "/users/"+that.model.get("id"),
                    url: global.baseUrl + "/users/" + global.data.user.get("id"),
                    type: "PATCH",
                    data: that.getFormdata(),
                    processData: false,
                    contentType: false,
                    success: function(response) {
                        if (response.errcode === 0) {
                            _.each(response.data, function(value, key) {
                                that.model.set(key, value)
                            });
                            that.model.set("departments_info", selectedDepart);
                            that.reRender();
                            point2.shortShow({
                                    text: "个人信息修改成功",
                                    type: "success",
                                })
                                // that.$textPanel.show();
                                // that.$inputPanel.hide();
                        } else {
                            point.shortShow({
                                text: global.tools.getErrmsg(response.errcode),
                                type: "error"
                            })
                        }
                    },
                    error: function() {
                        point.shortShow({
                            text: global.texts.netError,
                            type: "error"
                        })
                    },
                    complete: function() {
                        that.updating = false;
                    }
                })
            } else {
                var updateUser = $.ajax({
                    // url: global.baseUrl + "/users/"+that.model.get("id"),
                    url: global.baseUrl + "/users/" + global.data.user.get("id"),
                    type: "PATCH",
                    data: JSON.stringify(that.get()),
                    success: function(response) {
                        if (response.errcode === 0) {
                            _.each(response.data, function(value, key) {
                                that.model.set(key, value)
                            });
                            that.model.set("departments_info", selectedDepart);
                            that.reRender();
                            point2.shortShow({
                                    text: "个人信息修改成功",
                                    type: "success",
                                })
                                // that.$textPanel.show();
                                // that.$inputPanel.hide();
                        } else {
                            point.shortShow({
                                text: global.tools.getErrmsg(response.errcode),
                                type: "error"
                            })
                        }
                    },
                    error: function() {
                        point.shortShow({
                            text: global.texts.netError,
                            type: "error"
                        })
                    },
                    complete: function() {
                        that.updating = false;
                    }
                })
            }

            $.when(updateDepart, updatePosition, updateUser).done(function() {
                text: "修改成功",
                that.$textPanel.show();
                that.$inputPanel.hide();
                that.$head.removeClass("modify");
            });
        } else {
            $.when(updateDepart, updatePosition).done(function() {
                text: "修改成功",
                that.$textPanel.show();
                that.$inputPanel.hide();
                that.$head.removeClass("modify");
            });
        }

    },

    check: function() {
        // var $name = this.$inputContent.find(".input-name").find("input");
        // if (!$name.val()) {
        //     $name.focus();
        //     $name.parent().next().show()
        //     return false
        // } else {
        //     $name.parent().next().hide()
        // }

        var $position = this.$inputContent.find(".input-position").find("input");
        if ($position.val() && this.getStrLength($position.val()).length > 30) {
            $position.focus();
            $position.parent().next().show()
            return false
        } else {
            $position.parent().next().hide()
        }
        if (this.model.get("position") && !$position.val()) {
            $position.focus()
            point2.shortShow({
                text: "职位信息不能为空",
                type: "error"
            })
            return;
        }
        var $intro = this.$inputContent.find(".input-intro").find("textarea");
        if ($intro.val() && this.getStrLength($intro.val()).length > 300) {
            $intro.focus();
            $intro.parent().next().show();
            return false
        } else {
            $intro.parent().next().hide()
        }
        return true
    },

    get: function() {
        var that = this;
        return {
            name: that.$inputPanel.find(".input-name input").val(),
            gender: that.$inputPanel.find(".input-sex span.selected").index() * 1 - 1,
            intro: that.$inputPanel.find(".input-intro textarea").val()
        }
    },

    getFormdata: function() {
        var formData = new FormData();

        formData.append("avatar", $userLogoFile[0].files[0]);
        formData.append("name", this.$inputPanel.find(".input-name input").val());
        formData.append("gender", this.$inputPanel.find(".input-sex span.selected").index() * 1 - 1);
        formData.append("intro", this.$inputPanel.find(".input-intro textarea").val());

        return formData;
    },

    addAdmin: function() {
        var that = this;

        if (this.isCreatorLogin()) {
            if (this.isMyself()) {
                point.shortShow({
                    text: "您没有该操作权限",
                    type: "error"
                })
                return
            }
        } else {
            if (this.isCreator()) {
                point.shortShow({
                    text: "您没有该操作权限",
                    type: "error"
                });
                return;
            }
        }


        if (this.addAdmining) {
            return;
        }
        this.addAdmining = false;

        point2.shortShow({
            text: "正在设置管理员...",
            type: "loading"
        })

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/administrators",
            type: "POST",
            data: JSON.stringify({
                user_id: this.model.get("id")
            }),
            success: function(response) {
                if (response.errcode === 0) {
                    point2.shortShow({
                        text: "设置成功",
                        type: "success"
                    })
                    that.model.set("is_admin", true)
                    that.reRender()
                } else {
                    point.shortShow({
                        text: "您没有该操作权限",
                        type: "error"
                    })
                }
            },
            error: function() {

                point.shortShow({
                    text: "网络异常，请检查您的网络设置",
                    type: "error"
                })
            },
            complete: function() {
                that.addAdmining = false
            }
        })
    },

    removeAdmin: function() {
        var that = this;

        if (this.isMyself()) {
            point.shortShow({
                text: "您没有该操作权限",
                type: "error"
            })
            return
        }

        if (this.isCreator()) {
            point.shortShow({
                text: "您没有该操作权限",
                type: "error"
            })
            return
        }

        // if (this.isCreatorLogin()) {
        //     if (this.isMyself()) {
        //         point.shortShow({
        //             text: "您没有该操作权限",
        //             type: "error"
        //         })
        //         return
        //     }
        // } else {
        //     if (this.isCreator()) {
        //         point.shortShow({
        //             text: "您没有该操作权限",
        //             type: "error"
        //         })
        //         return
        //     }
        // }

        if (this.removeAdmining) {
            return
        }
        this.removeAdmining = false;

        point2.shortShow({
            text: "正在撤销管理员...",
            type: "loading"
        })

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/administrators/" + that.model.get("id"),
            type: "DELETE",

            success: function(response) {
                if (response.errcode === 0) {
                    point2.shortShow({
                        text: "撤销成功",
                        type: "success"
                    });
                    that.model.set("is_admin", false)
                    that.reRender()
                } else {
                    point.shortShow({
                        text: "您没有该操作权限",
                        type: "error"
                    })
                }
            },
            error: function() {

                point.shortShow({
                    text: "网络异常，请检查您的网络设置",
                    type: "error"
                })
            },
            complete: function() {
                that.removeAdmining = false
            }
        })
    },

    //查看的是当前用户，或者是组织创建者，则没有删除权限

    //详情面板是管理员信息
    isCreator: function() {
        return global.data.currentOrg.get("creator") == this.model.get("id")
    },

    //详情面板是我自己信息
    isMyself: function() {
        return global.data.user.get("id") == this.model.get("id")
    },

    //管理员登陆
    isCreatorLogin: function() {
        return global.data.currentOrg.get("creator") == global.data.user.get("id")
    },

    delete: function() {
        var that = this;

        if (this.isCreatorLogin()) {
            if (this.isMyself()) {
                point.shortShow({
                    text: "您没有该操作权限",
                    type: "error"
                })
                return
            }
        } else {
            if (this.isCreator() || this.isMyself()) {
                point.shortShow({
                    text: "您没有该操作权限",
                    type: "error"
                })
                return
            }
        }

        if (this.deleting) {
            return
        }

        this.deleting = true;

        point2.shortShow({
            text: "正在删除该成员...",
            type: "loading"
        })

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/members/" + this.model.get("id"),
            type: "DELETE",
            success: function(responese) {

                if (responese.errcode === 0) {
                    that.trigger("userDeleted", that.model);
                    point2.shortShow({
                        text: "删除成功",
                        type: "success"
                    })
                } else {
                    point.shortShow({
                        text: "您没有该操作权限",
                        type: "error"
                    })
                }
            },
            error: function() {

                point.shortShow({
                    text: "网络异常，请检查您的网络设置",
                    type: "error",
                })
            },
            complete: function() {
                that.deleting = false
            }
        })
    },

    showText: function() {
        if (this.model) {
            this.model.set("departments_info", this.cacheDepart || this.model.get("departments_info"));
            this.reRender();
        }

        this.$textPanel.show();
        this.$inputPanel.hide();
        this.$head.removeClass("modify");
    },

    getStrLength: function(str) {
        var realLength = 0,
            len = str.length,
            charCode = -1;
        for (var i = 0; i < len; i++) {
            charCode = str.charCodeAt(i);
            if (charCode >= 0 && charCode <= 128) realLength += 1;
            else realLength += 2;
        }
        return realLength;
    },

    hide: function() {
        this.$el.hide();
    },
    show: function() {
        this.$el.show();
    },
    isShow: function() {
        return !!this.$el.css("display");
    },
    destroy: function() {
        this.remove();
    }
});

module.exports = View;
