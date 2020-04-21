var fetch = require("node-fetch"),
    { name, version } = require('../package.json');

exports.module = {
	commands: ["rcg"],
	description: "Returns a random comic from Explosm.net's [Random Comic Generator](http://explosm.net/rcg).\nPanel locking is currently unsupported.",
	syntax: null,
	tags: [],
	process: function(client, msg, params) {
		msg.channel.startTyping();
		fetch("http://explosm.net/rcg/view/", { headers: { 'User-Agent': `${name}/${version}` } })
			.then(res => {
				if (res.ok) {
					return res.text()
				} else {
					throw new Error(`${res.status} ${res.statusText}`);
				}
			})
			.then(body => {
				var regex = /https:\/\/rcg-cdn\.explosm\.net\/comics\/[0-9A-F]{12}\/[0-9A-F]{12}\/[0-9A-F]{12}\/([a-z]{9})\.png/;
				var RCG = regex.exec(body);
				if (!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
					msg.reply('http://explosm.net/rcg/' + RCG[1]);
				} else {
					msg.reply(undefined, {
						embed: {
							title: "Random Comic Generator",
							url: 'http://explosm.net/rcg/' + RCG[1],
							image: {
								url: RCG[0]
							}
						}
					});
				}
			}).catch(err => {
				msg.reply("Failed to fetch random comic: ```js\n" + err + "```")
				console.error("[RCG Error]",err);
			}).finally(() => msg.channel.stopTyping());
	}
};
