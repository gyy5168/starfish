fis.config.merge({
    modules: {
        parser: {
            tmpl: 'utc',
            sass : 'sass',
            scss: 'sass'
        },
        // spriter: 'csssprites',
        postprocessor: {
            js: "jswrapper, require-async",
            html: "require-async"
        },
        postpackager : ['autoload', 'simple']
    },
    roadmap: {
        path : [
            {
                //md后缀的文件不发布
                reg:"**.txt",
                release: false
            },
            {
                reg : "**.scss",
                useSprite: true
            },
            // {
            //     reg:/^\/pages\/login\/main\.js$/i,
            //     isMod: false
            // },
            {
                reg:/^\/js\/.+\.js$/i,
                isMod: false
            },
            {

                reg : "**.css",
                useSprite: true

            },
            {
                // modules-common/mod-store.js 不模块包装
                reg:/^\/static\/lib\/(mod-store|mod)\.js$/i,
                isMod: false
            },
            {
                reg: /^\/static\/lib\/.*\.js$/i,
                isMod: true,
                jswrapper: {
                    type: 'amd'
                }
            },
            {
                //前端模板
                reg : '**.tmpl',
                //当做类js文件处理，可以识别__inline, __uri等资源定位标识
                isJsLike : true,
                //只是内嵌，不用发布
                release : false
            },
            {
                reg : '**.js',
                isMod: true
            }
           
        ],
        
        ext:{
            sass: 'css',
            scss: 'css'
        }
    },
    settings: {
        postprocessor: {
            jswrapper: {
                type: 'amd'
            }
        }
    }
});

fis.config.set('pack', {
    "pkg/lib.js": [
        "modules-common/underscore/underscore.js",
        "modules-common/backbone/backbone.js",
        "modules-common/jquery/jquery.js"
    ]
});
fis.config.set('settings.postpackager.autoload.useInlineMap', true);

fis.config.set('settings.postpackager.simple.autoCombine', true);

fis.config.set('settings.spriter.csssprites', {
    scale: 1
});


fis.config.set('settings.spriter.csssprites.margin', 20);