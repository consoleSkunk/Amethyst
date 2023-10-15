var qs = require("querystring"),
    {
		EmbedBuilder,
		ActionRowBuilder,
		ButtonBuilder,
		ButtonStyle,
		ApplicationCommandOptionType
	} = require('discord.js'),
    fetch = require("node-fetch"),
    { contact } = require('../config/config.json'),
    { name, version } = require('../package.json');

exports.module = {
	command: {
		name: "xkcd",
		description: "Returns the latest comic or a specified comic from xkcd.",
		options: [{
			name: 'comic',
			type: ApplicationCommandOptionType.Integer,
			description: "the ID of the comic",
			required: false,
		}],
	},
	process: function (interaction) {
		var params = interaction.options.getInteger('comic')

		// fake 404 response, using the image from explain xkcd
		if (params == "404") {
			//if (interaction.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
				interaction.reply({embeds: [new EmbedBuilder({
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
				})], components: [new ActionRowBuilder().addComponents(
					new ButtonBuilder({
						url: `http://www.explainxkcd.com/wiki/index.php?title=404`,
						emoji: "\u{1F4AC}",
						label: "Explain",
						style: ButtonStyle.Link
					})
				)]});
			/*} else {
				interaction.reply("#404 - Not Found: https://xkcd.com/404")
			}*/
			return;
		}

		fetch(`https://xkcd.com/${/^(\d+)$/.test(params) ? qs.escape(params) + "/" : ""}info.0.json`, {
			headers: {
				'User-Agent': `${name}/${version} (+${contact.project_url})`
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
				var xkEmbed = new EmbedBuilder({
					title: `#${comic.num} - ${comic.safe_title}`,
					author: {
						name: "xkcd",
						url: "https://xkcd.com/",
						iconURL: "https://i.imgur.com/AtZVNGx.png"
					},
					url: `https://xkcd.com/${comic.num}`,
					image: {
						url: comic.img
					},
					footer: {
						text: comic.alt
					},
					timestamp: new Date(Date.UTC(comic.year, comic.month - 1, comic.day, 4)).toISOString() // hour is 4 AM UTC to match RSS feed
				});
				var buttons = new ActionRowBuilder().addComponents(
					new ButtonBuilder({
						url: `http://www.explainxkcd.com/wiki/index.php?title=${comic.num}`,
						emoji: "\u{1F4AC}",
						label: "Explain",
						style: ButtonStyle.Link
					})
				);

				if (comic.link !== "") {
					buttons.addComponents(
						new ButtonBuilder({
							url: new URL(comic.link,"http://xkcd.com/").toString(),
							emoji: "\u{1F517}",
							style: ButtonStyle.Link
						})
					)
				}

				// special fixes
				if (comic.num == "1335") { // #1335 - Now
					var date = new Date()
					hrs = date.getUTCHours() + 12 // match UTC+12
					hrs = (hrs >= 24 ? hrs - 24 : hrs), // make sure that it's within 00-23
						hrs = hrs.toString().padStart(2, "0"); // add leading zero
					mins = ((Math.round(date.getUTCMinutes() / 15) * 15) % 60), // get minutes
						mins = mins.toString().padStart(2, "0"); // add leading zero
					xkEmbed.setImage(`http://imgs.xkcd.com/comics/now/${hrs}h${mins}m.png`);
				}
				else if (comic.num == "1137") { // #1137 - RTL
					xkEmbed.setTitle(`#${comic.num} - RTL`); // discord strips out the right-to-left override, ruining the joke
				}
				else if (comic.num == "1193") { // #1193 - Externalities
					// official image is a blank canvas
					xkEmbed.setImage("https://www.explainxkcd.com/wiki/images/0/0b/externalities.png");
				}
				else if (comic.num == "1350") { // #1350 - Lorenz
					// official image is a repeat of #1349
					xkEmbed.setImage("https://www.explainxkcd.com/wiki/images/d/d2/lorenz_-_alternative_options.png");
				}

				interaction.reply({content: `https://xkcd.com/${comic.num}`, embeds: [xkEmbed], components: [buttons]});
			//}
		}).catch(err => {
			if(err.message == "404 Not Found") {
				interaction.reply({content: "That comic does not exist.", ephemeral: true});
			} else {
				interaction.reply({content: "Failed to fetch xkcd comic: ```js\n" + err + "```", ephemeral: true})
				console.error("[Command Error: /xkcd]",err);
			}
		});

	}
};
