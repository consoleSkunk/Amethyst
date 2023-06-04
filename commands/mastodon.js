var { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js'),
    fetch = require("node-fetch"),
    turndown = require("turndown"),
    { contact } = require('../config/config.json'),
    { name, version } = require('../package.json');

var turndownService = new turndown({
	headingStyle: "atx",
	codeBlockStyle: "fenced"
});

turndownService.addRule('strikethrough', {
	filter: ['del', 's', 'strike'],
	replacement: function (content) {
		return '~~' + content + '~~'
	}
})

exports.module = {
	command: {
		name: "mastodon",
		description: "Re-embeds a toot",
		options: [{
			name: 'url',
			type: ApplicationCommandOptionType.String,
			description: "URL to toot",
			required: true,
		},
		{
			name: 'cw',
			type: ApplicationCommandOptionType.Boolean,
			description: "Reveal toot marked by CW instead of spoilering it",
			required: false
		}],
	},
	process: function (interaction) {
		var regex = /^https?:\/\/((?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z0-9-]{1,62})\/(?:@|users\/)[a-zA-Z0-9_]{1,30}(?:@(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{1,62})?(?:\/statuses)?\/(\d{1,20})/;

		if(!regex.test(interaction.options.getString('url'))) {
			interaction.reply({content: "That doesn't appear to be a valid Mastodon post URL.", ephemeral: true});
			return;
		}
		
		fetch(`https://${regex.exec(interaction.options.getString('url'))[1]}/api/v1/statuses/${regex.exec(interaction.options.getString('url'))[2]}`, {
			headers: {
				'User-Agent': `${name}/${version} (+${contact.project_url})`
			}
		})
		.then(res => {
			return res.json()
		})
		.then((toot) => {
			if(toot.error) {
				interaction.reply({content: toot.error, ephemeral: true});
				return;
			}
			var showCW = interaction.options.getBoolean('cw');
			var cwText =  (toot.spoiler_text !== "" ? (toot.spoiler_text > 500 ? toot.spoiler_text.substr(0,499) + "…" : toot.spoiler_text) : "")
			var content = (toot.spoiler_text !== "" ? `**CW: ${cwText}** ${showCW ? toot.url : `||${toot.url}||`}` : toot.url);
			var tootText = turndownService.turndown(toot.content).replace(/\[([^[\]()]+)]\(\1\)/g,"$1");

			var embeds = [
				new EmbedBuilder({
					author: {
						name: `${toot.account.display_name} (@${toot.account.acct})`,
						url: toot.account.url,
						iconURL: toot.account.avatar
					},
					url: toot.url,
					color: toot.sensitive ? 0xf4212e : 0x00ba7c,
					description: (tootText.length > 4096 ? tootText.substr(0,4095) + "…" : tootText),
					footer: {
						text: (toot.application ? toot.application.name : "Mastodon"),
						iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Mastodon_logotype_%28simple%29_new_hue.svg/128px-Mastodon_logotype_%28simple%29_new_hue.svg.png"
					},
					timestamp: new Date(toot.created_at).toISOString()
				})
			];
			
			if(toot.edited_at !== null)
				embeds[0].addFields([{
					name: "\u200B",
					value: `*Edited <t:${Math.round(new Date(toot.edited_at).getTime() / 1000)}>*`,
					inline: false
				}])
			
			if(toot.favourites_count >= 100)
				embeds[0].addFields([{
					name: "Favourites",
					value: toot.favourites_count.toString(),
					inline: true
				}])
			if(toot.reblogs_count >= 100)
				embeds[0].addFields([{
					name: "Boosts",
					value: toot.reblogs_count.toString(),
					inline: true
			}])

			if(toot.poll) {
				poll_array = [];

				// very old polls don't have voters_count set, use votes_count in that case
				// voters_count is used for multiple choice percentage calculation
				let votes = (toot.poll.voters_count !== null ? toot.poll.voters_count : toot.poll.votes_count);
				for(let i=0; i < toot.poll.options.length; i++) {
					// add each poll option to an array, which will later be joined by a newline
					poll_array.push(`${"\u2588".repeat(Math.round((toot.poll.options[i].votes_count / votes) * 32))}\n` +
					`${toot.poll.options[i].title}\u2000\u2000(${toot.poll.options[i].votes_count == 0 ? "0" : Math.round((toot.poll.options[i].votes_count / votes) * 1000)/10}%)`)
				}

				embeds[0].addFields([{
					name: `Poll \xB7 ${votes} votes`,
					value: `**Close${toot.poll.expired ? "d" : "s"} <t:${Math.round(new Date(toot.poll.expires_at).getTime() / 1000)}:R>**\n\n` +
					poll_array.join("\n"),
					inline: false
				}])
			}

			if(toot.media_attachments.length > 0) {
				if(toot.media_attachments[0].type == "image") {
					 embeds[0].setImage(toot.media_attachments[0].url);

					 if(toot.media_attachments.length > 1) {
						for(let i = 1; i < toot.media_attachments.length; i++) {
							embeds.push(new EmbedBuilder({
								url: toot.url,
								image: {url: toot.media_attachments[i].url}
							}))
						}
					}
				}

				var hasVideo = false;
				for(let j=0; j<toot.media_attachments.length; j++) {
					if(toot.media_attachments[j].type == "video" || toot.media_attachments[j].type == "gifv" || toot.media_attachments[j].type == "audio")
						hasVideo = true;
				}
				if(hasVideo) {
					media = [];
					for(let i = 0; i < toot.media_attachments.length; i++) {
						media.push(`[${toot.media_attachments[i].type}](${toot.media_attachments[i].url})`);
					}

					embeds = [];
					content = (toot.spoiler_text !== "" ? `**CW: ${cwText}**\n${showCW ? "" : "||"}` : "") + 
					`**[${toot.account.display_name} (@${toot.account.acct})](<${toot.url}>)**` +
					` \[ ${media.join(" ")} \]\n` +
					`${/\S/g.test(tootText) ? `>>> ${(tootText.length > 1024 ? tootText.substr(0,1023) + "…" : tootText).replace(/\[([^\[\]()]+)\]\(([^\[\]()]+)\)/g,"[$1](<$2>)")}` : ""}${toot.spoiler_text !== "" && !showCW ? "||" : ""}\n`;
				}
			}
			interaction.reply({content: content, embeds: embeds})
		})
		.catch(err => {
			interaction.reply({content: "Failed to fetch Mastodon post: ```js\n" + err + "```", ephemeral: true})
			console.error("[Command Error: /mastodon]",err);
		});
	}
};
