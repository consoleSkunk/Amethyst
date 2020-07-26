var qs = require("querystring"),
    Discord = require("discord.js"),
	fetch = require("node-fetch"),
	{ name, version } = require('../package.json'),
    { user_agents, prefix } = require("../config/config.json"),
    { philomena } = require("../config/boorus.json");

exports.module = {
	commands: ["philomena"],
	description: "Returns a random image from supported Philomena-based boorus.\n[Cheatsheet available here](https://derpibooru.org/search/syntax).",
	syntax: "[tag 1, tag 2, tag 3]",
	tags: [],
	setup: function() {
		// add domains specified in boorus.json to alias list
		for (i in philomena) {
			exports.module.commands = exports.module.commands.concat(philomena[i].commands);
		}
	},
	process: function (client, msg, argv) {
		if(argv[0].toLowerCase() == "philomena") {
			var list = "";
			for (i in philomena) {
				list += `**${philomena[i].name}** - <https://${philomena[i].domain}/>\n` +
				`\`\`\`${prefix + philomena[i].commands.join(", " + prefix)}\`\`\`\n`;
			}

			if (!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
				msg.reply("**Supported sites:**\n\n" + list);
			}
			else {
				msg.reply(undefined, {
					embed: {
						title: "Philomena - Supported Sites",
						description: list,
					}
				});
			}
		}
		var config = philomena.filter(site => {
			return site.commands.includes(argv[0].toLowerCase())
		})[0];
		
		var params = argv.splice(1).join(" ");
		if(config == undefined)
			return;

		var random_seed = Math.round(Math.random() * 4294967295);

		msg.channel.startTyping();
		if (params.length == "0") params = "*"; // blank query will return nothing
		var query = `?sd=desc&sf=random%3a${random_seed}${params ? "&q=" + qs.escape(params) : ''}`;
		fetch(`https://${config.domain}/api/v1/json/search/images${query}` + (msg.channel.nsfw ? `&filter_id=${config.filter_id}` : ""), {
			headers: {
				'User-Agent': `${name}/${version} ${user_agents.philomena}`
			}
		})
			.then(res => {
				if (res.ok || res.status == 400) {
					return res.json()
				} else {
					throw new Error(`${res.status} ${res.statusText}`);
				}
			})
			.then(json => {
				if (json.error !== undefined) {
					if (!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply("Oops, there was an error evaluating your query: ```" + json.error + "```");
					} else {
						msg.reply(undefined, {
							embed: {
								title: config.name,
								description: "Oops, there was an error evaluating your query:\n```" + json.error + "```",
								color: 8529960,
								footer: {
									text: config.name,
									icon_url: config.icon
								}
							}
						});
					}
				} else if (json.images.length == 0) {
					if (!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply("No posts matched your search.");
					}
					else {
						msg.reply(undefined, {
							embed: {
								title: config.name,
								url: `https://${config.domain}/search${query}`,
								description: "No posts matched your search.",
								color: 8529960,
								footer: {
									text: config.name,
									icon_url: config.icon
								}
							}
						});
					}
				} else {
					var image = json.images[Math.floor(Math.random() * json.images.length)];
					if (!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply(`https://${config.domain}/images/${image.id}`);
					} else {
						var artists = image.tags.filter(function (i) {
							if (i) {
								return (i.substring(0, 7) === "artist:");
							}
						}),
							artists_string = (artists.length ? artists.join(", ").replace(/artist:/g, "") :
								(image.source_url !== null ? image.source_url : 'Unknown Artist')),
							ratingArray = ["explicit", "questionable", "suggestive", "safe", "grotesque", "grimdark", "semi-grimdark"],
							// hardcoded because i'm lazy and they're very unlikely to change
							ratings = image.tags.filter(function (i) {
								if (i) {
									return (ratingArray.indexOf(i) !== -1 ? true : false)
								}
							}).join(", "),
							source_url = (
								image.source_url !== null ?
									(image.source_url.substring(0, 4) == "http" ? image.source_url : '') : '');
						var description = Textile(image.description).replace("{{DOMAIN}}",config.domain);
						PMembed = new Discord.MessageEmbed({
							author: {
								name: (artists_string.length ?
									(artists_string.length > 64 ? artists_string.substr(0, 63) + "…" : artists_string) :
									(source_url.length > 64 ? source_url.substr(0, 63) + "…" : source_url)),
								url: source_url
							},
							title:
								`${config.name} - Image #${image.id}` + (
									image.original_format == 'webm' ? ' [WebM]' : ''
								) + ` (${ratings})`,
							url: `https://${config.domain}/images/${image.id}${params !== "*" ? "?q=" + qs.escape(params) : ''}`,
							description: description.length > 420 ? description.substr(0, 420) + "…" : description,
							color: config.color,
							image: {
								url: (image.original_format == "webm" ? `${image.representations.thumb.replace(".webm", ".gif")}` : `${image.height > 1024 && image.aspect_ratio < 1 ? image.representations.tall : image.representations.large}`)
							},
							footer: {
								text: `${image.uploader !== null ? `Uploaded by ${image.uploader} |` : ""} \u2b50\ufe0f ${image.faves} ${(image.score > 0 ? "\u2b06" : (image.score < 0 ? "\u2b07" : "\u2195")) + "\ufe0f " + Math.abs(image.score)} \u{1f5e8}\ufe0f ${image.comment_count}`,
								icon_url: config.icon
							},
							timestamp: image.created_at +
								(image.created_at.indexOf("Z") != -1 ? "" : "Z") // hacky workaround for broken UTC timestamp in /search
						});
						msg.reply((image.spoilered ? `**Spoilered by current filter** ||https:\/\/${config.domain}/images/${image.id}||` : undefined), { embed: PMembed });
					}
				}
			})
			.catch(e => {
				console.error("[Philomena Error] " + e.stack);
				msg.reply(`An error occurred. Please try again later. (\`${e}\`)\n\n` +
					"(URL: " + response.request.uri.href + ")");
			})
			.finally(() => msg.channel.stopTyping());
	}
};

// Textile parser
var TextileMap = new Map([
	//escapes
	[/(\r\n|\r|\n\r)/g,'\n'],

	[/\*([\s\S]+?)\*($| |\n|":)/gi,'**$1**$2'],
	[/_([\s\S]+?)_($| |\n|":)/gi,'*$1*$2'],
	[/\+([\s\S]+?)\+($| |\n|":)/gi,'__$1__$2'],
	[/-([\s\S]+?)-($| |\n|":)/gi,'~~$1~~$2'],
	[/@([\s\S]+?)@($| |\n|":)/gi,'`$1`$2'],
	[/\[spoiler\]([\s\S]+?)\[\/spoiler\]/gi,'||$1||'],

	//disabled since there's no Discord equivalent
	[/\^([\s\S]+?)\^($| |\n|":)/gi,'$1$2'], // Superscript
	[/~([\s\S]+?)\~($| |\n|":)/gi,'$1$2'], // Subscript
	[/!(https?:\/\/[\S]+?)\!($| |\n|":)/gi,'[\u{1f5bc}\ufe0f]($1)$2'], // Inline image
	[/!\/([^\s!]+?)\!($| |\n|":)/gi,'[\u{1f5bc}\ufe0f](https://{{DOMAIN}}/$1)$2'], // Inline image, local domain
	[/!([^\s!]+?)!:([^\s"]+)/g,'[\u{1f5bc}\ufe0f]($1) $2'], // linked image
	[/\[bq\]([\s\S]+?)\[\/bq\]/gi,'$1'], // block quotes


	//link with brackets
	[/\[\"([^"]+?)\":\/([^\s"]+)\]/g, '[$1](https://{{DOMAIN}}/$2)'], //local links, that stay on the page
	[/\[\"([^"]+?)\":([^\s"]+)\]/g,'[$1]($2)'],
	//links
	[/\"([^"]+?)\":\/([^\s"]+)/g, '[$1](https://{{DOMAIN}}/$2)'], //local links, that stay on the page
	[/\"([^"]+?)\":([^\s"]+)/g,'[$1]($2)'],
	[/>>([0-9]+)([pst]?)/gi,'[>>$1$2](https://{{DOMAIN}}/$1)']
]);

function Textile(text) {
	TextileMap.forEach((value, key) => {
		text = text.replace(key, value);
	});

	return text;
};
