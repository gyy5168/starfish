/**
 * Created by cup on 2015/8/25.
 */


var time = 5000;

var auto1;
$(function() {
    var fn = function() {
        auto1.cancelDelay(2000)
        auto1.stop()
        var id = $(this).index()
        t = id
        var left = id * 236 + 118 - 13 + "px"
        $("#dofor .dofor-content .content-breakLine span").animate({
            "left": left
        }, 200)
        var le = -id * 944 + "px"
        $(".content-text").animate({
            left: le
        })
        timerOut = setTimeout(function() {
            auto1.run()
        }, time)
    }

    auto1 = (function() {
        var t = 0
        var timerOut
        var timer
        var ind = 1
        return {
            stop: function() {
                clearInterval(timer)
            },
            run: function() {
                clearInterval(timer)
                timer = setInterval(function() {
                    var id = t
                    var left = id * 236 + 118 - 13 + "px"
                    $("#dofor .dofor-content .content-breakLine span").animate({
                        "left": left
                    }, 200)
                    var le = -id * 944 + "px"
                    $(".content-text").animate({
                        left: le
                    })
                    t = t + ind
                    if (t == 3) {
                        ind = -1
                    }
                    if (t == 0) {
                        ind = 1
                    }
                }, time)
            },
            delay: function(time) {
                timerOut = setTimeout(function() {
                    auto1.run()
                }, time)
            },
            cancelDelay: function() {
                clearTimeout(timerOut)
            }
        }
    })()
    auto1.run()
    $("#dofor .dofor-content li").on("click", fn)
})




var auto2 = (function() {
        var t = 0
        var timerOut
        var timer
        var ind = 1
        var moveX = $("#comment ul.content").find("li").eq(0).width()
        var fn = function() {
            var id = $(this).index()
            var left = -id * moveX + "px"
            $(this).addClass("active").siblings().removeClass("active")
            $("#comment ul.content").animate({
                "left": left
            })
        }
        $("#comment ul.card li").on("click", fn)

        return {
            stop: function() {
                clearInterval(timer)
            },
            run: function() {
                clearInterval(timer)
                timer = setInterval(function() {
                    var id = t
                    $("#comment ul.card li").eq(id).trigger("click")
                    t = t + ind
                    if (t == 2) {
                        ind = -1
                    }
                    if (t == 0) {
                        ind = 1
                    }
                }, time)
            },
            delay: function(time) {
                timerOut = setTimeout(function() {
                    auto2.run()
                }, time)
            },
            cancelDelay: function() {
                clearTimeout(timerOut)
            }
        }
    })()
    // auto2.run()

var auto3 = (function() {
    var timer
    var id = 0
    var dir = "down"
    var fn = function() {
        id = $(this).index()
        $(this).addClass("active").siblings().removeClass("active")
        var pos1 = -400 * id + "px"
        var pos2 = id * 400 - 1300 + "px"
        $(" #whyrely .whyrely .message ul").animate({
            top: pos1
        })
        $(" #whyrely .whyrely .logo ul").animate({
            top: pos2
        })
    }
    $(" #whyrely .whyrely .title ul li").on("click", fn)

    return {
        up: function() {
            id--
            id = id <= 0 ? 0 : id
            if (id <= 0) {
                id = 0
                dir = "down"
            }
            $(" #whyrely .whyrely .title ul li").eq(id).trigger("click")
        },
        down: function() {
            id++
            id = id >= 3 ? 3 : id
            if (id >= 3) {
                id = 3
                dir = "up"
            }
            $(" #whyrely .whyrely .title ul li").eq(id).trigger("click")
        },
        ind: function() {
            return id
        },
        run: function() {
            var that = this
            clearInterval(timer)
            timer = setInterval(function() {
                if (dir == "down") {
                    that.down()
                } else {
                    that.up()
                }
            }, time)
        }
    }
})()

auto3.run()


$(function() {
    $(".download-list  li").hover(function() {
        var img = $(this).find(".image img").attr("src").replace(/(\w+)\.png/, function($0, $1) {
            return $1 + "_pre.png"
        })
        var id = $(this).index()
        if (id == 1) {
            img = "img/anercode.png"
            $(this).find(".image img").attr("src", img).height(71)
        }
        $(this).find(".down").css("background", " rgb(255,204,16)")
        $(this).find(".image img").attr("src", img)
    }, function() {
        var img = $(this).find(".image img").attr("src").replace(/(\w+)\_pre/, function($0, $1) {
            return $1
        })
        var id = $(this).index()
        if (id == 1) {
            img = "img/andriod.png"
        }
        $(this).find(".down").css("background", " rgb(124,124,124)")
        $(this).find(".image img").attr("src", img)
    })
})
// $(function() {
//     $(".download-list  li").hover(function() {
//         var img = $(this).find(".image img").attr("src").replace(/(\w+)\.png/, function($0, $1) {
//             return __uri($1 + "_pre.png")
//         })
//         var id = $(this).index()
//         if (id == 1) {
//             img = __uri("img/anercode.png")
//             $(this).find(".image img").attr("src", img).height(71)
//         }
//         $(this).find(".down").css("background", " rgb(255,204,16)")
//         $(this).find(".image img").attr("src", img)
//     }, function() {
//         var img = $(this).find(".image img").attr("src").replace(/(\w+)\_pre/, function($0, $1) {
//             return $1
//         })
//         var id = $(this).index()
//         if (id == 1) {
//             img = __uri("img/andriod.png")
//         }
//         $(this).find(".down").css("background", " rgb(124,124,124)")
//         $(this).find(".image img").attr("src", img)
//     })
// })



$(function() {
    // var last=0
    // var comment=$("#comment").offset().top
    //var dofor=$("#dofor").offset().top
    // var relay=$("#whyrely").offset().top
    // var scroll;
    //
    // $(document).on("scroll",function(){
    //     scroll=$(this).scrollTop()
    //     if(scroll>dofor && scroll<dofor+500){
    //         auto1.run()
    //     }else{
    //         auto1.stop()
    //     }
    //     var x=$(this).scrollLeft()
    // })
    //
    // var last=0
    //
    // var timeout
    // var h=$("#whyrely").height()

    // $(document).mousewheel(function(e,d){
    //     if(scroll>relay-100 && scroll<relay+100){
    //         $(document).scrollTop(relay)
    //         if(d<0){
    //             clearTimeout(timeout)
    //             timeout=setTimeout(down,150)
    //             if(rely.ind()==3){
    //                 return true
    //             }else{
    //                 return false
    //             }
    //         }else{
    //             clearTimeout(timeout)
    //             timeout=setTimeout(up,150)
    //             if(rely.ind()==0){
    //                 return true
    //             }else{
    //                 return false
    //             }
    //         }
    //         last=scroll
    //     }



    // })

    // function up(){
    //     rely.up()

    // }

    // function down(){
    //     rely.down()

    // }
})


$(function() {
    $(".download-list li .down").hover(function(e) {
        $(this).parent().find("p").eq(0).stop().fadeOut(function() {
            $(this).siblings().stop().fadeIn()
        })
    }, function(e) {

        $(this).parent().find("p").eq(1).stop().fadeOut(function() {
            $(this).siblings().stop().fadeIn()
        })
    })

})


$(function() {
    $(".download-list li").hover(function() {
        var img = $(this).find(".image img").attr("src").replace(/(\w+)\.png/, function($0, $1) {
            return $1 + ".png"
        })

        var id = $(this).index()
        if (id == 1) {
            img = "img/anercode.png"
            $(this).find(".image img").attr("src", img).height(71)
        }
        $(this).find(".down").css("background", " rgb(255,204,16)")
        $(this).find(".image img").attr("src", img)
    }, function() {
        var img = $(this).find(".image img").attr("src").replace(/(\w+)\_pre/, function($0, $1) {
            return $1
        })
        var id = $(this).index()
        if (id == 1) {
            img = "img/andriod.png"
        }
        $(this).find(".down").css("background", " rgb(124,124,124)")
        $(this).find(".image img").attr("src", img)
    })


})
$(function() {
    var options=parseURL();
    if(options.from&&options.action=="registerOrg"){
        $("body").addClass("show-modal");
        $(".mobile-modal").show();
        
        $(".mobile-modal").find(".back-to-starfish").click(function(){
            window.location = "starfish://bitbrothers";
        })
        $(".mobile-modal").find(".stay-here").click(function(){
            $(".mobile-modal").remove();
            $("body").removeClass("show-modal");
        })
    }else{
        $(".mobile-modal").remove();
    }
})
var userAgent = navigator.userAgent;
if (!!userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    global.platform = "ios";
} else if (userAgent.indexOf('Android') > -1 || userAgent.indexOf('Linux') > -1) {
    global.platform = "android";
}
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
