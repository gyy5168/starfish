module.exports = {
	find: function(id) {
		var people;

		people = global.data.groupList.find(function(model) {
			return model.get("id") == id;
		});

		return people;
	},

	findByEmail: function(email) {
		var people;

		people = global.data.groupList.find(function(model) {
			return model.get("work_mail") == email;
		});

		return people;
	}
};