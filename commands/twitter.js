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
				function parseTweet(thisTweet) {
					var parsedText = thisTweet.full_text;
					// replace each hashtag with a link to it
					thisTweet.entities.hashtags.forEach((hashtag) => {
						parsedText = parsedText.replace(`#${hashtag.text}`, `[#${hashtag.text}](https://twitter.com/hashtag/${encodeURIComponent(hashtag.text)})`)
					})
					
					if(thisTweet.entities.media)
						thisTweet.entities.media.forEach((media) => {
							// strip out media link *unless* we're in a QRT (as we do not show quoted media)
							parsedText = parsedText.replace(media.url,
								(thisTweet === tweet.quoted_status ? `[${media.display_url}](${media.expanded_url})` : "")
							)
						})

					//cashtags are pretty much the same as hashtags, except it needs to be a search result
					thisTweet.entities.symbols.forEach((symbol) => {
						parsedText = parsedText.replace(`\$${symbol.text}`, `[\$${symbol.text}](https://twitter.com/search?q=%24${encodeURIComponent(symbol.text)})`)
					})

					// t.co links are replaced with their original links unless it's too long
					thisTweet.entities.urls.forEach((url) => {
						parsedText = parsedText.replace(url.url, `[${url.display_url}](${url.expanded_url.length <= 800/thisTweet.entities.urls.length ? url.expanded_url : url.url})`)
					})

					// mentions require a case-insensitive search in case there's different capitalization
					thisTweet.entities.user_mentions.forEach((mention) => {
						parsedText = parsedText.replace(new RegExp(`@(${mention.screen_name})`,'i'), `[@\u200A$1](https://twitter.com/${encodeURIComponent(mention.screen_name)})`)
					})
				
					// escape encoded html
					parsedText = parsedText.replaceAll("&lt;","<");
					parsedText = parsedText.replaceAll("&gt;",">");
					parsedText = parsedText.replaceAll("&amp;","&");
					return parsedText;
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
						description: parseTweet(tweet),
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
						value: `>>> ${parseTweet(tweet.quoted_status)}`,
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
						
						var tweetText = parseTweet(tweet).replaceAll(/https?:\/\/[^ \[\](){}]+/g,"<$&>");

						//embeds[0].setThumbnail(tweet.extended_entities.media[0].media_url_https);
						embeds = [];
						content = `**[${tweet.user.name} (@${tweet.user.screen_name})](<${content}>)**` +
						`[](${tweet.extended_entities.media[0].video_info.variants[best_video_index].url})\n` +
						`${/\S/g.test(tweetText) ? `>>> ${tweetText}` : ""}\n`;
					}
				}
				interaction.reply({content: content, embeds: embeds})
			}
		});
	}
};
