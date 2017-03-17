var s = {};
module.exports = function(e) {
	if (!s[e]) {
		s[e] = !0;
		var t = document.createElement("style");
		t.setAttribute("type", "text/css"), "textContent" in t ? t.textContent = e : t.styleSheet.cssText = e;
		var n = document.getElementsByTagName("head")[0];
		n.appendChild(t)
	}
}