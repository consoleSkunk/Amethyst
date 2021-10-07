const { MessageEmbed } = require('discord.js');

exports.module = {
	name: "avatar",
	description: "Retrieves the specified user's avatar (or yours)",
	options: [{
		name: 'user',
		type: 'USER',
		description: "The user you want an avatar from",
		required: false
	},
	{
		name: 'server',
		type: 'BOOLEAN',
		description: "Whether to return the server avatar",
		required: false
	}],
	process: function(interaction) {
		function displayAvatar(user) {
			if(interaction.options.getBoolean('server') && user.avatar !== null && interaction.guild.members.resolve(user) != null) {
				var hasServerAvatar = (interaction.guild.members.resolve(user).avatar != null)
				var serverAvatar = interaction.guild.members.resolve(user).displayAvatarURL({size:4096,format:"png",dynamic:true});
				var globalAvatar = user.displayAvatarURL({size:4096,format:"png",dynamic:true});
				
				interaction.reply({embeds: [new MessageEmbed({
					author: {
						name: `${user.tag}'s ${hasServerAvatar ? "server " : ""}avatar`,
						iconURL: (hasServerAvatar ? globalAvatar : user.defaultAvatarURL)
					},
					image: {
						url: (hasServerAvatar ? serverAvatar : globalAvatar)
					},
					url: (hasServerAvatar ? serverAvatar : globalAvatar),
					color: [0x5865f2,0x757e8a,0x3ba55c,0xfaa61a,0xed4245][user.discriminator % 5]
				})]});
			} else if(user.avatar != null) {
				interaction.reply({embeds: [new MessageEmbed({
					author: {
						name: `${user.tag}'s avatar`,
						iconURL: user.defaultAvatarURL
					},
					image: {
						url: user.displayAvatarURL({size:4096,format:"png",dynamic:true})
					},
					url: user.displayAvatarURL({size:4096,format:"png",dynamic:true}),
					color: [0x5865f2,0x757e8a,0x3ba55c,0xfaa61a,0xed4245][user.discriminator % 5]
				})]});
			} else {
				interaction.reply({content: `**${user.tag}** does not have an avatar.`, ephemeral: true});
			}
		}

		var user = interaction.options.getUser('user');

		if (user !== null) {
			displayAvatar(user);
		} else {
			displayAvatar(interaction.user);
		}
	}
};
