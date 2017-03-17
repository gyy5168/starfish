module.exports = {

	getWeekBorder: function(stamp) {
		var date = new Date(stamp * 1000);
		date.setHours(0);
		date.setMinutes(0);
		date.setSeconds(0);
		date.setMilliseconds(0);
		stamp = (+date) / 1000;

		var whichWeek = [7, 1, 2, 3, 4, 5, 6][date.getDay()],
			startStamp = stamp - (86400 * (whichWeek - 1)),
			endStamp = stamp + (86400 * (7 - whichWeek));

		return {
			startStamp: startStamp,
			endStamp: endStamp,
			startDate: tools.formatDate(new Date(startStamp * 1000), "yyyy年M月d日"),
			endDate: tools.formatDate(new Date(endStamp * 1000), "yyyy年M月d日")
		};
	},

	getDayStart: function(stamp){
		var date = new Date(stamp * 1000);
		date.setTime(0);
		return (+date) / 1000;
	},

	getDayEnd: function(stamp){
		return this.getDayStart(stamp) + 86400;
	},

	getWeekStart: function(stamp){
		var date = new Date(stamp * 1000),
			day = date.getDay();

		// 获取当天零点的时间戳
		data.setTime(0);
		stamp = (+date) / 1000;
		
		return stamp -  day * 86400;
	},

	getWeekEnd: function(stamp){
		return this.getWeekStart(stamp) + 86400 * 7;
	},

	getStart: function(interval, stamp){
		interval = interval || "week";
		if ( interval === "week" ) {
			return this.getWeekStart(stamp);
		} else {
			return this.getDayStart(stamp);
		}
	},

	getEnd: function(interval, stamp){
		interval = interval || "week";
		if ( interval === "week" ) {
			return this.getWeekEnd(stamp);
		} else {
			return this.getDayEnd(stamp);
		}
	}
};






