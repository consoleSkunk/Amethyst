var { MessageEmbed } = require('discord.js'),
    { twitter } = require('../config/config.json');
    TwitterClient = require('twitter');

	var client = new TwitterClient({
		consumer_key: twitter.consumer_key,
		consumer_secret: twitter.consumer_secret,
		bearer_token: twitter.bearer_token
	});


exports.module = {
	name: "twitter",
	description: "Re-embeds a tweet",
	options: [{
		name: 'url',
		type: 'STRING',
		description: "URL to tweet",
		required: true,
	}],
	process: function (interaction) {
		var regex = /^(?:https?:\/\/twitter\.com\/\w{1,15}\/(?:status|statuses)\/)?(\d{2,20})/;

		if(!regex.test(interaction.options.getString('url'))) {
			interaction.reply({content: "That doesn't appear to be a valid Twitter status URL.", ephemeral: true});
			return;
		}
		
		var tweetId = regex.exec(interaction.options.getString('url'))[1];
		
		client.get('statuses/show', {id: tweetId, tweet_mode: 'extended'}, (error, tweet) => {
			if(error) {
				console.log(error);
				interaction.reply({content: error[0].message, ephemeral: true})
			} else {
				console.log(tweet);
				var twEmbed = new MessageEmbed({
					author: {
						name: `${tweet.user.name} (@${tweet.user.screen_name})`,
						url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
						iconURL: tweet.user.profile_image_url_https
					},
					color: tweet.possibly_sensitive ? 0x800020 : 0x43B581,
					description: tweet.full_text,
					footer: {
						text: /<a .+>(.+)<\/a>/.exec(tweet.source)[1]
					},
					timestamp: new Date(tweet.created_at).toISOString()
				});
				if(tweet.entities.media) twEmbed.setImage(tweet.entities.media[0].media_url_https)
				interaction.reply({embeds: [twEmbed]})
			}
		});
	}
};
