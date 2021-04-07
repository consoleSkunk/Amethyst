var Discord = require("discord.js");

exports.module = {
	name: "emoji",
	description: "View the details of a custom emoji, or list the custom emojis in this server.",
	options: [{
		name: 'emoji',
		type: 'STRING',
		description: "The emoji to fetch.",
		required: false
	}],
	process: function(interaction, client) {
		var params = "";
		if(interaction.options.length > 0)
			params = interaction.options.find(obj => obj.name == 'emoji').value;

		if (params.length > 0) {
			var emojiRegex = /^<(a?):(\w+):(\d+)>$/;
			var idRegex = /^\d+$/;

			if(params.match(emojiRegex)) {
				var regex = emojiRegex.exec(params),
					emoji = client.emojis.resolve(regex[3]),
					embed = new Discord.MessageEmbed({
					title: `${emoji !== null ? (emoji.requiresColons ? ":"+emoji.name+":" : emoji.name) : ":" + regex[2] + ":"}`,
					image: {
						url: `https://cdn.discordapp.com/emojis/${regex[3]}.${regex[1] == "a" ? "gif" : "png"}?v=1`
					},
					url: `https://cdn.discordapp.com/emojis/${regex[3]}.${regex[1] == "a" ? "gif" : "png"}?v=1`,
					timestamp: Discord.SnowflakeUtil.deconstruct(regex[3]).date,
					color: 16426522
				});
				if(emoji !== null) {
					embed.setFooter(emoji.guild.name,emoji.guild.iconURL({size:128,format:"png",dynamic:true}));
				}
				interaction.reply(undefined,{embed: embed});
			} else if(idRegex.test(params)) {
				var id = params;
					emoji = client.emojis.resolve(id),
					embed = new Discord.MessageEmbed({
					image: {
						url: `https://cdn.discordapp.com/emojis/${id}.${emoji !== null && emoji.animated ? "gif" : "png"}?v=1`
					},
					url: `https://cdn.discordapp.com/emojis/${id}.${emoji !== null && emoji.animated ? "gif" : "png"}?v=1`,
					timestamp: Discord.SnowflakeUtil.deconstruct(id).date,
					color: 16426522
				});
				if(emoji !== null) {
					embed.setTitle(emoji.requiresColons ? ":"+emoji.name+":" : emoji.name);
					embed.setFooter(emoji.guild.name,emoji.guild.iconURL({size:128,format:"png",dynamic:true}));
				}
				interaction.reply(undefined,{embed: embed});
			} else {
				interaction.reply("No valid custom emoji was specified.",{ephemeral: true});
			}
		} else {
			var emojis = interaction.guild.emojis.cache,
				static = emojis.filter(emoji => !emoji.animated),
				animated = emojis.filter(emoji => emoji.animated)
				embed = new Discord.MessageEmbed({
					author: {
						name: interaction.guild.name,
						iconURL: interaction.guild.iconURL({size:2048}).replace(".webp",".png")
					},
					title: "Emoji List",
					color: 16426522,
					footer: {
						text: `${emojis.size} total: ${static.size} static, ${animated.size} animated`
					}
				});
			var emojiList = "";
			emojis.array().forEach((emoji, i) => {
				emojiList += `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}> \`:${emoji.name}:\`\n`
				if ((i+1) % 10 === 0 || i+1 == emojis.size){
					embed.addField("\u200B",emojiList,true);
					emojiList = "";
				}
			});
			interaction.reply(undefined,{embed: embed});
		}

	}
};
