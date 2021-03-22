exports.module = {
	commands: ["delete","cleanup","clean","prune"],
	description: "Deletes the specified amount of messages.",
	syntax: "[number between 1 and 100]",
	tags: ["MOD"],
	process: function(client, msg, argv) {
		var params = argv.slice(1).join(" ");
		var channel = msg.channel;
		if(params) {
			var count = parseInt(params);
			if(count !== NaN && count > 0 && count <= 100) {
				msg.delete();
				msg.channel.bulkDelete(count,true);
			} else {
				msg.reply("**Error:** Message count must be a number between 1 and 100");
			}
		}
	}
};
