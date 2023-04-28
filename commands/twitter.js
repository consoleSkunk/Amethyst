var { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js'),
    { contact } = require('../config/config.json'),
    { name, version } = require('../package.json'),
    fetch = require("node-fetch");

exports.module = {
	command: {
		name: "twitter",
		description: "Re-embeds a tweet",
		options: [{
			name: 'url',
			type: ApplicationCommandOptionType.String,
			description: "URL to tweet",
			required: true,
		}],
	},
	process: function (interaction) {
		var regex = /^(?:https?:\/\/(?:(?:mobile\.)?(?:[fv]x)?twitter\.com|[0-9a-z-.]*nitter[0-9a-z-.]*)\/\w{1,15}\/(?:status|statuses)\/)?(\d{2,20})/;

		if(!regex.test(interaction.options.getString('url'))) {
			interaction.reply({content: "That doesn't appear to be a valid Twitter status URL.", ephemeral: true});
			return;
		}
		
		var tweetId = regex.exec(interaction.options.getString('url'))[1];
		
		fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
			headers: {
				'User-Agent': `${name}/${version} (+${contact.project_url})`
			}
		})
		.then(res => {
			return res.json()
		})
		.then((response) => {
			if(response.code !== 200) {
				interaction.reply({content: response.message, ephemeral: true});
				return;
			}

			function parseTweet(text) {
				var newText = text;
				// parse @s and hashtags as links
				newText = newText.replaceAll(/@([a-z0-9_]{1,15})/gi,"[@\u200A$1](<https://twitter.com/$1>)");
				newText = newText.replaceAll(/#(\S+)/gi,"[#$1](<https://twitter.com/hashtag/$1>)");
				newText = newText.replaceAll(/\$([a-z]{1,6}(?:\.[a-z]{1,2})?)/gi,"[$$$1](<https://twitter.com/search?q=%24$1&src=cashtag_click>)");
				return newText;
			}

			var tweet = response.tweet;
			var content = tweet.url;

			var embeds = [
				new EmbedBuilder({
					author: {
						name: `${tweet.author.name} (@${tweet.author.screen_name})`,
						url: `https://twitter.com/${tweet.author.screen_name}`,
						iconURL: tweet.author.avatar_url
					},
					url: tweet.url,
					color: parseInt(tweet.color.replace("#","0x")),
					description: parseTweet(tweet.text),
					footer: {
						text: tweet.source,
						iconURL: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png"
					},
					timestamp: new Date(tweet.created_at).toISOString()
				})
			];

			if(tweet.quote)
				embeds[0].addFields([{
					name: `${tweet.quote.author.name} (@${tweet.quote.author.screen_name})`,
					value: `>>> ${parseTweet(tweet.quote.text)}`,
					inline: false
				}])
			
			if(tweet.likes >= 100)
				embeds[0].addFields([{
					name: "Likes",
					value: tweet.likes.toString(),
					inline: true
				}])
			if(tweet.retweets >= 100)
				embeds[0].addFields([{
					name: "Retweets",
					value: tweet.retweets.toString(),
					inline: true
			}])

			if(tweet.poll) {
				poll_array = [];

				// very old polls don't have voters_count set, use votes_count in that case
				// voters_count is used for multiple choice percentage calculation
				let votes = (tweet.poll.voters_count !== null ? tweet.poll.voters_count : tweet.poll.votes_count);
				for(let i=0; i < tweet.poll.options.length; i++) {
					// add each poll option to an array, which will later be joined by a newline
					poll_array.push(`${"\u2588".repeat(Math.round((tweet.poll.options[i].votes_count / votes) * 32))}\n` +
					`${tweet.poll.options[i].title}\u2000\u2000(${tweet.poll.options[i].votes_count == 0 ? "0" : Math.round((tweet.poll.options[i].votes_count / votes) * 1000)/10}%)`)
				}

				embeds[0].addFields([{
					name: `Poll \xB7 ${votes} votes`,
					value: `**Close${tweet.poll.expired ? "d" : "s"} <t:${Math.round(new Date(tweet.poll.expires_at).getTime() / 1000)}:R>**\n\n` +
					poll_array.join("\n"),
					inline: false
				}])
			}

			if(tweet.media || (tweet.quote && tweet.quote.media)) {
				var mediaSource = ((tweet.quote && tweet.quote.media) && !tweet.media  ? tweet.quote.media : tweet.media);

				if(mediaSource.photos) {
					 embeds[0].setImage(mediaSource.photos[0].url);

					 if(mediaSource.photos.length > 1) {
						for(let i = 1; i < mediaSource.photos.length; i++) {
							embeds.push(new EmbedBuilder({
								url: tweet.url,
								image: {url: mediaSource.photos[i].url}
							}))
						}
					}
				}

				if(mediaSource.videos) {
					media = [];
					for(let i = 0; i < mediaSource.videos.length; i++) {
						media.push(`[video](${mediaSource.videos[i].url})`);
					}

					embeds = [];
					content = `**[${tweet.author.name} (@${tweet.author.screen_name})](<${tweet.url}>)**` +
					` \[ ${media.join(" ")} \]\n` +
					`${/\S/g.test(tweet.text) ? `>>> ${tweet.text.replace(/\[([^\[\]()]+)\]\(([^\[\]()]+)\)/g,"[$1](<$2>)")}` : ""}\n`;
				}
			}
			interaction.reply({content: content, embeds: embeds})
		})
		.catch(err => {
			interaction.reply({content: "Failed to fetch Tweet: ```js\n" + err + "```", ephemeral: true})
			console.error("[Command Error: /twitter]",err);
		});
	}
};
