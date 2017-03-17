var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js"),
    confirmModule = require("modules-common/confirm/confirm.js"),
    point = require("modules-common/point/point.js"),
    ZeroClipboard = require("ZeroClipboard.js");

// ZeroClipboard.config("swfPath", __uri("ZeroClipboard.swf"));
require("tools.js");

var View = Backbone.View.extend({

    attributes: {
        class: "invitation"
    },

    template: __inline("item.tmpl"),

    initialize: function() {
        this.list = new Backbone.Collection();
        this.render();
        this.initEvent();
    },

    render: function() {
        this.$el.html(__inline("invitation-link.html"));
        this.$content = this.$el.find(".JS-content");
        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$back = this.$el.find(".JS-hd button");
        this.$numInput = this.$el.find(".JS-num-input");
        this.$numWarn = this.$el.find(".JS-num-warn");
        this.$createLinkBtn = this.$el.find(".JS-create-link");
        this.$list = this.$el.find("ul");
    },

    initEvent: function() {
        var that = this;

        this.listenTo(this.list, "add", that.addItem);
        this.listenTo(this.list, "remove", this.removeItem);
        this.listenTo(this.list, "reset", function() {
            that.$list.html("");

            that.list.each(function(model) {
                that.addItem(model);
            });
        });

        this.$createLinkBtn.on("click", function() {
            //if ( !that.verity() ) {
            //    return;
            //}

            that.createLink();
        });

        this.$error.on("click", function() {
            that.loadData();
        });

        this.$list.on("click", ".JS-remove", function() {
            var id = $(this).parent().data("id");

            confirmModule.show({
                text: "确定删除该链接吗?",
                callback: function() {
                    that.removeLink(id);
                }
            });
        });

        this.$list.on("mouseenter", "li", function() {
            $(this).addClass("active");
            $(this).find("button").show();
        });
        // this.$list.on("mouseover", "li", function() {
        //     $(this).addClass("active");
        //     $(this).find("button").show();
        // });
        this.$list.on("mouseleave", "li", function() {
            
            var is_hover=$(this).find(".JS-copy").hasClass("zeroclipboard-is-hover");

            $(this).removeClass("active");
            $(this).find("button").hide();
        });

        // this.$list.on("click", ".JS-copy", function() {
        //     var link = $(this).parent().find(".url").text();
        //     var zeroClipboard = new ZeroClipboard();
        //     alert(link)
        //     zeroClipboard.setData('text/plain', link);
        //     zeroClipboard.trigger("copy");
        //     alert("chengong")
        //     // zeroClioboard.on("copy", function(event) {
        //     //     event.clipboardData.setData('text/plain', $node.find(".url").text());
        //     //     point.shortShow({
        //     //         type: "success",
        //     //         text: "复制成功"
        //     //     });
        //     // });

        // });

        this.$back.on("click", function() {
            that.trigger("back");
        });

    },

    verity: function() {
        this.$numWarn.hide();

        var num = this.$numInput.val().trim();

        if (num === "") {
            this.$numWarn.html("请填写人数上限").show();
            return false;
        }

        num = parseInt(num);

        if (!num) {
            this.$numWarn.html("请填写数字").show();
            return false;
        }

        return true;
    },

    loadData: function() {
        var that = this;

        this.$content.hide();
        this.$error.hide();
        this.$loading.show();

        return $.ajax({
            url: global.data.currentOrg.get("api_url") + "/orgs/" + global.data.currentOrg.get("id") + "/org_invitation?type=manage",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    _.each(response.data, function(obj) {
                        obj.url = "";
                    });

                    that.list.reset(response.data);
                    that.$content.show();
                } else {
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                    that.$error.show();
                }
            },

            error: function() {
                that.$error.show();
            },

            complete: function() {
                that.$loading.hide();
            }
        });
    },

    createLink: function() {
        if (this.createLinking) {
            return false;
        }
        this.createLinking = true;
        point.shortShow({
            type: "loading",
            text: "创建链接中..."
        });

        var that = this;

        return $.ajax({
            url: global.data.currentOrg.get("api_url") + "/orgs/" + global.data.currentOrg.get("id") + "/org_invitation",
            type: "POST",
            data: JSON.stringify({
                type: "manage",
                org_id: global.data.currentOrg.get("id"),
                limit: 0
            }),

            success: function(response) {
                if (response.errcode === 0) {
                    response.data.url = "";
                    that.list.add(response.data);
                    that.$numInput.val("");
                    point.shortShow({
                        type: "success",
                        text: "创建成功"
                    });
                } else {
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },

            error: function() {
                point.shortShow({
                    type: "error",
                    text: "网络异常,请检查你的网络设置"
                });
            },

            complete: function() {
                that.createLinking = false;
            }
        });
    },
    copyComplete: function() {
        point.shortShow({
            text: "链接复制成功"
        });
    },
    removeLink: function(id) {
        var that = this,
            firingKey = "removingLink" + id; // 是否正在删除标识为id的链接

        if (this[firingKey]) {
            return;
        }
        this[firingKey] = true;

        point.shortShow({
            type: "loading",
            text: "删除链接中..."
        });

        return $.ajax({
            url: global.data.currentOrg.get("api_url") + "/orgs/" + global.data.currentOrg.get("id") + "/org_invitation/" + id,
            type: "DELETE",
            success: function(response) {
                if (response.errcode === 0) {
                    that.list.remove(id);
                    point.shortShow({
                        type: "success",
                        text: "删除成功"
                    });
                } else {
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },

            error: function() {
                point.shortShow({
                    type: "error",
                    text: "网络异常,请检查你的网络设置"
                });
            },

            complete: function() {
                that[firingKey] = false;
            }
        });
    },

    clear: function() {
        this.$numInput.val("");
        this.$numWarn.hide();

        this.loadData();
    },

    addItem: function(model) {
        var obj = model.toJSON();
        obj.time = global.tools.convertDate(obj.create_time);
        obj.url = location.origin + "/pages/invite/index.html?inviteId=" + obj.id + "&orgId=" + global.data.currentOrg.get("id");

        var $node = $(this.template(obj)),
            zeroClioboard = new ZeroClipboard($node.find(".JS-copy")[0]);
        zeroClioboard.on("ready", function() {
            zeroClioboard.on("copy", function(event) {
                event.clipboardData.setData('text/plain', $node.find(".url").text());
                point.shortShow({
                    type: "success",
                    text: "复制成功"
                });
            });

        });

        zeroClioboard.on("copy-error", function(event) {
            point.shortShow({
                text: "复制失败，请手动复制"
            });
        });
        this.$list.append($node);

        // this.$list.append(this.template(obj));

    },

    removeItem: function(model) {
        this.$list.find("li[data-id=" + model.get("id") + "]").remove();
    },

    show: function() {
        this.$el.show();
        this.clear();
    },

    hide: function() {
        this.$el.hide();
    },

    destroy: function() {
        this.remove();
    }
});

module.exports = View;
