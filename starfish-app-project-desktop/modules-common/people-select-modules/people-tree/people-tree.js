var $ = require("modules-common/jquery/jquery.js"),
	Backbone = require("modules-common/backbone/backbone.js"),
	_ = require("modules-common/underscore/underscore.js"),
	TreeParent = require("./tree-parent/tree-parent.js"),
	TreeNode = require("./tree-node/tree-node.js"),
	point = require("modules-common/point/point.js");

var setting = {
	onlySelect: false,              //只允许选中， 不能取消
	enableSelectParent: false,      //父节点也是可选的
	isPaging: false,                //是否分页
	pageSize: 20,                   //分页的大小
	dataFilter: function(response){ //类似于jquery的dataFilter，用来转换服务器的返回的数据
		response = response.replace("<", "&lt;");
		response = response.replace(">", "&gt;");
		return response;
	},
	createUrl: null                //fn类型，创建异步请求的URL
};

var SelectedList = Backbone.Collection.extend({
	modelId: function(attrs){
		return attrs.type +""+ attrs.id;
	}
});

var View = Backbone.View.extend({

	attributes:{
		"class": "people-tree"
	},

	tagName:"ul",

	initialize: function( option, list ){
		option = _.extend( {}, setting, option );
		this.option = option;
		// this.selectedList = new SelectedList();
		this.selectedList = option.selectedList;
		this.render();
		this.initEvent();

		if ( list ) {
			this.setData( list );
		}
	},

	render: function(){
		
	},

	initEvent: function(){
		var that = this;

		this.listenTo( this.selectedList, "add", function(model){
			var obj = model.toJSON(),
				id = that.selectedList.modelId(obj);

			that.$el.find(".JS-group[data-id="+id+"]").addClass("selected");
			that.$el.find(".JS-item[data-id="+id+"]").addClass("selected");

			// that.trigger("select", obj);
		});

		this.listenTo( this.selectedList, "remove", function(model, list, option){
			
			var obj = model.toJSON(),
				id = that.selectedList.modelId(obj);

			that.$el.find(".JS-group[data-id="+id+"]").removeClass("selected");
			that.$el.find(".JS-item[data-id="+id+"]").removeClass("selected");
			
			// that.trigger("unselect", obj);
		});
	},

	openRoot: function(){
		this.$el.find(">.JS-group>.JS-group-hd>.JS-arrow").trigger("click");
	},

	loadData: function(list){
		var that = this;

		var option = _.extend({
			treeView: this,
			selectedList: that.selectedList
		}, that.option);

		_.each( list, function(obj) {
			var view;
			if ( obj.isParent ){
				view = new TreeParent({
					model: new Backbone.Model(obj)
				}, option);
			} else {
				view = new TreeNode({
					model: new Backbone.Model( obj )
				}, option);
			}

			that.$el.append( view.$el );
		});
	},

	// select: function(obj){
	// 	this.selectedList.add(obj);
	// },

	// unselect: function(obj){
	// 	var id = this.selectedList.modelId(obj),
	// 		model = this.selectedList.get(id);
		
	// 	if ( model && this.selectedList.indexOf( model ) < 0 ) {
	// 		return;
	// 	}

	// 	this.selectedList.remove(id);
	// },

	show: function(){
		this.$el.show();
	},

	hide: function(){
		this.$el.hide();
	},

	destroy: function(){
		this.remove();
	}
});

module.exports = View;