var qs = require("querystring"),
    Discord = require("discord.js"),
    request = require("request"),
    moment = require('moment'),
    name = require('../package.json').name,
    version = require('../package.json').version;

exports.module = {
	commands: ["xkcd"],
	description: "Returns the latest comic, a specified comic, or a random comic from [xkcd](https://xkcd.com/).",
	syntax: "[comic ID or \"random\"]",
	tags: [],
	permissions: [],
	process: function(client, msg, params,random) {
		// fake 404 response, using the image from explain xkcd
		if(params == "404" && msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
			msg.reply(undefined,{embed: {
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
			}});
			if(random) msg.channel.stopTyping();
			return;
		}

		if(!random) msg.channel.startTyping();
		// hacky way of implementing random comics
		if(params.toLowerCase() == "random" && !random) {
			request({
				url: 'https://c.xkcd.com/random/comic/',
				headers: {
					'User-Agent': `${name}/${version}`
				},
				followRedirect: false
			}, function (error, response, body) {
				if (!error && (response.statusCode == 302)) {
					var id = /^https?:\/\/xkcd.com\/(\d+)\/$/.exec(response.headers.location)[1];
					// call ourself with the ID
					exports.module.process(client,msg,id,true);
				} else {
					msg.reply(`${response.statusCode} ${response.statusMessage}`);
					msg.channel.stopTyping();
				}
			});
			return;
		}

		if(params.toLowerCase() == "now") {
			params = "1335"
		}
		make_it_better = false;
		if(params.toLowerCase() == "851_make_it_better") {
			params = "851"
			make_it_better = true;
		}
		request({
			url: /^(\d+)$/.test(params) ? `https://xkcd.com/${qs.escape(params)}/info.0.json` : 'https://xkcd.com/info.0.json',
			headers: {
				'User-Agent': `${name}/${version}`
			}
		}, function (error, response, body) {
			if (!error && (response.statusCode == 200)) {
				if (body) {
					var comic = JSON.parse(body);
					if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply("https://xkcd.com/" + comic.num);
					} else {
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
							timestamp: new Date(Date.UTC(comic.year,comic.month-1,comic.day,4)).toISOString()
						});

						if(comic.link !== "") {
							xkEmbed.addField("Link",comic.link,false);
						}

						// check for 2x (retina) image
						/*if(comic.img.search(".png") !== -1) {
							request({
								method: 'HEAD',
								url: comic.img.replace(".png","_2x.png"),
								headers: {
									'User-Agent': `${name}/${version}`
								}
							}, function(error, response) {
								if(!error && response.statusCode == 200) {
									xkEmbed.setImage(response.request.uri.href);
								}
							});
						}*/
						
						// special fixes
						if(comic.num == "1335") {

							var date = new Date()
								 hrs = date.getUTCHours() + (moment().isDST() ? 12 : 11) // match UTC+12 if DST, or UTC+11 otherwise
								 hrs = (hrs >= 24 ? hrs - 24 : hrs), // make sure that it's within 00-23
								 hrs = hrs.toString().padStart(2, "0"); // add leading zero
								mins = ((Math.round(date.getUTCMinutes()/15) * 15) % 60), // get minutes
								mins = mins.toString().padStart(2, "0"); // add leading zero
							xkEmbed.setImage(`http://imgs.xkcd.com/comics/now/${hrs}h${mins}m.png`);
							xkEmbed.setTitle(xkEmbed.title);
						}
						else if(comic.num == "1137") {
							xkEmbed.setTitle(`#${comic.num} - RTL`); // discord strips out the right-to-left override, ruining the joke
						}
						else if(comic.num == "851" && make_it_better) { // hey jude
							xkEmbed.setImage("https://imgs.xkcd.com/comics/na_make_it_better.png");
							xkEmbed.setURL("https://xkcd.com/851_make_it_better");
						}

						msg.reply(undefined,{embed: xkEmbed});
					}
				}
			} else {
				msg.reply(`${response.statusCode} ${response.statusMessage}`);
			}
		});
		msg.channel.stopTyping();

	}
};
