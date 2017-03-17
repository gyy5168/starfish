var iconMap = {
	"doc": "word",
	"docx": "word",
	"docm": "word",
	"dotx": "word",
	"dotm": "word",
	"dot": "word",
	"rtf": "word",

	"xlsx": "excel",
	"xls": "excel",
	"csv": "excel",
	"xlsm": "excel",
	"xlsb": "excel",

	"ppt": "ppt",
	"pptx": "ppt",
	"pptm": "ppt",
	"potx": "ppt",
	"pot": "ppt",
	"potm": "ppt",

	"pdf": "pdf",
	"fdf": "pdf",

	"markdown": "txt",
	"mdown": "txt",
	"mkdn": "txt",
	"md": "txt",

	"bmp": "image",
	"gif": "image",
	"jpg": "image",
	"jpeg": "image",
	"png": "image",

	"mp3": "music",
	"wma": "music",
	"wav": "music",
	"aac": "music",
	"ape": "music",
	"mid": "music",
	"mod": "music",
	"cd": "music",
	"asf": "music",
	"arm": "music",
	"ram": "music",
	"m4a": "music",
	"ogg": "music",
	"aif": "music",
	"aifc": "music",
	"amr": "music",

	"avi": "video",
	"rm": "video",
	"rmvb": "video",
	"wmv": "video",
	"mpg": "video",
	"mpeg": "video",
	"mkv": "video",
	"flv": "video",
	"dat": "video",
	"scm": "video",
	"mov": "video",
	"3g2": "video",
	"3gp": "video",
	"3gp2": "video",
	"3gpp": "video",
	"mp4": "video",
	"amv": "video",
	"csf": "video",
	"ivf": "video",
	"mts": "video",
	"swf": "video",
	"webm": "video",

	"rar": "zip",
	"zip": "zip",
	"jar": "zip",
	"iso": "zip",
	"cab": "zip",
	"lha": "zip",
	"bh": "zip",
	"tar": "zip",
	"lzh": "zip",
	"7z": "zip",
	"gz": "zip",
	"gzip": "zip",
	"bar": "zip",
	"zipx": "zip",
	"bz2": "zip",

	"xml": "code",
	"html": "code",
	"htm": "code",
	"php": "code",
	"c": "code",
	"cs": "code",
	"cpp": "code",
	"java": "code",
	"apk": "code"
};

module.exports = {
	getFileIcon: function(filename) {
		var suffix = /[^.]+$/.exec(filename)[0].toLowerCase();
		return iconMap[suffix] || "unrecognized";
	},

	getClassName: function(filename) {
		var suffix = /[^.]+$/.exec(filename)[0].toLowerCase(),
			name = iconMap[suffix] || "unrecognized";
		return "file-" + name;
	}
}