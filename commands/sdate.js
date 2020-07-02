exports.module = {
	commands: ["sdate","september"],
	description: "Check what day of [Eternal September](https://en.wikipedia.org/wiki/Eternal_September) it is.",
	syntax: null,
	tags: [],
	process: function(client, msg){
		var today = new Date();
		var september = new Date(1993,8,1);
		var dayDiff = Math.ceil(
			Math.abs(
				today.getTime() - september.getTime()
			) / (1000 * 3600 *24)
		);
		var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
		msg.reply(`Today is ${days[today.getDay()]}, September ${dayDiff}, 1993`);
	}
};
