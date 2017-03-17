$(function() {

    // $(".banner-register input").focusin(function() {
    //     if ($(this).val() === "请输入手机号") {
    //         $(this).val("");
    //     }
    // });
    // $(".banner-register input").focusout(function() {
    //     if ($(this).val() === "") {
    //         $(this).val("请输入手机号");
    //     }
    // });

    $(".banner button").on("click", function() {
        var phone = $(".banner input").val();
        $(".banner input").val("");
        window.open(location.origin + "/pages/register/index.html?phone=" + phone);
    });


    var options = parseURL();
    if (options.from && options.action == "registerOrg") {
        $("body").addClass("show-modal");
        $(".mobile-modal").show();

        $(".mobile-modal").find(".back-to-starfish").click(function() {
            window.location = "starfish://bitbrothers";
        });
        $(".mobile-modal").find(".stay-here").click(function() {
            $(".mobile-modal").remove();
            $("body").removeClass("show-modal");
        });
    } else {
        $(".mobile-modal").remove();
    }
});

function parseURL(url) {
    var urlStr = url ? url : (window.location.href.match(/(\?[^\?]*)$/) ? window.location.href.match(/(\?[^\?]*)$/)[1] : ""),
        param = {};
    urlStr = decodeURI(urlStr);
    if (urlStr) {
        var urlArr = urlStr.split("?");
        if (urlArr[1]) {
            urlArr = urlArr[1].split(/&|#/);
            for (var i = urlArr.length - 1; i >= 0; i--) {
                var tempArr = urlArr[i].split("=");
                param[tempArr[0]] = tempArr[1];
            }
        }
    }
    return param;
}
