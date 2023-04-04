var Discord = require("discord.js");

exports.module = {
	command: {
		name: "emoji",
		description: "View the details of a custom emoji.",
		options: [{
			name: 'emoji',
			type: Discord.ApplicationCommandOptionType.String,
			description: "The emoji to fetch.",
			required: true
		}],
	},
	process: function(interaction, client) {
		var option = interaction.options.getString('emoji');

		var emojiRegex = /^<(a?):(\w+):(\d+)>$/;
		var idRegex = /^\d+$/;

		if(option.match(emojiRegex)) {
			var regex = emojiRegex.exec(option),
				emoji = client.emojis.resolve(regex[3]),
				embed = new Discord.EmbedBuilder({
				title: `${emoji !== null ? (emoji.requiresColons ? "\\:"+emoji.name+"\\:" : emoji.name) : "\\:" + regex[2] + "\\:"}`,
				image: {
					url: `https://cdn.discordapp.com/emojis/${regex[3]}.${regex[1] == "a" ? "gif" : "png"}?v=1`
				},
				url: `https://cdn.discordapp.com/emojis/${regex[3]}.${regex[1] == "a" ? "gif" : "png"}?v=1`,
				timestamp: Discord.SnowflakeUtil.deconstruct(regex[3]).date,
				color: 16426522
			});
			if(emoji !== null) {
				embed.setFooter({text: emoji.guild.name, iconURL: emoji.guild.iconURL({size:128,format:"png",dynamic:true})});
			}
			interaction.reply({content: `https://cdn.discordapp.com/emojis/${regex[3]}.${regex[1] == "a" ? "gif" : "png"}`, embeds: [embed]});
		} else if(idRegex.test(option)) {
			var id = option;
				emoji = client.emojis.resolve(id),
				embed = new Discord.EmbedBuilder({
				image: {
					url: `https://cdn.discordapp.com/emojis/${id}.${emoji !== null && emoji.animated ? "gif" : "png"}?v=1`
				},
				url: `https://cdn.discordapp.com/emojis/${id}.${emoji !== null && emoji.animated ? "gif" : "png"}?v=1`,
				timestamp: Discord.SnowflakeUtil.deconstruct(id).date,
				color: 16426522
			});
			if(emoji !== null) {
				embed.setTitle(emoji.requiresColons ? ":"+emoji.name+":" : emoji.name);
				embed.setFooter({text: emoji.guild.name, iconURL: emoji.guild.iconURL({size:128,format:"png",dynamic:true})});
			}
			interaction.reply({content: `https://cdn.discordapp.com/emojis/${id}.${emoji !== null && emoji.animated ? "gif" : "png"}`, embeds: [embed]});
		} else {
			interaction.reply({content: "No valid custom emoji was specified.",ephemeral: true});
		}
	}
};
