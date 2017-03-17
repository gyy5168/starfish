var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	point = require("modules-common/point/point.js");

var View = Backbone.View.extend({
	tagName: "li",

	attributes: {
		class: "set-domain-item"
	},

	initialize: function(option) {
		this.parentView = option.parentView;
		this.render();
		this.initEvent();

		var name = this.model.get("name");
		if( name ) {
			this.$input.val(name);
		}
	},

	render: function() {
        var that=this;
		this.$el.html(__inline("set-domain-item.html"));
		this.$ok = this.$el.find(".JS-ok");
		this.$cancel = this.$el.find(".JS-cancel");
		this.$input = this.$el.find("input");
		this.$info = this.$el.find(".JS-info");

		this.$el.data("view", this);
		this.$el.attr("data-id", that.model.get("id"));
	},

	initEvent: function() {
		var that = this;

		// 输入就显示确定和取消按钮
		this.$input.on("input", function(){
			that.showBtn();
		});

		this.listenTo( this.model, "change:name", function(model,value){
			that.$input.val(value);
		});

		// 点击确定按钮，设置域名
		this.$ok.on("click", function(){
			if($(this).hasClass("disable")){
				return false
			}

			var value = that.$input.val();
			value = $.trim(value);

			if(!that.verify( value )) {
				return;
			}

			// 如果值没有更改，则返回
			if ( !that.isNew() && that.model.get("name") === value ) {
				that.hideInfo();
				that.hideBtn();
				return;
			}

			that.setDomain(value);
		});

		// 输入回车，相当于点击确定按钮
		this.$input.on("keydown", function( event ) {
			if ( event.keyCode === 13 ) {
				that.$ok.trigger("click");
			}
		});

		// 点击取消按钮
		this.$cancel.on("click", function(){
			// 如果域名是新的（还没有在服务器创建），则删除
			if ( that.isNew() ) {
				that.parentView.list.remove( that.model );
				return;
			}
			that.$input.val( that.model.get("name"));
			that.hideInfo();
			that.hideBtn();
		});
	},

	// 设置域名
	setDomain: function(value){
		var that = this,
			obj = this.model.toJSON(),
			ajaxType;

		if ( this.setDomaining ) {
			return false;
		}
		this.setDomaining = true;

		// 按钮添加正在加载样式
		that.$ok.addClass("loading");

		// 根据要进行的操作，设置ajax的type， 添加是post，删除是delete，修改是patch
		if ( this.isNew() ) {
			ajaxType = "POST";
		} else {
			ajaxType = value === "" ? "DELETE" : "PATCH";
		}

		return $.ajax({
			url: global.baseUrl + "/orgs/" + global.data.org.get("id") + "/domains" +
				 (this.isNew() ? "" : "/" + obj.id ),
			type: ajaxType,
			data: JSON.stringify({
				name: value
			}),
			success: function(response){
				if ( response.errcode === 0 ) {
					if (ajaxType === "DELETE") {
						that.parentView.list.remove(that.model);
						global.data.domainList.remove(that.model.get("id"));
					} else {
						that.model.set(response.data);
						global.data.domainList.set(response.data, {
                            remove: false
                        });
						that.hideBtn();
						that.hideInfo();
					}
				}
				else {

					that.showInfo(global.tools.getErrmsg(response.errcode));
				}
			},

			error: function(xhr, status){
				that.showInfo("网络异常，请稍后重试");
			},

			complete: function(){
				that.setDomaining = false;
				that.$ok.removeClass("loading");
			}
		});

	},

	// 显示错误信息
	showInfo: function(value ){
		this.$info.find(".JS-info-text").html( value );
		this.$info.addClass("show");
	},

	// 隐藏错误信息
	hideInfo: function(){
		this.$info.removeClass("show");
	},

	// 显示确定和取消按钮
	showBtn: function(){
		var data=this.model.toJSON()
		if(data.name && (this.$input.val().trim()==data.name || !this.$input.val().trim())){
            this.$ok.addClass("disable")
		}else if(!data.name && !this.$input.val().trim()){
            this.$ok.addClass("disable")
        }else{
            this.$ok.removeClass("disable")
        }
        this.$ok.addClass("show");
        this.$cancel.addClass("show");
	},

	// 隐藏确定和取消按钮
	hideBtn: function(){
		this.$ok.removeClass("show");
		this.$cancel.removeClass("show");
	},

	// 是否新的（新的是还没有添加到服务器中）
	isNew: function(){
		// 获取id并转换为字符串
		var id = this.model.get("id") + "";
		if ( id.indexOf("new") >= 0 ) {
			return true;
		}
		return false;
	},

	// 验证域名格式
	verify: function(str) {
		var reg = /^([a-zA-Z0-9]+-?[a-zA-Z0-9]+\.){1,3}[a-zA-Z]{2,4}$/;

		// 值为空的情况下
		if ( str === "" && this.isNew() ) {
			this.showInfo("需要填写域名");
			return false;
		}

		if (!reg.test(str)) {
			this.showInfo("域名格式错误");
			return false;
		}
		
		this.hideInfo();
		return true;
	},

	destroy: function(){
		this.$el.removeData();
		this.remove();
	}
});

module.exports = View;