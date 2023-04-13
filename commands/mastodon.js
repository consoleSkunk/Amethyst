var { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js'),
    fetch = require("node-fetch"),
    turndown = require("turndown"),
    { name, version } = require('../package.json');

exports.module = {
	command: {
		name: "mastodon",
		description: "Re-embeds a toot",
		options: [{
			name: 'url',
			type: ApplicationCommandOptionType.String,
			description: "URL to toot",
			required: true,
		}],
	},
	process: function (interaction) {
		var regex = /^https?:\/\/((?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6})\/(?:@|users\/)[a-zA-Z0-9_]{1,30}(?:\/statuses)?\/(\d{1,20})/;

		if(!regex.test(interaction.options.getString('url'))) {
			interaction.reply({content: "That doesn't appear to be a valid Mastodon post URL.", ephemeral: true});
			return;
		}
		
		fetch(`https://${regex.exec(interaction.options.getString('url'))[1]}/api/v1/statuses/${regex.exec(interaction.options.getString('url'))[2]}`, {
			headers: {
				'User-Agent': `${name}/${version}`
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
			var content = (toot.spoiler_text !== "" ? `**CW: ${toot.spoiler_text}** ||${toot.url}||` : toot.url);
			var tootText = new turndown().turndown(toot.content);

			var embeds = [
				new EmbedBuilder({
					author: {
						name: `${toot.account.display_name} (@${toot.account.username})`,
						url: toot.account.url,
						iconURL: toot.account.avatar
					},
					url: toot.url,
					color: toot.sensitive ? 0xf4212e : 0x00ba7c,
					description: tootText,
					footer: {
						text: (toot.application !== null ? toot.application.name : "Mastodon"),
						iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Mastodon_logotype_%28simple%29_new_hue.svg/128px-Mastodon_logotype_%28simple%29_new_hue.svg.png"
					},
					timestamp: new Date(toot.created_at).toISOString()
				})
			];
			
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
				for(j=0; j<toot.media_attachments.length; j++) {
					if(toot.media_attachments[j].type == "video" || toot.media_attachments[j].type == "gifv")
						hasVideo = true;
				}
				if(hasVideo) {
					media = [];
					 if(toot.media_attachments.length > 1) {
						for(let i = 0; i < toot.media_attachments.length; i++) {
							media.push(`[${toot.media_attachments[i].type}](${toot.media_attachments[i].url})`);
						}
					}
					embeds = [];
					content = (toot.spoiler_text !== "" ? `**CW: ${toot.spoiler_text}**\n||` : "") + 
					`**[${toot.account.display_name} (@${toot.account.username})](<${toot.url}>)**` +
					` \[ ${media.join(" ")} \]${toot.spoiler_text !== "" ? " ||" : ""}\n` +
					`${/\S/g.test(tootText) ? `>>> ${tootText}` : ""}\n`;
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
