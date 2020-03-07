exports.module = {
	commands: ["ping"],
	description: "Pong! Tells you how long the bot takes to respond to your message.",
	syntax: null,
	tags: [],
	process: function(client, msg){
		msg.reply("Pong!").then(m => m.edit(`${m.content} (responded in ${m.createdTimestamp - msg.createdTimestamp} ms)`));
	}
};
