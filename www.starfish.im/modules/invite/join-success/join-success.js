var Backbone = require("modules-common/backbone/backbone.js");
require("../tools/tools.js");

var View = Backbone.View.extend({
    attributes:{
        "class": "has-register"
    },

    initialize: function(){
        this.render();
        this.initEvent();
    },

    render: function(){
        this.$el.html(__inline("join-success.html"));
        this.$info = this.$el.find("p");
        this.$next = this.$el.find(".JS-next");

        this.$info.html("恭喜你成功加入" + global.data.org.get("name") + ", 现在可以通过Starfish和小伙伴们进行协作了!" );
    },

    initEvent: function(){
        this.$next.on("click", function(){
            global.tools.openOrDownload();
        });
    },

    destroy: function(){
        this.remove();
    }

});

module.exports = View;
