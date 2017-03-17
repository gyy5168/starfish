/*
 * @file 选着部门、人员、讨论组
 * @version 0.0.1
 */
 // 0.0.1 选择部门时添加包含子部门的文案
var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js"),
    _ = require("modules-common/underscore/underscore.js"),
    topBar = require("modules-common/top-bar/top-bar.js"),
    SelectPanel = require("./select-panel/select-panel.js"),
    SearchPanel = require("./search-panel/search-panel");

var SelectedList = Backbone.Collection.extend({
    modelId: function (attrs) {
        return attrs.type + "" + attrs.id;
    }
});

var View = Backbone.View.extend({

    attributes: {
        "class": "select-all"
    },

    back: function () {
        this.destroy();
    },

    initialize: function (option) {
        this.title = option.title || "未命名";
        this.callback = option.callback;

        this.prevTitle = topBar.getTitle();
        topBar.setTitle("选择成员");

        this.prevBack = topBar.getBack();
        topBar.setBack(_.bind(this.back, this));

        this.prevMenu = topBar.getMenu();
        topBar.setMenu([{
            name: "确定",
            callback: _.bind(this.okHandle, this)
        }]);

        this.selectedList = new SelectedList();
        this.render();
        this.initEvent();
    },

    render: function () {
        this.$el.html(__inline("select-all.html"));
        this.$input = this.$el.find(".JS-search-input");
        this.$inputClean = this.$el.find(".JS-input-clean");
        this.$bd = this.$el.find(".JS-bd");

        this.modules = {};
        this.modules.searchPanel = new SearchPanel({
            selectedList: this.selectedList
        });
        this.modules.selectPanel = new SelectPanel({
            selectedList: this.selectedList
        });

        this.$bd.append(this.modules.searchPanel.$el);
        this.$bd.append(this.modules.selectPanel.$el);

        global.$doc.append(this.$el);
    },

    initEvent: function () {
        var that = this;

        this.$inputClean.on("click", function () {
            that.$input.val("").trigger("input");
        });

        this.$input.on("input", function () {
            var value = $(this).val();

            value = value.replace(/(^\s*)|(\s*$)/g, "");
            value = encodeURIComponent(value)

            if (value === "") {
                that.modules.selectPanel.show();
                that.modules.searchPanel.hide();
                that.$inputClean.hide();
                return false;
            }

            that.$inputClean.show();

            that.modules.selectPanel.hide();
            that.modules.searchPanel.show();

            that.modules.searchPanel.search(value);
        });

        this.listenTo(this.selectedList, "add remove", function () {
            var num = "";
            if (that.selectedList.length > 0) {
                num = "(" + that.selectedList.length + ")";
            }
            topBar.showMenu([{
                name: "确定" + num,
                callback: _.bind(that.okHandle, that)
            }]);
        });
    },

    okHandle: function () {
        if (this.selectedList.length === 0) {
            point.shortShow({
                text: "你还没有选择"
            });
            return;
        }
        this.callback && this.callback(this.selectedList.toJSON());
        this.destroy();
    },

    destroy: function () {
        this.remove();
        this.modules.selectPanel.destroy();
        this.modules.searchPanel.destroy();

        topBar.setTitle(this.prevTitle);
        topBar.setBack(this.prevBack);
        topBar.setMenu(this.prevMenu);
    }
});

module.exports = View;