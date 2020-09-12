exports.module = {
	commands: ["sdate","september"],
	description: "Check what day of [Eternal September](https://en.wikipedia.org/wiki/Eternal_September) it is.",
	syntax: "[YYYY-MM]",
	tags: [],
	process: function(client, msg, argv) {
		var params = argv.splice(1).join(" ");
		var epochRegex = /^(\d{4})-(\d{2})$/
		if(!epochRegex.test(params))
			params = "1993-09";
		
		var epoch = epochRegex.exec(params);

		var today = new Date();
		var epochDate = new Date(epoch[1],epoch[2]-1,1);
		var dayDiff = Math.ceil(
			(
				today.getTime() - epochDate.getTime()
			) / (1000 * 3600 *24)
		);
		var months = ['January','February','March','April','May','June','July','August','September','October','November','December']
		var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
		msg.reply(`Today is ${days[today.getDay()]}, ${months[epochDate.getMonth()]} ${dayDiff}, ${epochDate.getFullYear()}`);
	}
};
