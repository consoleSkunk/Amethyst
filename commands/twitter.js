var { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js'),
    { twitter } = require('../config/config.json');
    TwitterClient = require('twitter');

	var client = new TwitterClient({
		consumer_key: twitter.consumer_key,
		consumer_secret: twitter.consumer_secret,
		bearer_token: twitter.bearer_token
	});


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
		var regex = /^(?:https?:\/\/(?:mobile\.)?(?:[fv]x)?twitter\.com\/\w{1,15}\/(?:status|statuses)\/)?(\d{2,20})/;

		if(!regex.test(interaction.options.getString('url'))) {
			interaction.reply({content: "That doesn't appear to be a valid Twitter status URL.", ephemeral: true});
			return;
		}
		
		var tweetId = regex.exec(interaction.options.getString('url'))[1];
		
		client.get('statuses/show', {id: tweetId, tweet_mode: 'extended'}, (error, tweet) => {
			if(error) {
				interaction.reply({content: error[0].message, ephemeral: true})
			} else {
				function parseTweet(text) {
					var newText = text;
					// escape encoded html
					newText = newText.replaceAll("&lt;","<");
					newText = newText.replaceAll("&gt;",">");
					newText = newText.replaceAll("&amp;","&");
					// parse @s and hashtags as links
					newText = newText.replaceAll(/@([a-z0-9_]{1,15})/gi,"[@\u200A$1](https://twitter.com/$1)");
					return newText;
				}

				var content = `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;

				var embeds = [
					new EmbedBuilder({
						author: {
							name: `${tweet.user.name} (@${tweet.user.screen_name})`,
							url: `https://twitter.com/${tweet.user.screen_name}`,
							iconURL: tweet.user.profile_image_url_https
						},
						url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
						color: tweet.possibly_sensitive ? 0xf4212e : 0x00ba7c,
						description: parseTweet(tweet.full_text),
						footer: {
							text: /<a .+>(.+)<\/a>/.exec(tweet.source)[1],
							iconURL: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png"
						},
						timestamp: new Date(tweet.created_at).toISOString()
					})
				];
				if(tweet.quoted_status)
					embeds[0].addFields([{
						name: `${tweet.quoted_status.user.name} (@${tweet.quoted_status.user.screen_name})`,
						value: `>>> ${parseTweet(tweet.quoted_status.full_text)}`,
						inline: false
					}])
				
				if(tweet.favorite_count >= 100)
					embeds[0].addFields([{
						name: "Likes",
						value: tweet.favorite_count.toString(),
						inline: true
					}])
				if(tweet.retweet_count >= 100)
					embeds[0].addFields([{
						name: "Retweets",
						value: tweet.retweet_count.toString(),
						inline: true
				}])

				if(tweet.extended_entities) {
					if(tweet.extended_entities.media[0].type == "photo") {
						 embeds[0].setImage(tweet.extended_entities.media[0].media_url_https);

						 if(tweet.extended_entities.media.length > 1) {
							for(let i = 1; i < tweet.extended_entities.media.length; i++) {
								embeds.push(new EmbedBuilder({
									url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
									image: {url: tweet.extended_entities.media[i].media_url_https}
								}))
							}
						}
					}

					if(tweet.extended_entities.media[0].type == "video" || tweet.extended_entities.media[0].type == "animated_gif") {
						var best_video_index = -1;
						var best_bitrate = -1;
						for(let i = 0; i < tweet.extended_entities.media[0].video_info.variants.length; i++) {
							var video = tweet.extended_entities.media[0].video_info.variants[i];
							if(video.bitrate <= best_bitrate || video.content_type != "video/mp4")
								continue;
					
							best_bitrate = video.bitrate;
							best_video_index = i;
						}

						//embeds[0].setThumbnail(tweet.extended_entities.media[0].media_url_https);
						embeds = [];
						content = `**[${tweet.user.name} (@${tweet.user.screen_name})](<${content}>)**` +
						`[](${tweet.extended_entities.media[0].video_info.variants[best_video_index].url})\n` +
						`>>> ${parseTweet(tweet.full_text).replaceAll(/https?:\/\/\S+/g,"<$&>")}\n`;
					}
				}
				interaction.reply({content: content, embeds: embeds})
			}
		});
	}
};
