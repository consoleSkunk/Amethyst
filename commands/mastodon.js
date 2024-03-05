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

turndownService.addRule('unmaskedLink', {
	filter: function (node, options) {
		return (
			options.linkStyle === 'inlined' &&
			node.nodeName === 'A' &&
			node.getAttribute('href') == node.textContent
		)
	},

	replacement: function (content, node) {
		var href = node.getAttribute('href')
		return '<' + href + '>'
	}
})

exports.module = {
	command: {
		name: "mastodon",
		description: "Re-embeds a post",
		options: [{
			name: 'url',
			type: ApplicationCommandOptionType.String,
			description: "URL to post",
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
		var mastodonRegex = /^https?:\/\/((?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z0-9-]{1,62})\/(?:@|deck\/@|users\/)[a-zA-Z0-9_]{1,30}(?:@(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{1,62})?(?:\/statuses)?\/(\d{1,20})/;
		var pleromaRegex = /^https?:\/\/((?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z0-9-]{1,62})\/notice\/([a-zA-Z0-9]{1,32})/;
		var misskeyRegex = /^https?:\/\/((?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z0-9-]{1,62})\/notes\/([a-zA-Z0-9]{1,32})/;
		
		var apiURL = "";

		if(mastodonRegex.test(interaction.options.getString('url'))) {
			apiURL = `https://${mastodonRegex.exec(interaction.options.getString('url'))[1]}/api/v1/statuses/${mastodonRegex.exec(interaction.options.getString('url'))[2]}`
		}
		else if(pleromaRegex.test(interaction.options.getString('url'))) {
			apiURL = `https://${pleromaRegex.exec(interaction.options.getString('url'))[1]}/api/v1/statuses/${pleromaRegex.exec(interaction.options.getString('url'))[2]}`
		}
		else if(misskeyRegex.test(interaction.options.getString('url'))) {
			// misskey API is incompatible so we're using misstodon as a proxy
			// https://github.com/gizmo-ds/misstodon
			apiURL = `https://misstodon.aika.dev/api/v1/statuses/${misskeyRegex.exec(interaction.options.getString('url'))[2]}?server=${misskeyRegex.exec(interaction.options.getString('url'))[1]}`
		}
		else {
			interaction.reply({content: "That doesn't appear to be a valid post URL.", ephemeral: true});
			return;
		}
		
		interaction.deferReply().then(response => {
			interaction = response.interaction;
			fetch(apiURL, {
				headers: {
					'User-Agent': `${name}/${version} (+${contact.project_url})`
				}
			})
			.then(res => {
				return res.json()
			})
			.then((toot) => {
				if(toot.error) {
					interaction.followUp({content: toot.error, ephemeral: true})
					.then(interaction.deleteReply());
					return;
				}
				var showCW = interaction.options.getBoolean('cw');
				var cwText =  (toot.spoiler_text !== "" ? (toot.spoiler_text > 500 ? toot.spoiler_text.substring(0,499) + "…" : toot.spoiler_text) : "")
				var content = (toot.spoiler_text !== "" ? `**CW: ${cwText}** ${showCW ? toot.url : `||${toot.url}||`}` : toot.url);
				var tootText = turndownService.turndown(toot.content);

				var embeds = [
					new EmbedBuilder({
						author: {
							name: `${toot.account.display_name} (@${toot.account.acct})`,
							url: toot.account.url,
							iconURL: toot.account.avatar
						},
						url: toot.url,
						color: toot.sensitive ? 0xf4212e : 0x00ba7c,
						description: (tootText.length > 4096 ? tootText.substring(0,4095) + "…" : tootText),
						footer: {
							text: (toot.application ? toot.application.name : new URL(toot.url).hostname),
							iconURL: (toot.account.username !== toot.account.acct ? 
								"https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Fediverse_logo_proposal.svg/128px-Fediverse_logo_proposal.svg.png" :
								toot.pleroma ? new URL(toot.url).origin + "/favicon.png" :
								"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Mastodon_logotype_%28simple%29_new_hue.svg/128px-Mastodon_logotype_%28simple%29_new_hue.svg.png"
							)
						},
						timestamp: new Date(toot.created_at).toISOString()
					})
				];
				
				if(toot.account === undefined || Object.keys(toot.account).length === 0)
					embeds[0].setAuthor({
						name: `Unknown account`,
						url: toot.url,
						iconURL: "https://cdn.discordapp.com/embed/avatars/1.png"
					});
				
				if(toot.edited_at)
					embeds[0].addFields([{
						name: "Last edited",
						value: `<t:${Math.round(new Date(toot.edited_at).getTime() / 1000)}>`,
						inline: true
					}])

				if(toot.quote) {
					var quoteText = turndownService.turndown(toot.quote.content);
					embeds[0].addFields([{
						name: `${toot.quote.account.display_name} (@${toot.quote.account.acct})`,
						value: `>>> ${quoteText.length > 1024 ? quoteText.substring(0,1023) + "…" : quoteText}`,
						inline: false
					}])
				}
				
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
					let votes = (toot.poll.voters_count != null ? toot.poll.voters_count : toot.poll.votes_count);
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
						embeds[0].setImage(toot.media_attachments[0].remote_url != null ? toot.media_attachments[0].remote_url : new URL(toot.media_attachments[0].url,toot.url).href);

						if(toot.media_attachments.length > 1) {
							for(let i = 1; i < toot.media_attachments.length; i++) {
								embeds.push(new EmbedBuilder({
									url: toot.url,
									image: {url: toot.media_attachments[i].remote_url != null ? toot.media_attachments[i].remote_url : new URL(toot.media_attachments[i].url,toot.url).href}
								}))
							}
						}
					}

					var hasVideo = false,
					    hasAttachments = false;

					for(let j=0; j<toot.media_attachments.length; j++) {
						unembedded_media = [];
						if(toot.media_attachments[j].type == "video" || toot.media_attachments[j].type == "gifv")
							hasVideo = true;
						else if(toot.media_attachments[j].type == "unknown" || toot.media_attachments[j].type == "audio")
							hasAttachments = true;
					}
					if(hasAttachments && !hasVideo) {
						mediaText = [];
						for(let i = 0; i < toot.media_attachments.length; i++) {
							url = toot.media_attachments[i].remote_url != null ? toot.media_attachments[i].remote_url : new URL(toot.media_attachments[i].url,toot.url).href;
							if(toot.media_attachments[i].type == "unknown" || toot.media_attachments[i].type == "audio")
								mediaText.push(`${toot.media_attachments[i].type == "audio" ? "\u{1F50A}" : "\u{1F517}"} [${new URL(url).pathname.split('/').pop()}](${url})`);
						}
						embeds[0].addFields([{
							name: "Media",
							value: mediaText.join("\n"),
							inline: true
						}]);
					}
					else if(hasVideo) {
						mediaText = [];
						for(let i = 0; i < toot.media_attachments.length; i++) {
							mediaText.push(`[${toot.media_attachments[i].type}](${toot.media_attachments[i].remote_url != null ? toot.media_attachments[i].remote_url : new URL(toot.media_attachments[i].url,toot.url).href})`);
						}

						embeds = [];
						content = (toot.spoiler_text !== "" ? `**CW: ${cwText}**\n${showCW ? "" : "||"}` : "") + 
						`**[${toot.account === undefined || Object.keys(toot.account).length === 0 ? `Unknown account](<${toot.url}>)**` : `${toot.account.display_name} (@${toot.account.acct})](<${toot.url}>)**`}` +
						` \[ ${mediaText.join(" ")} \]\n` +
						`${/\S/g.test(tootText) ? `>>> ${(tootText.length > 1024 ? tootText.substring(0,1023) + "…" : tootText).replace(/\[([^\[\]()]+)\]\(([^\[\]()]+)\)/g,"[$1](<$2>)")}` : ""}${toot.spoiler_text !== "" && !showCW ? "||" : ""}\n`;
					}
				}
				interaction.editReply({content: content, embeds: embeds})
			})
			.catch(err => {
				interaction.followUp({content: "Failed to fetch post: ```js\n" + err + "```", ephemeral: true})
				.then(interaction.deleteReply());
				console.error("[Command Error: /mastodon]",err);
			});
		})
	}
};
