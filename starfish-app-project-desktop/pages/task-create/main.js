var Backbone = require("modules-common/backbone/backbone.js"),
	$ = require("modules-common/jquery/jquery.js"),
	urlTool = require("modules-common/tools/url.js");

require("modules-common/init/init.js");

// 全局添加tooltip
require("modules-common/jquery-tooltipster/jquery.tooltipster.js");
$(document).on("mouseenter", "[title]", function(){
	$( this ).tooltipster({
		contentAsHTML: true,
		trigger: 'hover'
	});
	$( this ).trigger("mouseenter");
});

var url = window.location.search,
	projectId = urlTool.getParam(url, "projectId")[0],
	$wraper = $( "#wraper" );

$loading = $(".JS-loading");
$error = $(".JS-error");

if ( projectId ) {
	$.ajax({
		url: global.data.org.get("domain") + "/orgs/"+global.data.org.get("id")+"/project/projects/" + projectId,
		type:"GET",
		success: function(){
			
		},
		error: function(){
			$loading.hide();
			$error.show();
		}
	});
}
var TaskCreate = require("modules/task-create/task-create.js");
var taskCreateView = new TaskCreate();
$("#wraper").append(taskCreateView.$el);

module.exports = {};