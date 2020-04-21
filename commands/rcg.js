var request = require("request"),
    name = require('../package.json').name,
    version = require('../package.json').version;

exports.module = {
	commands: ["rcg"],
	description: "Returns a random comic from Explosm.net's [Random Comic Generator](http://explosm.net/rcg).\nPanel locking is currently unsupported.",
	syntax: null,
	tags: [],
	process: function(client, msg, params) {
		msg.channel.startTyping();
		var options = {
			url: "http://explosm.net/rcg/view/",
			headers: {
				'User-Agent': `${name}/${version}`
			}
		};
		request(options,
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log(body);
				if (body) {
					var regex = /https:\/\/rcg-cdn\.explosm\.net\/comics\/[0-9A-F]{12}\/[0-9A-F]{12}\/[0-9A-F]{12}\/([a-z]{9})\.png/;
					var RCG = regex.exec(body);
					if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply('http://explosm.net/rcg/' + RCG[1]);
					} else {
						msg.reply(undefined, {embed:{
							title: "Random Comic Generator",
							url: 'http://explosm.net/rcg/' + RCG[1],
							image: {
								url: RCG[0]
							}
						}});
					}
				}
			}
			else {
				msg.reply(`${response.statusCode} ${response.statusMessage}`);
			}
		});
		msg.channel.stopTyping();
	}
};
