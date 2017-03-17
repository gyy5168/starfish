var peopleTools = require("modules-common/tools/people.js"),
	groupTools = require("modules-common/tools/group.js"),
	departmentTools = require("modules-common/tools/department.js"),
	dateTools = require("modules-common/tools/date.js"),
	fileTools = require("modules-common/tools/file.js");

module.exports = {
	findByEmail: function(email) {
		var data;

		data = peopleTools.findByEmail(email);

		if (data) {
			return {
				data: data,
				type: "people"
			}
		}

		data = groupTools.findByEmail(email);
		if (data) {
			return {
				data: data,
				type: "group"
			}
		}

		data = departmentTools.findByEmail(email);
		if (data) {
			return {
				data: data,
				type: "department"
			}
		}

		return false;
	},

	isPeople: function( email ){
		var data = peopleTools.findByEmail(email);
		if ( data ) {
			return true;
		}
		return false;
	},

	convertDate: function(timestamp) {
		var d = new Date(timestamp * 1000);
		return dateTools.formatDate(d, "yyyy年MM月dd日 HH:mm");
	},

	getFileType: function(name) {
		return fileTools.getType(name);
	}
}