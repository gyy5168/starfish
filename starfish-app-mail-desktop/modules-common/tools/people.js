module.exports = {
	find: function(id) {
		var people;

		people = global.data.peopleList.find(function(people) {
			return people.get("id") == id;
		});

		if (people) {
			return people
		}

		people = global.data.leftList.find(function(people) {
			return people.get("id") == id;
		});

		return people;
	},

	findByEmail: function(email) {
		var people;

		people = global.data.peopleList.find(function(people) {
			return people.get("work_mail") == email;
		});

		if (people) {
			return people;
		}

		people = global.data.leftList.find(function(people) {
			return people.get("work_mail") == email;
		});

		return people;
	}
};