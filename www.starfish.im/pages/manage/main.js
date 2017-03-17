var Backbone = require("modules-common/backbone/backbone.js"),
    $ = require("modules-common/jquery/jquery.js");

require("modules-common/init/init.js");

var initInfo = require("modules/manage/init-info/init-info.js");

initInfo(function () {
    // 全局添加tooltip
    require("modules-common/jquery-tooltipster/jquery.tooltipster.js");
    $(document).on("mouseenter", "[title]", function () {
        $(this).tooltipster({
            contentAsHTML: true,
            trigger: 'hover'
        });
        $(this).trigger("mouseenter");
    });

    global.baseUrl2 = "https://api.starfish.im/v2";

    var Index = require("modules/manage/manage.js");
    new Index();

    Backbone.history.start();
});

module.exports = {};