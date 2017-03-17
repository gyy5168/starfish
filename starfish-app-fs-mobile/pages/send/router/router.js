/**
 * Created by Administrator on 2015/9/17.
 */


var _ = require("modules-common/underscore/underscore.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/zepto/zepto.js");

var Route=Backbone.Router.extend({
    getParamString: function() {
        var match = (window || this).location.href.match(/\?(.*)$/);

        if (match) {
            return match[1];
        }
    },
    getParam: function(name) {
        if (!name) {
            return;
        }

        var params = this.getParamString();
        if (params === undefined) {
            return;
        }

        // Æ¥Åä²éÑ¯µÄname
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i"),
            match = params.match(reg);

        if (match) {
            return match[2];
        }
    },
})
module.exports=new Route()
