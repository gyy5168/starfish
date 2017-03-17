var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    Node = require("./node/node.js"),
    CreateDepart = require("./modal/create-depart/create-depart.js"),
    InviteMember = require("./modal/invite-member/invite-member.js"),
    // ImportMember = require("./modal/import-member/import-member.js"),
    point = require("modules-common/point/point.js");

var View = Backbone.View.extend({

    attributes: {
        "class": "org-structure"
    },
    contactTemplate: __inline("contact.tmpl"),

    initialize: function() {
        this.render();
        this.initEvent();
        this.loadRoot();
    },

    render: function() {
        this.$el.html(__inline("org-structure.html"));

        this.$list = this.$el.find(".JS-list");
        this.$error = this.$el.find(".JS-error");
        this.$loading = this.$el.find(".JS-loading");
        this.$search = this.$el.find(".JS-search");
        this.$input = this.$el.find(".JS-search-input");
        this.$searchList = this.$el.find(".JS-search-list");
    },

    // TODO 函数有些大, 按照类别拆分下
    initEvent: function() {
        var that = this;

        // 切换组织 重新加载
        // this.listenTo(global.event, 'orgSwitch orgModify', function(model) {
        //     that.loadRoot();
        // });

        this.selectedIndex = -1; // 搜索建议 当前选中
        // 输入框 选中、回车搜索、上下键选择事件
        this.$input.on({
            focus: function() {
                that.$search.addClass("active");
                // TODO class需要加JS前缀
                that.$el.find(".header .title").hide();
                that.$el.find(".header .add").hide();
            },
            keydown: function(evt) {
                // 回车时搜索
                if (evt.keyCode === 13) {

                    that.searchByKeyword();
                }
            },
            keyup: function(evt) {
                if (evt.keyCode === 13) {
                    return;
                }
                // 上下键选择
                if (evt.keyCode === 38) {
                    // 保存输入的内容
                    that.keyword = that.keyword || $(this).val().trim();
                    // TODO class加JS前缀, 且名字有问题
                    var $list = that.$searchList.find(".search-item");

                    // TODO 感觉不需要selectedIndex, 根据selected来找到下一个就行了, 逻辑复杂了好多
                    if (that.selectedIndex === -1) {
                        that.selectedIndex = $list.length - 1;
                        $list.removeClass("selected");
                        var $curItem = that.$searchList.find(".search-item:eq(" + that.selectedIndex + ")");
                        $curItem.addClass("selected");
                        that.$input.val($curItem.find("span").text());
                        return;
                    }
                    if (that.selectedIndex > 0) {
                        that.selectedIndex--;
                        $list.removeClass("selected");
                        var $curItem = that.$searchList.find(".search-item:eq(" + that.selectedIndex + ")");
                        $curItem.addClass("selected");
                        that.$input.val($curItem.find("span").text());
                        return;
                    }
                    that.selectedIndex = -1;
                    $list.removeClass("selected");
                    that.$input.val(that.keyword);
                    return;
                }
                if (evt.keyCode === 40) {
                    that.keyword = that.keyword || $(this).val().trim();
                    var $list = that.$searchList.find(".search-item");
                    if (that.selectedIndex < $list.length - 1) {
                        that.selectedIndex++;
                        $list.removeClass("selected");
                        var $curItem = that.$searchList.find(".search-item:eq(" + that.selectedIndex + ")");
                        $curItem.addClass("selected");
                        that.$input.val($curItem.find("span").text());
                        return;
                    }

                    that.selectedIndex = -1;
                    $list.removeClass("selected");
                    that.$input.val(that.keyword);

                    return;
                }
                // 添加搜索建议
                // that.handleThrottle(that.addSearchSuggest(),1000)

                // TODO 感觉单独在绑定个事件好一些, 他和向上,向下不是一类操作
                that.addSearchSuggest();
            }
        });
        // 点击搜索图标搜索
        // TODO class添加JS前缀
        this.$el.find(".search i").on("click", function() {
            that.searchByKeyword();
        });
        // 加号按钮、弹框点击事件
        // TODO class添加JS前缀
        // TODO 建议吧动作写到li上面, 点击后抛出事件, 在其他地方监听他们
        // TODO 绑定事件用链式调用, 感觉怪怪的
        this.$el.find(".add").on("click", ".add-icon", function() {
            that.$el.find(".add ul").show();
        }).on("click", ".create-depart", function() {
            CreateDepart.show({
                title: "创建子部门",
                parentOrgId: that.rootDepartId,
                callback: $.proxy(that.loadRoot, that)
            });
            $(this).closest("ul").hide();
        }).on("click", ".add-member", function() {
            InviteMember.show({
                orgId: global.data.currentOrg.get("id")
            });
            $(this).closest("ul").hide();
        }).on("click", ".invite-link", function() {
            that.trigger("invite-link");
            $(this).closest("ul").hide();
        }).on("mouseleave", function() {
            $(this).find("ul").hide();
        });
        // 搜索建议点击
        this.$searchList.on("click", ".search-item", function() {
            var type = $(this).data("type"),
                id = $(this).data("id");

            var model = that.searchList.findWhere({
                id: id,
                type: type
            });

            var data = {
                keyword: $(this).find("span").text(),
                type: type,
                data: model.toJSON()
            };
            that.trigger("search", data);
        });
        // 点击页面其他位置隐藏搜索框、添加部门面板
        // TODO 有更好的逻辑实现这个功能
        global.$doc.on("click", function(evt) {
            var target = $(evt.target);
            if (target.closest(".search").length === 0) {
                that.$input.val("");
                that.$searchList.find(".member-title").hide();
                that.$searchList.find(".depart-title").hide();
                that.selectedIndex = -1;
                that.$searchList.find(".search-item").remove();
                that.$el.find(".search").removeClass("active");
                that.$el.find(".header .title").show();
                that.$el.find(".header .add").show();
            }
            if (target.closest(".add").length === 0) {
                that.$el.find(".add ul").hide();
            }
        });
    },

    loadRoot: function() {
        var that = this;
        if (this.loadRooting) {
            return;
        }
        this.loadRooting = true;

        this.$loading.show();
        this.$error.hide();
        this.$list.hide();

        return $.ajax({
            url: global.baseUrl + "/orgs/" + global.data.currentOrg.get("id") + "/departments?parent=0&page=1&count=10",
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {

                    var data = response.data[0],
                        itemView = new Node({
                            model: new Backbone.Model(data),
                            rootView: that
                        });
                    that.rootDepartId = data.id;
                    that.$list.html(itemView.$el);
                    that.$list.show();

                    itemView.open();
                }
            },

            error: function() {
                //TODO 如果需要抛出, success也有可能会失败
                // TODO 没有显示error页面
                that.trigger("loadTreeError");
            },

            complete: function() {
                that.loadRooting = false;
                that.$loading.hide();
            }
        });
    },

    // TODO 感觉用一个函数不合适, 搜素成员和部门可以在列表点击事件中做
    searchByKeyword: function() {
        var keyword = this.$input.val().trim();
        if (!keyword) {
            point.shortShow({
                text: "关键字不能为空",
                type: "error"
            });
            return;
        }
        var $selected = this.$searchList.find(".selected");
        var data = {
            keyword: keyword
        };

        if ($selected.length) {

            var type = $selected.data("type"),
                id = $selected.data("id");

            var model = this.searchList.findWhere({
                id: id,
                type: type
            });

            data.type = type;
            data.data = model.toJSON();

        } else {
            data.type = "all";
        }
        this.trigger("search", data);
    },

    // TODO 需要一定事件内触发一次
    addSearchSuggest: function() {
        var that = this;
        var keyword = this.$input.val().trim();
        if(this.keyword&&this.keyword==keyword&&this.suggested){
            return;
        }
        this.$searchList.hide();
        this.$searchList.find(".member-title").hide();
        this.$searchList.find(".depart-title").hide();
        this.$searchList.find(".search-item").remove();
        this.searchList = new Backbone.Collection();

        
        this.keyword = keyword;
        if (!keyword) {
            return;
        }
        this.suggested=false;
        this.memberAjax && this.memberAjax.abort();
        this.departAjax && this.departAjax.abort();
        this.memberAjax = $.ajax({
            url: global.data.currentOrg.get("api_url") + "/orgs/" + global.data.currentOrg.get("id") + "/search?q=" + keyword + "&type=101&page=1&count=10&highlight=0&is_detail=1",
            type: "GET",
            success: function(response) {

            },

            error: function() {

            },

            complete: function() {

            }
        });
        this.departAjax = $.ajax({
            url: global.data.currentOrg.get("api_url") + "/orgs/" + global.data.currentOrg.get("id") + "/search?q=" + keyword + "&type=103&page=1&count=10&highlight=0&is_detail=1",
            type: "GET",
            success: function(response) {

            },

            error: function() {

            },

            complete: function() {

            }
        });
        $.when(that.memberAjax, that.departAjax).done(function(memberResponse, departResponse) {
            that.suggested=true;
            var members = [];
            var departs = [];
            if(memberResponse[0].data&&memberResponse[0].data.data){
                members = memberResponse[0].data.data
            }
            if(departResponse[0].data&&departResponse[0].data.data){
                departs = departResponse[0].data.data
            }

            var lengths = that.getLength(members.length, departs.length);
            if (lengths.memberLength) {
                that.$searchList.show();
                that.$searchList.find(".member-title").show();
                // TODO 使用$.each 或者 _.each 或者 _.find 等高级接口来替换for循环
                for (var i = 0; i < lengths.memberLength; i++) {
                    var data = members[i].source;
                    data.type = "member";
                    that.$searchList.find(".member-title").after(that.contactTemplate(data));
                    that.searchList.add(data);
                };
            }
            if (lengths.departLength) {
                that.$searchList.show();
                that.$searchList.find(".depart-title").show();
                for (var i = 0; i < lengths.departLength; i++) {
                    var data = departs[i].source;
                    data.type = "depart";
                    that.$searchList.find(".depart-title").after(that.contactTemplate(data));
                    that.searchList.add(data);
                };
            }
        });
    },

    // TODO 写成内部函数好一些
    // TODO 需要添加注释,解释改函数的作用
    getLength: function(len1, len2) {
        var lengths = {};
        if (!len1) {
            lengths.memberLength = 0;
            lengths.departLength = len2;
            return lengths;
        }
        if (!len2) {
            lengths.memberLength = len1;
            lengths.departLength = 0;
            return lengths;
        }
        if (len1 < 6) {
            lengths.memberLength = len1;
            lengths.departLength = len2 > (10 - len1) ? (10 - len1) : len2;
            return lengths;
        }
        if (len2 < 6) {
            lengths.departLength = len2;
            lengths.memberLength = len1 > (10 - len2) ? (10 - len2) : len1;
            return lengths;
        }
        lengths.departLength = 5;
        lengths.memberLength = 5;
        return lengths;
    },

    showInviteModal: function() {
        InviteMember.show({
            orgId: global.data.currentOrg.get("id")
        });
    },

    // TODO 没有用到
    handleThrottle: function(fn, threshhold, scope) {
        threshhold || (threshhold = 250);
        var last,
            deferTimer;
        return function() {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function() {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        };
    },

    show: function() {
        this.$el.show();
    },

    hide: function() {
        this.$el.hide();
    },

    destroy: function() {
        this.remove();
    }

});

module.exports = View;
