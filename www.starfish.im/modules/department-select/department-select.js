var Backbone = require("modules-common/backbone/backbone.js"),
	SelectDepartment = require("./select-department/select-department.js"),
    SelectedDepartment = require("./selected-department/selected-department.js");

/*  @file 部门选择组件
*   传递 { data: [], callback: function(data){} }, 进行实例化
*   data属性: 模块实例化后, 会将data的值添加到已选择的列表中
*   callback属性: 是点击组件的确定后, 执行的回调函数, 会将已选着的部门的数据传递进去
* */
var View = Backbone.View.extend({

	attributes: {
		class: "department-select"
	},

	initialize: function( options ) {
        options = options || {};
		this.selectedList = new Backbone.Collection();
        this.callback = options.callback;
		this.render();
        this.initEvent();
        if ( options.data ) {
            this.selectedList.reset(options.data);
        }
	},

	render: function() {
		this.$el.html(__inline("department-select.html"));

        this.$selectDepartment = this.$el.find(".JS-select-department");
        this.$selectedDepartment = this.$el.find(".JS-selected-department");
        this.$ok = this.$el.find(".JS-ok");
        this.$cancel = this.$el.find(".JS-cancel");

		this.modules = {};
		this.modules.selectDepartment = new SelectDepartment({
			selectedList: this.selectedList
		});
		this.modules.selectedDepartment = new SelectedDepartment({
			selectedList: this.selectedList
		});

        this.$selectDepartment.append(this.modules.selectDepartment.$el);
        this.$selectedDepartment.append(this.modules.selectedDepartment.$el);

        global.$doc.append( this.$el );
	},

    initEvent: function(){
        var that = this;

        this.$ok.on("click", function(){
            var data = that.get();
            that.destroy();
            if ( that.callback ) {
                that.callback(data);
            }
        });

        that.$cancel.on("click", function(){
            that.destroy();
        });
    },

    get: function(){
        return this.selectedList.toJSON();
    },

	destroy: function(){
        this.modules.selectDepartment.destroy();
        this.modules.selectedDepartment.destroy();
		this.remove();
	}
});

module.exports = View;