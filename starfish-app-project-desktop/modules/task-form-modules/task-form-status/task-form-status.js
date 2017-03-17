var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

var View = Backbone.View.extend({
    tagName: "div",

    attributes: {
        class: "task-form-status"
    },

    initialize: function(option) {
        this.render(option);
        this.initEvent();
    },

    render: function(option) {
        this.$el.html(__inline("task-form-status.html"));

        this.$status = this.$el.find(".status");
        this.$edit = this.$el.find(".status-edit");
        this.$edit.tooltipster({
            position: 'right'
        });
        this.$list = this.$el.find(".status-list");
        if (option && option.type) {
            this.$el.addClass(option.type);
        }
    },

    initEvent: function() {
        var that = this;

        this.$edit.on("click", function() {
            that.$list.show();
            event.stopPropagation();
        });



        this.$list.on("click", "li", function(event) {
            var id = $(this).data("id"),
                name = $(this).text();
            that.$status.data("id", id);
            that.$status.text(name);
            that.$list.hide();
            if (id != that.status) {
                that.trigger("change", id);
            }
        });

        this.hideList = function() {
            that.$list.hide();
        };

        $(document).on("click.statusList", this.hideList);
    },

    get: function() {
        return this.$status.data("id");
        // return {
        //     id: parseInt(this.$status.data("id")),
        //     name: this.$status.text(),
        //     is_system: 1
        // };
    },

    set: function(status) {
        if (!status.name) {
            status.name = "未设置";
        }
        this.status = status.id;
        this.$status.data("id", status.id);
        this.$status.text(status.name);
        this.$edit.show();
    },

    clear: function() {
        // this.$list.find("li:eq(0)").trigger("click");
    },

    setStatusList: function(status) {
        var statusListStr = "";
        for (var i = 0; i < status.length; i++) {
            var item = status[i];
            if (item.name == "待处理") {
                this.$status.data("id", item.id);
            }
            if (item.name != "逾期") {
                statusListStr += '<li data-id=' + item.id + ' data-type=' + item.is_system + ' >' + item.name + ' </li>';
            }
        }
        this.$list.html(statusListStr);
    },

    disableChangeStatus: function() {
        this.$status.text("完成");
        this.$edit.hide();
    },

    destroy: function() {
        $(document).off("click.statusList", this.hideList);
        this.remove();
    }
});

module.exports = View;
