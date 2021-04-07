var qs = require("querystring"),
    Discord = require("discord.js"),
    moment = require('moment'),
    fetch = require("node-fetch"),
    { name, version } = require('../package.json');

exports.module = {
	name: "xkcd",
	description: "Returns the latest comic or a specified comic from xkcd.",
	options: [{
		name: 'comic',
		type: 'INTEGER',
		description: "the ID of the comic",
		required: false,
	}],
	process: function (interaction, client) {
		var params = "";
		if(interaction.options.length > 0)
			params = interaction.options.find(obj => obj.name == 'comic').value;

		// fake 404 response, using the image from explain xkcd
		if (params == "404") {
			//if (interaction.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
				interaction.reply(undefined, {
					embed: {
						title: `#404 - Not Found`,
						author: {
							name: "xkcd",
							url: "https://xkcd.com/",
							iconURL: "https://i.imgur.com/AtZVNGx.png"
						},
						url: 'https://xkcd.com/404',
						image: {
							url: 'https://www.explainxkcd.com/wiki/images/9/92/not_found.png'
						},
						timestamp: '2008-04-01T04:00:00.000Z'
					}
				});
			/*} else {
				interaction.reply("#404 - Not Found: https://xkcd.com/404")
			}*/
			return;
		}

		fetch(`https://xkcd.com/${/^(\d+)$/.test(params) ? qs.escape(params) + "/" : ""}info.0.json`, {
			headers: {
				'User-Agent': `${name}/${version}`
			}
		})
		.then(res => {
			if (res.ok) {
				return res.json()
			} else {
				throw new Error(`${res.status} ${res.statusText}`);
			}
		})
		.then(comic => {
			/*if (!interaction.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
				interaction.reply(`#${comic.num} - ${comic.safe_title}: ${comic.img}\n*${comic.alt}*`);
			} else { */
				var xkEmbed = new Discord.MessageEmbed({
					title: `#${comic.num} - ${comic.safe_title}`,
					author: {
						name: "xkcd",
						url: "https://xkcd.com/",
						iconURL: "https://i.imgur.com/AtZVNGx.png"
					},
					url: 'https://xkcd.com/' + comic.num,
					image: {
						url: comic.img
					},
					footer: {
						text: comic.alt
					},
					timestamp: new Date(Date.UTC(comic.year, comic.month - 1, comic.day, 4)).toISOString() // hour is 4 AM UTC to match RSS feed
				});

				if (comic.link !== "") {
					xkEmbed.addField("Link", comic.link, false);
				}

				// special fixes
				if (comic.num == "1335") { // #1335 - Now
					var date = new Date()
					hrs = date.getUTCHours() + (moment().isDST() ? 12 : 11) // match UTC+12 if DST, or UTC+11 otherwise
					hrs = (hrs >= 24 ? hrs - 24 : hrs), // make sure that it's within 00-23
						hrs = hrs.toString().padStart(2, "0"); // add leading zero
					mins = ((Math.round(date.getUTCMinutes() / 15) * 15) % 60), // get minutes
						mins = mins.toString().padStart(2, "0"); // add leading zero
					xkEmbed.setImage(`http://imgs.xkcd.com/comics/now/${hrs}h${mins}m.png`);
					xkEmbed.setTitle(xkEmbed.title);
				}
				else if (comic.num == "1137") { // #1137 - RTL
					xkEmbed.setTitle(`#${comic.num} - RTL`); // discord strips out the right-to-left override, ruining the joke
				}
				else if (comic.num == "851" && make_it_better) { // #851 - Na (Hey Jude version)
					xkEmbed.setImage("https://imgs.xkcd.com/comics/na_make_it_better.png");
					xkEmbed.setURL("https://xkcd.com/851_make_it_better");
				}

				interaction.reply(undefined, { embed: xkEmbed });
			//}
		}).catch(err => {
			if(err.message = "404 Not Found") {
				interaction.reply("That comic does not exist.", {ephemeral: true});
			} else {
				interaction.reply("Failed to fetch xkcd comic: ```js\n" + err + "```", {ephemeral: true})
				console.error("[xkcd Error]",err);
			}
		});

	}
};
