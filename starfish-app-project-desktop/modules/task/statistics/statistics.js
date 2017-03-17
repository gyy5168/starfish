var $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    dateTool = require("modules-common/tools/date.js"),
    point = require("modules-common/point/point.js"),
    PeopleSelect = require("./people-select/people-select.js");

var Chart = require("modules-common/chart/chart.js");

var LINE_STYLE = {
    complete: {
        fillColor: "rgba(139,189,232,0.3)",
        strokeColor: "rgba(139,189,232,1)",
        pointColor: "rgba(139,189,232,1)",
        pointLabelFontColor: "#fff",
        pointStrokeColor: "#fff",
        pointDotRadius: 20
            // pointDot : false,
    },
    uncomplete: {
        fillColor: "rgba(236,142,153,0.3)",
        strokeColor: "rgba(236,142,153,1)",
        pointColor: "rgba(236,142,153,1)",
        pointStrokeColor: "#fff"
    }
};

var View = Backbone.View.extend({

    tagName: "div",

    attributes: {
        "class": "statistics-view"
    },

    initialize: function() {
        this.render();
        this.initEvent();
        global.modules.statistics = this;
    },

    initEvent: function() {
        var that = this;

        this.$loadError.on("click", function() {
            that.load();
        });

        this.$edit.on("click", function(event) {
            var offset = that.$edit.offset(),
                left = offset.left,
                top = offset.top + that.$edit.height();

            if (!that.peopleSelect) {

                that.peopleSelect = new PeopleSelect({
                    projectId: that.projectModel.get("id")
                });

                that.listenTo(that.peopleSelect, "select", function(obj) {
                    handle(obj);
                    that.peopleSelect.hide();
                });

                that.listenTo(that.peopleSelect, "hide", function() {
                    that.stopListening(that.peopleSelect);
                    that.peopleSelect.destroy();
                    that.peopleSelect = null;
                });
            }

            that.peopleSelect.toggle({
                css: {
                    left: left,
                    top: top
                }
            });

            event.stopPropagation();
        });

        function handle(obj) {
            that.memberId = obj.id;
            that.$name.text(obj.name);
            that.load();
        }
    },

    render: function() {

        this.$el.append(__inline("statistics.html"));
        $("#wraper").append(this.$el);

        this.$unchart = this.$el.find(".JS-un-chart");
        this.$chart = this.$el.find(".JS-chart");
        this.$edit = this.$el.find(".JS-select");
        this.$name = this.$el.find(".JS-name");
        this.$completeCount = this.$el.find(".JS-cp-count");
        this.$uncompleteCount = this.$el.find(".JS-un-count");

        this.$loading = this.$el.find(".JS-loading");
        this.$loadError = this.$el.find(".JS-error");

        this.renderChart();
    },

    renderChart: function() {
        var ctx;
        ctx = this.$chart.find("canvas")[0].getContext("2d");
        this.chart = new Chart(ctx);

        ctx = this.$unchart.find("canvas")[0].getContext("2d");
        this.unchart = new Chart(ctx);

        // 获取前面六天的日期
        var labels = [],
            date = +(new Date()),
            label;

        labels.unshift("今天");
        for (var i = 1; i < 7; i++) {
            label = dateTool.formatDate(new Date(date - i * 86400000), "MM.dd");
            labels.unshift(label);
        }

        this.chart = this.chart.Line({
            labels: labels,
            datasets: [{
                fillColor: "rgba(139,189,232,0.3)",
                strokeColor: "rgba(139,189,232,1)",
                pointColor: "rgba(139,189,232,1)",
                pointLabelFontColor: "#fff",
                pointStrokeColor: "#fff",
                data: [0, 0, 0, 0, 0, 0, 0]
            }]
        }, {
            // responsive: true
        });

        this.unchart = this.unchart.Line({
            labels: labels,
            datasets: [{
                fillColor: "rgba(236,142,153,0.3)",
                strokeColor: "rgba(236,142,153,1)",
                pointColor: "rgba(236,142,153,1)",
                pointStrokeColor: "#fff",
                data: [0, 0, 0, 0, 0, 0, 0]
            }]
        }, {
            // responsive: true
        });
    },

    show: function() {
        if (this.showing) {
            return;
        }
        this.showing = true;
        this.$el.show();
    },

    hide: function() {
        if (this.showing) {
            this.showing = false;
            this.$el.hide();
        }
    },

    set: function(option) {
        this.projectModel = option.projectModel;

        if (this.memberId === 0) {
            return;
        }
        this.memberId = 0;
        this.$name.text("全部成员");
        this.load();
    },

    load: function() {
        this.$loading.show();
        this.$loadError.hide();

        var that = this;

        // 获取向前6天的日期
        var date = new Date();
        date = new Date((+date) - 6 * 86400000);
        date = dateTool.formatDate(date, "yyyy-MM-dd");

        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/projects/" + this.projectModel.id + "/members/" + this.memberId + "/statistic/record?start=" + date,
            type: "GET",
            success: function(response) {
                if (response.errcode === 0) {
                    that.updateData(response.data);
                } else {
                    that.$loadError.show();
                    point.shortShow({
                        type: "error",
                        text: global.tools.getErrmsg(response.errcode)
                    });
                }
            },
            error: function() {
                that.$loadError.show();
                point.shortShow({
                    type: "error",
                    text: "网络异常，请检查您的网络设置"
                });
            },
            complete: function() {
                that.$loading.hide();
            }
        });
    },

    updateData: function(data) {
        var lastData = data[data.length - 1];
        this.$completeCount.text(lastData.completed);
        this.$uncompleteCount.text(lastData.uncompleted);
        this.updateChart(data);
    },

    updateChart: function(data) {
        var completeData = [],
            uncompleteData = [];
        $.each(data, function(index, obj) {
            completeData.push(obj.completed);
            uncompleteData.push(obj.uncompleted);
        });

        update(this.chart, completeData);
        update(this.unchart, uncompleteData);



        function update(chart, data) {
            $.each(data, function(index, value) {
                chart.datasets[0].points[index].value = value;
            });
            chart.update();
        }
    },

    // setCharts: function(data) {
    // 	var labels = [];
    // 	var completeDatas = [];
    // 	var uncompleteDatas = [];

    // 	$.each(data, function(i, obj) {
    // 		labels.push(dateTool.convertDate3(obj.timestamp));
    // 		completeDatas.push(obj.completed);
    // 		uncompleteDatas.push(obj.uncompleted);
    // 	});
    // 	this.setLine(this.$unchart, "uncomplete", labels, uncompleteDatas);
    // 	this.setLine(this.$chart, "complete", labels, completeDatas);

    // 	var last = data[data.length - 1];
    // 	this.$completeCount.text(last.completed);
    // 	this.$uncompleteCount.text(last.uncompleted);
    // },

    // setLine: function($chart, style, labels, datas) {
    // 	var width = $chart.width();
    // 	var height = $chart.height();

    // 	$chart.empty().append('<canvas width="' + width + 'px" height="' + height + 'px"></canvas>');

    // 	var steps = 5;
    // 	var stepWidth = 1;
    // 	var maxCount = 0;
    // 	$.each(datas, function(i, count) {
    // 		if (count > maxCount) {
    // 			maxCount = count;
    // 		}
    // 	});

    // 	if (maxCount % 5 === 0) {
    // 		stepWidth = maxCount / 5;
    // 	} else {
    // 		stepWidth = Math.floor(maxCount / 5) + 1;
    // 	}

    // 	var ctx = $chart.find("canvas")[0].getContext("2d");
    // 	var myNewChart = new Chart(ctx);

    // 	var data = {
    // 		labels: labels,
    // 		datasets: [{
    // 			fillColor: LINE_STYLE[style].fillColor,
    // 			strokeColor: LINE_STYLE[style].strokeColor,
    // 			pointColor: LINE_STYLE[style].pointColor,
    // 			pointStrokeColor: LINE_STYLE[style].pointStrokeColor,
    // 			data: datas
    // 		}]
    // 	};

    // 	myNewChart.Line(data, {
    // 		// scaleOverride: true,
    // 		// scaleSteps: steps,
    // 		// scaleStepWidth: stepWidth,
    // 		// scaleStartValue: 0
    // 	});
    // },

    destroy: function() {
        this.peopleSelect && this.peopleSelect.destroy();
        this.chart.destroy();
        this.unchart.destroy();
        this.remove();
        global.modules.statistics = null;
    }
});

module.exports = View;
