module.exports = {
	getType: function(name) {
		if ( !name ) {
			return false;
		}
		var suffix = name.substring(name.lastIndexOf(".") + 1);
		
		switch (suffix) {
			case "doc":
			case "docx":
			case "docm":
			case "dotx":
			case "dotm":
			case "dot":
			case "rtf":
				return "word";
			case "xlsx":
			case "xls":
			case "csv":
			case "xlsm":
			case "xlsb":
				return "excel";
			case "ppt":
			case "pptx":
			case "pptm":
			case "potx":
			case "pot":
			case "potm":
				return "ppt";
			case "pdf":
			case "fdf":
				return "pdf";
			case "markdown":
			case "mdown":
			case "mkdn":
			case "md":
			case "txt":
				return "txt";
			case "bmp":
			case "gif":
			case "jpg":
			case "jpeg":
			case "png":
				// case "psd":
				// case "cdr":
				// case "ico":
				// case "tif":
				// case "tiff":
				// case "tga":
				// case "raw":
				return "image";
			case "mp3":
			case "wma":
			case "wav":
			case "aac":
			case "ape":
			case "mid":
			case "mod":
			case "cd":
			case "asf":
			case "arm":
			case "ram":
			case "m4a":
			case "ogg":
			case "aif":
			case "aifc":
			case "amr":
				return "music";
			case "avi":
			case "rm":
			case "rmvb":
			case "wmv":
			case "mpg":
			case "mpeg":
			case "mkv":
			case "flv":
			case "dat":
			case "scm":
			case "mov":
			case "3g2":
			case "3gp":
			case "3gp2":
			case "3gpp":
			case "mp4":
			case "amv":
			case "csf":
			case "ivf":
			case "mts":
			case "swf":
			case "webm":
				return "video";
				// case "exe":
				// case "msi":
				// case "bat":
				// 	return "exe";
				// case "apk":
				// case "ipa":
				// 	return "\u624b\u673a\u5e94\u7528";
			case "rar":
			case "zip":
			case "jar":
			case "iso":
			case "cab":
			case "lha":
			case "bh":
			case "tar":
			case "lzh":
			case "7z":
			case "gz":
			case "gzip":
			case "bar":
			case "zipx":
			case "bz2":
				return "zip";
				// case "url":
				// 	return "Internet \u5feb\u6377\u65b9\u5f0f";
			case "xml":
			case "html":
			case "htm":
			case "php":
			case "c":
			case "cs":
			case "cpp":
			case "java":
				return "code";
			default:
				return "unknown"
		}
	}
};