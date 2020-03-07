exports.module = {
	commands: ["avatar","avie","av"],
	description: "Retrieves the mentioned user's avatar, or yours if not specified.",
	syntax: "[@mention]",
	tags: [],
	process: function(client, msg, params){
		if (params.length > 0) {
			if (msg.mentions.users.array()[0] != null) {
				var mention = msg.mentions.users.array()[0];
				if(mention.avatar != null) {
					if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply(mention.displayAvatarURL({size:2048}).replace(".webp",".png"));
					} else {
						msg.reply(undefined, {embed: {
							author: {
								name: `${mention.tag}'s avatar`
							},
							image: {
								url: mention.displayAvatarURL({size:2048}).replace(".webp",".png")
							},
							url: mention.displayAvatarURL({size:2048}).replace(".webp",".png"),
							color: 16426522
						}});
					}
				} else {
					msg.reply(`**${mention.username}** does not have an avatar.`);
				}
			} else if (/^\d+$/.test(params)) {
				if(client.users.get(params) !== undefined) {
					var user = client.users.get(params);
					if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply(user.displayAvatarURL({size:2048}).replace(".webp",".png"));
					} else {
						msg.reply(undefined, {embed: {
							author: {
								name: `${user.tag}'s avatar`
							},
							image: {
								url: user.displayAvatarURL({size:2048}).replace(".webp",".png")
							},
							url: user.displayAvatarURL({size:2048}).replace(".webp",".png"),
							color: 16426522
						}});
					}
				} else {
					msg.reply("I could not find the user you requested.");
				}
			}
		}
		else {
			if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
				msg.reply(msg.author.displayAvatarURL({size:2048}).replace(".webp",".png"));
			} else {
				msg.reply(undefined, {embed: {
					author: {
						name: `${msg.author.tag}'s avatar`
					},
					image: {
						url: msg.author.displayAvatarURL({size:2048}).replace(".webp",".png")
					},
					url: msg.author.displayAvatarURL({size:2048}).replace(".webp",".png"),
					color: 16426522
				}});
			}
		}
	}
};
