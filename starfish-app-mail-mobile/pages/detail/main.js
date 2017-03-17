var init = require("modules-common/init/init.js");

init(function(){
    var MailList=require("modules/mail-list/mail-list.js");
    var url=location.href.match(/id=(\d+)/),
        mailId=parseInt(url[1]);

    var mailList=new MailList();
    mailList.back = function(){
        global.starfishBridge("finish");
    };
    mailList.show();
    mailList.set({
        type:"mail",
        id:mailId
    });
});

module.exports={}