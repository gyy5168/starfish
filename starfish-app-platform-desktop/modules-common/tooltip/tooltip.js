var $ = require("modules-common/jquery/jquery.js");
require("modules-common/jquery-tooltipster/jquery.tooltipster.js");

$(document).on("mouseenter", "[title]", function(){
	$( this ).tooltipster({
		contentAsHTML: true,
		trigger: 'hover'
	});
	$( this ).trigger("mouseenter");
});


