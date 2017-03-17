var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    _ = require("modules-common/underscore/underscore.js"),
    TopBar = require("modules-common/top-bar/top-bar.js");

var List = Backbone.Collection.extend({
    modelId: function (attrs) {
        return attrs.type + "" + attrs.id;
    }
});


var View = Backbone.View.extend({

    attributes: {
        "class": "people-all-search-panel"
    },

    pageSize: 30,

    template: __inline("item.tmpl"),

    back: function () {
        this.destroy();
    },

    initialize: function (option) {
        this.selectedList = option.selectedList;
        this.list = new List();
        this.render();
        this.initClickEvent();
        this.initListEvent();
    },

    render: function () {
        this.$el.html(__inline("search-panel.html"));
        this.$list = this.$el.find("ul");
        this.$error = this.$el.find(".JS-error");
        this.$errorTxt = this.$error.find(".JS-common-text");
        this.$loading = this.$el.find(".JS-loading");
        this.$empty = this.$el.find(".JS-empty");
    },

    initClickEvent: function () {
        var that = this;

        this.$el.on("click", ".JS-item", function () {
            var id = $(this).data("id"),
                model = that.selectedList.get(id);

            if (model) {
                that.selectedList.remove(model);
            } else {
                that.selectedList.add(that.list.get(id).toJSON());
            }

        });

        this.$error.on("click", function () {
            that.search(that.value);
        });
    },

    initListEvent: function () {
        var that = this;
        this.listenTo(this.list, "reset", function () {
            that.$list.html("");

            if (that.list.length === 0) {
                that.$empty.show();
                that.$list.hide();
                return
            } else {
                that.$empty.hide();
                that.$list.show();
            }

            that.list.each(function (model) {
                that.addItem(model);
            });
        });

        this.listenTo(this.selectedList, "add", function (model) {
            var obj = model.toJSON(),
                id = that.list.modelId(obj);

            that.$el.find(".JS-item[data-id=" + id + "]").addClass("selected");
        });

        this.listenTo(this.selectedList, "remove", function (model) {
            var obj = model.toJSON(),
                id = that.list.modelId(obj);

            that.$el.find(".JS-item[data-id=" + id + "]").removeClass("selected");
        });
    },

    search: function (value) {
        this.$loading.show();
        this.$empty.hide();
        this.$list.hide();
        this.$error.hide();
        this.searchThrottle(value);
    },

    searchThrottle: _.debounce(function (value) {
        var that = this;

        if (this.ajaxObj) {
            this.ajaxObj.isAbort = true;
            this.ajaxObj.abort();
        }

        value = value.replace(/(^\s*)|(\s*$)/g, "");
        this.value = value;

        if (value === "") {
            this.$loading.hide();
            this.$list.show();
            this.$list.html("");
            return
        }

        return this.ajaxObj = $.ajax({
            url: global.data.org.get("domain")+ "/orgs/" + global.data.org.get("id") + "/search?q=" + value +
            "&type=100&page=1&count=" + that.pageSize,
            type: "GET",
            success: function (response) {
                if (response.errcode === 0) {
                    var arr = [];
                    _.each(response.data.data, function (obj) {
                        var result = {};
                        if (obj.type === 103) {
                            result.type = "department";
                        } else if (obj.type === 102) {
                            result.type = "group";
                        } else if (obj.type === 101) {
                            result.type = "people";
                        }

                        result.id = obj.source.id;
                        result.name = obj.source.name;
                        result.avatar = obj.source.avatar;

                        arr.push(result);
                    });
                    that.list.reset(arr);
                    that.$list.show();
                } else {
                    var errorTxt = global.tools.getErrmsg(response.errcode);
                    that.$errorTxt.text(errorTxt);
                    that.$error.show()
                }
                that.$loading.hide();
            },

            error: function (jqXHR, status) {
                if (  that.ajaxObj.isAbort) {
                    return
                }

                that.$errorTxt.text(global.texts.netError);
                that.$error.show();
                that.$loading.hide();
            },

            complete: function () {
                that.ajaxObj = null;
            }
        });
    }, 500, false),

    // 添加列表项
    addItem: function (model) {
        var obj = model.toJSON();
        obj.id = this.selectedList.modelId(obj);
        obj.className = this.selectedList.get(obj.id) ? "selected" : "";
        this.$list.append(this.template(obj));
    },

    clear: function () {
        this.$list.html("");
        this.$list.show();
        this.$loading.hide();
        this.$empty.hide();
        this.$error.hide();
        this.value = "";
    },

    show: function () {
        this.$el.show();
    },

    hide: function () {
        this.$el.hide();
    },

    destroy: function () {
        this.remove();
    }
});

module.exports = View;