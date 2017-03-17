var $ = require("modules-common/jquery/jquery.js"),
    _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    // list = require("modules/collections/tasks.js"),
    ItemView = require("./task-list-item/task-list-item.js"),
    urlTool = require("modules-common/tools/url.js"),
    point = require("modules-common/point/point.js"),
    peopleTool = require("modules-common/tools/people.js");

var View = Backbone.View.extend({

    tagName: "div",
    // 任务列表过滤值
    filterValue: "",

    pageSize: 30,

    pageNum: 1,

    attributes: {
        "class": "task-list"
    },

    template: __inline("task-list.tmpl"),

    initialize: function(option) {
        this.list = new Backbone.Collection();
        this.render();
        this.initEvent();

        global.modules.taskList = this;
    },

    render: function() {
        this.$el.html(__inline("task-list.html"));

        this.$content = this.$el.find(".JS-content");
        this.$list = this.$content;
        this.$loading = this.$el.find(".JS-loading");
        this.$error = this.$el.find(".JS-error");
        this.$errorBtn = this.$error.find(".JS-btn");
        this.$moreLoading = this.$el.find(".JS-more-loading");
        this.$moreError = this.$el.find(".JS-more-error");
        this.$noMore = this.$el.find(".JS-no-more");
        this.$empty = this.$el.find(".JS-empty");
        this.$listWraper = this.$list.parent();
    },

    initEvent: function() {
        var that = this;
        this.listenTo(this.list, "add", this.addItem);
        this.listenTo(this.list, "remove", function(model) {
            this.removeItem(model, true);
        });

        this.listenTo(this.list, "reset", function(list, option) {
            $.each(option.previousModels, function(index, model) {
                that.removeItem(model);
            });
            that.list.each(function(model, index, list) {
                that.addItem(model, list);
            });

            this.adjustIndex();

            that.removeTaskPlaceholder();

            that.selected = null;
        });

        this.listenTo(this.list, "add remove reset", function() {
            if (that.list.length === 0) {
                that.$empty.show();
            } else {
                that.$empty.hide();
            }
        });

        this.listenTo(this.list, "change:is_completed", function(model, value) {
            if (that.completed === "uncompleted" && value === 1) {
                that.list.remove(model);
            } else if (that.completed === "completed" && value === 0) {
                that.list.remove(model);
            }
        });

        this.listenTo(global.event, "taskRemoved", function(id) {
            that.list.remove(id);
        });

        // 当列表项的dom被删除后， 重新排下序号
        this.listenTo(this.list, "removed", function() {
            that.adjustIndex();
        });

        this.listenTo(global.event, "showTaskCreate", function() {
            that.addTaskPlaceholder();
        });

        this.listenTo(global.event, "showStatistics", function() {
            that.removeTaskPlaceholder();
        });

        this.listenTo(global.event, "showTaskDetail", function() {
            that.removeTaskPlaceholder();
        });

        this.listenTo(global.event, "taskCreated", function(option) {
            that.addCreatedTask(option);
        });

        this.listenTo(global.event, "cancelTaskCreate", function(option) {
            that.removeTaskPlaceholder();
        });

        this.$el.on("click", ".JS-status", function(event) {
            var id = $(this).data("id"),
                name = $(this).data("name"),
                value;

            var router = global.modules.router;

            value = "task?" + that.param;
            value = urlTool.removeParam(value,"status");
            value = value +"&status=" + id;
            global.data.conditionList.add({
                type: "status",
                typeName: "状态",
                id: id,
                name: name
            });
            router.navigate(value, {
                trigger: true
            });
            event.stopPropagation();
        });

        this.$el.on("click", ".JS-tag", function(event) {
            var id = $(this).data("id"),
                name = $(this).text(),
                value;

            var router = global.modules.router;

            value = "task?" + that.param + "&key_tag_id=" + id;
            global.data.conditionList.add({
                type: "key_tag_id",
                typeName: "标签",
                id: id,
                name: name
            });
            router.navigate(value, {
                trigger: true
            });
            event.stopPropagation();
        });

        this.$el.on("click", ".JS-charge", function(event) {
            if (that.navType == "myCompleted" || that.navType == "myUncompleted"){
                return;
            }
            var id = $(this).data("id"),
                name = $(this).text(),
                value;

            value = urlTool.removeParam(that.param, "assignee");
            value = urlTool.removeParam(value, "assignee_name");
            value = "task?" + value + "&assignee=" + id + "&assignee_name=" + name;

            global.data.conditionList.add({
                type: "assignee",
                typeName: "负责人",
                id: id,
                name: name
            });
            var router = global.modules.router;
            router.navigate(value, {
                trigger: true
            });
            event.stopPropagation();

        });

        this.$el.on("scroll", function(event) {
            if (that.noMore) {
                return;
            }

            // 当页面的高度变化时， 也会引起scroll事件，可以通过判断scrollTop是否为0过滤掉
            if (that.$el.scrollTop() === 0) {
                return;
            }

            var height = that.$el.height();

            if (this.scrollTop + that.$el.height() == this.scrollHeight) {
                that.loadMore();
            }
        });

        this.$el.on("click", ".JS-mark", function(event) {
            $(this).parent().parent().data("view").mark();
            event.stopPropagation();
        });

        this.$el.on("click", ".JS-arrow", function(event) {

            event.stopPropagation();

            if (that.widthed === "narrow") {
                global.modules.task && global.modules.task.hideRightPanel();
                return;
            }

            var $parent = $(this).parent(),
                id = $parent.data("id"),
                model = that.list.get(id);
            that.selected = $parent;
            global.event.trigger("showTaskDetail", {
                taskModel: model
            });

        });

        this.$el.on("mousedown", "li", function(event) {
            if (event.button !== 0) {
                return;
            }

            if (event.ctrlKey || event.metaKey) {
                $(this).addClass("selected");
            } else {
                that.$el.find("li.selected").removeClass("selected");
                $(this).addClass("selected");
            }
        });

        this.$el.on("click", "li", function() {

            if (that.widthed != "narrow") {
                return;
            }
            var id = $(this).data("id"),
                model = that.list.get(id);

            // 选中此行
            // that.$el.find("li.selected").removeClass("selected");
            // $(this).addClass("selected");
            that.selected = $(this);
            global.event.trigger("showTaskDetail", {
                taskModel: model
            });
        });

        this.$errorBtn.on("click", function() {
            that.set(that.filterValue);
        });

        this.$moreError.on("click", function() {
            that.loadMore();
        });

        this.initSlideEvent();
        this.initDragEvent();

    },

    // 滑动选取
    initSlideEvent: function() {
        var that = this,
            $doc = $(document),
            y;

        this.$el.on("mousedown", "li", function(event) {
            if (event.button !== 0) {
                return;
            }
            y = event.pageY;

            $doc.on("mousemove", move);
            $doc.on("mouseup", up);
        });

        function up() {
            $doc.off("mouseup", up);
            $doc.off("mousemove", move);
        }

        function move(event) {
            var top, height;

            if (event.pageY > y) {
                top = y;
                height = event.pageY - y;
            } else {
                top = event.pageY;
                height = y - event.pageY;
            }

            select(top, height);
        }

        var select = _.throttle(handle, 100);

        function handle(top, height) {
            var flag = false; //增加效率
            that.$list.find("li").removeClass("selected");
            that.$list.find("li").each(function() {
                var $this = $(this),
                    offset = $this.offset(),
                    iheight = $this.height();

                if ((top < offset.top + iheight) && (top + height > offset.top)) {
                    flag = true;
                    $this.addClass("selected");
                } else if (flag) {
                    return false;
                }
            });
        }
    },

    // 拖动排序
    initDragEvent: function() {
        var that = this,
            $doc = $(document),
            docHeight,
            $node, //排序移动到此节点
            numHeight,
            $num, //显示数字
            down, //鼠标是否点下
            dir; //方向

        this.dragCache = [];

        this.$el.on("mousedown", ".JS-drag", function(event) {
            if (event.button !== 0) {
                return;
            }

            if (that.draging) {
                point.shortShow({
                    text: "网络较慢，请稍后拖拽"
                });
                event.stopPropagation();
                return;
            }
            down = true;
            $node = null;
            dir = null;
            that.dragCache = [];
            that.draging = true;
            docHeight = $doc.height();

            $doc.on("mousemove", move);
            $doc.on("mouseup", up);

            // 获取父元素
            var $parent = $(this).parent().parent();

            // 如果任务被选中，则拖动列表中所有的被选中的任务
            if ($parent.hasClass("selected")) {

                that.$list.find("li").each(function() {
                    var $this = $(this),
                        id;

                    if ($this.hasClass("selected")) {
                        id = $this.data("id");
                        addCache(id, $this);
                    }
                });

            } else {
                var id = $parent.data("id");
                addCache(id, $parent);
            }

            $num = $("<span class='drag-num'>" + that.dragCache.length + "</span>");
            $("#wraper").append($num);
            $num.offset({
                top: event.pageY > (docHeight - 40) ? (docHeight - 40) : event.pageY,
                left: event.pageX
            });

            event.stopPropagation();
        });

        // 记录需要排序的节点信息
        function addCache(id, $node) {
            that.dragCache.push({
                $node: $node,
                id: id
            });
            $node.addClass("draging");
        }

        var move = function(event) {
            $num.offset({
                top: event.pageY > (docHeight - 40) ? (docHeight - 40) : event.pageY,
                left: event.pageX
            });

            throttleHandle(event);
        }

        var throttleHandle = _.throttle(handle, 100),
            height; //缓存任务项的高度

        // 添加移动的效果
        function handle(event) {
            if (!down) {
                return;
            }
            that.$list.find("li").removeClass("drag-up drag-down");

            that.$list.find("li").each(function() {
                var $this = $(this),
                    offset;

                offset = $this.offset();
                height = height || $this.height();

                if (event.pageY >= offset.top && event.pageY <= offset.top + height) {

                    if (event.pageY > offset.top + height / 2) {
                        $this.addClass("drag-down");
                        $node = $this;
                        dir = "after";
                    } else {
                        var $prev = $this.prev();
                        if ($prev.length > 0) {
                            $prev.addClass("drag-down");
                            $node = $prev;
                            dir = "after";
                        } else {
                            $node = $this;
                            dir = "before";
                            $this.addClass("drag-up");
                        }
                    }
                    return false;
                }
            });
        }

        function up() {
            $doc.off("mouseup", up);
            $doc.off("mousemove", move);
            that.$list.find("li").removeClass("drag-up drag-down");
            down = false;
            $num.remove();
            //如果拖动到自身的上面或者下面，则没有意义
            if (!$node) {
                that.draging = false;
                that.$list.find("li").removeClass("draging");
                return;
            }
            if (dir === "after") {
                if ($node.hasClass("draging")) {
                    that.draging = false;
                    that.$list.find("li").removeClass("draging");
                    return;
                }
                $after = $node.next();
                if ($after && $after.hasClass("draging")) {
                    that.draging = false;
                    that.$list.find("li").removeClass("draging");
                    return;
                }
            }

            changeLocation();
            that.updateOrder(that.dragCache, $node, dir);
        }

        // 调整UI，改变任务项的位置
        function changeLocation() {

            if (dir === "before") {
                $.each(that.dragCache, function(index, option) {
                    $node.before(option.$node);
                });
            } else {
                var $beforeNode = $node;
                $.each(that.dragCache, function(index, option) {
                    $beforeNode.after(option.$node);
                    $beforeNode = option.$node;
                });
            }
            that.adjustIndex();
        }
    },

    // getSelected: function(){
    //  if ( this.selected ) {
    //      return this.selected.data("id");
    //  }
    // },

    // 返回选中的任务ID
    getSelected: function() {
        // 如果有选中的列表项，返回第一个
        var $selected = this.$list.find("li.selected:eq(0)");
        if ($selected.length) {
            return $selected.data("id");
        }

        // 如果有占位符， 返回它前面的
        if (this.$taskPlaceholder) {
            return this.$taskPlaceholder.prev().data("id");
        }

        return undefined;
    },

    addTaskPlaceholder: function() {
        if (!this.$taskPlaceholder) {
            this.$taskPlaceholder = $("<div class='task-placeholder'></div>");
        }

        var $selected = this.$list.find("li.selected:eq(0)");
        if ($selected.length) {
            $selected.after(this.$taskPlaceholder);
        } else {
            this.$list.prepend(this.$taskPlaceholder);
        }

        // var taskId = this.getSelected();
        // if ( taskId ) {
        //  list.get(taskId).view.$el.after(this.$taskPlaceholder);
        // } else {
        //  this.$list.prepend(this.$taskPlaceholder);
        // }

        this.$list.find("li.selected").removeClass("selected");
    },

    removeTaskPlaceholder: function() {
        if (!this.$taskPlaceholder) {
            return;
        }
        this.$taskPlaceholder.remove();
        this.$taskPlaceholder = null;
    },

    updateOrder: function(arr, $node, dir) {
        var str = "",
            arrStr = [],
            id = $node.data("id"),
            that = this;

        $.each(that.dragCache, function(index, option) {
            arrStr.push(option.id);
        });

        str = arrStr.join(",");
        $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks/" + str + "/order",
            type: "PATCH",
            data: JSON.stringify({
                order: dir,
                task_id: id
            }),
            success: success,
            error: error,
            complete: complete
        });

        function success(data) {
            if (data.errcode === 0) {
                handle("success");
            } else {
                handle("error");
            }
        }

        function error(data) {
            handle("error");
        }

        function complete() {
            that.draging = false;
        }

        // 如果成功， 则调整list的顺序和UI保持一致， 否则回退UI
        function handle(status) {
            if (status === "success") {
                // 修改list的排序
                var targetModel = that.list.get(id),
                    models = [];
                $.each(arr, function(index, option) {

                    var model = that.list.get(option.id);
                    that.list.remove(model, {
                        silent: true
                    });
                    models.push(model);
                });

                var index = that.list.indexOf(targetModel);

                if (dir === "before") {

                    $.each(models, function(i, model) {
                        that.list.add(model, {
                            at: index + i,
                            silent: true
                        });
                    });

                } else {
                    $.each(models, function(i, model) {
                        that.list.add(model, {
                            at: index + 1 + i,
                            silent: true
                        });
                    });
                }

            } else {
                // 回退UI

                $.each(arr, function(i, option) {
                    var model = that.list.get(option.id),
                        index = that.list.indexOf(model);

                    if (index === 0) {
                        that.$list.prepend(option.$node);
                    } else {
                        that.list.at(index - 1).view.$el.after(option.$node);
                    }
                });
            }
        }
    },

    // 添加创建的任务
    addCreatedTask: function(data) {
        if (this.completed !== "uncompleted") {
            return;
        }
        if (!data.after) {
            this.list.add(data.data, {
                at: 0
            });
        } else {
            var model = this.list.get(data.after),
                index = this.list.indexOf(model);
            this.list.add(data.data, {
                at: index + 1
            });
        }

        // 选中先创建的任务
        this.list.get(data.data.id).view.$el.trigger("click");
    },

    set: function(param) {
        this.param = param;
        this.filterValue = urlTool.removeParam(param, "navType");
        this.analyze(param);
        this.load();
    },

    setWidth: function(str) {
        this.widthed = str;
    },

    // 解析出字符串中的值和状态
    analyze: function(param) {

        this.projectId = urlTool.getParam(param, "id")[0];
        var complete = param.indexOf("is_completed=1") >= 0,
            uncomplete = param.indexOf("is_completed=0") >= 0;

        if (complete && uncomplete) {
            this.completed = "all";
        } else if (complete && !uncomplete) {
            this.completed = "completed";
        } else if (!complete && uncomplete) {
            this.completed = "uncompleted";
        } else {
            this.completed = "all";
        }

        this.navType = urlTool.getParam(param, "navType")[0] || "uncompleted";

        if (this.completed == "uncompleted") {
            this.$list.addClass("status-uncompleted");
        } else {
            this.$list.removeClass("status-uncompleted");
        }
    },

    // 填充一些默认的参数
    fill: function(param) {
        if (this.completed === "uncompleted") {
            return urlTool.replaceParam(param, "order_by", "order");
        } else if (this.completed === "all") {
            return urlTool.replaceParam(param, "order_by", "-date_added");
        } else if (this.completed === "completed") {
            return urlTool.replaceParam(param, "order_by", "-date_completed");
        }
    },

    load: function() {
        var that = this;

        // 加载任务列表，将统计显示出来
        global.modules.task.showStatistics(true);

        if (this.ajaxObj) {
            this.ajaxObj.abort();
        }
        this.clear();
        this.$loading.show();
        this.ajaxObj = $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks?" + this.fill(this.filterValue) + "&ps=" + this.pageSize,
            type: "GET",
            success: success,
            error: error,
            complete: complete
        });

        function success(response) {
            if (response.errcode === 0) {
                that.$content.show();
                that.list.reset(response.data);
                if (response.data.length === that.pageSize) {
                    that.$moreLoading.show();
                    that.noMore = false;
                } else {
                    that.noMore = true;
                }
            } else {
                point.shortShow({
                    type: "error",
                    text: global.tools.getErrmsg(response.errcode)
                });
                that.$error.show();
            }
        }

        function error(jqXHR, textStatus) {
            if (textStatus === "abort") {
                return;
            }
            that.$error.show();
            point.shortShow({
                type: "error",
                text: "网络异常，请检查您的网络设置"
            });
        }

        function complete() {
            that.$loading.hide();
            this.ajaxObj = null;
        }
    },

    // 加载更多
    loadMore: function() {
        var that = this;

        if (this.moreLoading) {
            return;
        }
        this.moreLoading = true;

        if (this.ajaxObj) {
            this.ajaxObj.abort();
        }

        var filterValue = this.fill(this.filterValue) + "&ps=" + this.pageSize;

        filterValue = urlTool.replaceParam(filterValue, "pn", this.pageNum + 1);

        this.$moreLoading.show();
        this.$moreError.hide();

        this.ajaxObj = $.ajax({
            url: global.data.org.get("domain") + "/orgs/" + global.data.org.get("id") + "/project/tasks?" + filterValue,
            type: "GET",
            success: success,
            error: error,
            complete: complete
        });

        function success(response) {
            if (response.errcode === 0) {
                that.$content.show();
                $.each(response.data, function(index, data) {
                    that.list.add(data);
                });
                that.adjustIndex();
                if (response.data.length === that.pageSize) {
                    that.$moreLoading.show();
                    that.noMore = false;
                } else {
                    that.$moreLoading.hide();
                    that.noMore = true;
                    that.$noMore.show();
                }
                that.pageNum = that.pageNum + 1;
            } else {
                // point.shortShow({
                //  type: "error",
                //  text: data.errmsg
                // });
                that.$moreLoading.hide();
                that.$moreError.show();
            }
        }

        function error(jqXHR, textStatus) {

            that.$moreLoading.hide();
            that.$moreError.show();
        }

        function complete() {
            that.moreLoading = false;
            that.ajaxObj = null;
        }
    },

    addItem: function(model, collections, option) {

        var view = new ItemView({
            model: model,
            parentView: this
        });
        if(this.navType=="myCompleted"||this.navType=="myUncompleted"){
            view.clearChargeTitle();
        }
        view.parentView = this;
        // this.$list.append(view.$el);

        if (option === undefined || !$.isNumeric(option.at)) {
            this.$list.append(view.$el);
            return;
        }

        if (option.at === 0) {
            this.$list.prepend(view.$el);
        } else {
            this.list.at(option.at - 1).view.$el.after(view.$el);
        }

        this.adjustIndex();
    },

    removeItem: function(model, hasAnim) {
        var id = this.selected && this.selected.data("id");
        if (id == model.get("id")) {
            this.selected = null;
        }
        model.view.destroy(hasAnim);
        this.adjustIndex();
    },

    clear: function() {
        this.pageNum = 1;
        this.$error.hide();
        this.$loading.hide();
        this.$moreError.hide();
        this.$moreLoading.hide();
        this.$list.hide();
        this.$noMore.hide();
        this.$empty.hide();
    },

    // 调整任务的序列号
    adjustIndex: function() {
        this.$list.find("li").each(function(index) {
            var view = $(this).data("view");
            if (view) {
                view.setIndex(index + 1);
            }
        });
    },

    destroy: function() {
        this.remove();
        global.modules.taskList = null;
    }

});

module.exports = View;
