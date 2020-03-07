exports.module = {
	commands: ["june"],
	description: "Check what day of Eternal June it is.",
	syntax: null,
	tags: [],
	process: function(client, msg){
		var today = new Date();
		var year = today.getFullYear() - (today.getMonth() < 6 ? 1 : 0);
		var june = new Date(year,5,1);
		var dayDiff = Math.ceil(
			Math.abs(
				today.getTime() - june.getTime()
			) / (1000 * 3600 *24)
		);
		var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
		msg.reply(`Today is ${days[today.getDay()]}, June ${dayDiff}, ${year}`);
	}
};
