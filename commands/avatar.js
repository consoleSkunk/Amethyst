const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');

exports.module = {
	command: {
		name: "avatar",
		description: "Retrieves the specified user's avatar",
		options: [{
			name: 'user',
			type: ApplicationCommandOptionType.User,
			description: "The user you want an avatar from",
			required: true
		},
		{
			name: 'server',
			type: ApplicationCommandOptionType.Boolean,
			description: "Whether to return the server avatar",
			required: false
		}],
	},
	process: function(interaction) {
		var user = interaction.options.getUser('user');

		var hasServerAvatar = (
			interaction.options.getBoolean('server') &&
			interaction.guild &&
			interaction.guild.members.resolve(user) != null &&
			interaction.guild.members.resolve(user).avatar != null
		)
		var avatar = (
			hasServerAvatar ? 
			interaction.guild.members.resolve(user).displayAvatarURL({size:4096,format:"png",dynamic:true}) :
			user.displayAvatarURL({size:4096,format:"png",dynamic:true})
		)
		
		if(user.avatar !== null || hasServerAvatar) {
			interaction.reply({embeds: [new EmbedBuilder({
				author: {
					name: `${user.tag}'s ${hasServerAvatar ? "server " : ""}avatar`,
					iconURL: (hasServerAvatar ? user.displayAvatarURL({size:4096,format:"png",dynamic:true}) : user.defaultAvatarURL)
				},
				image: {
					url: avatar
				},
				url: avatar,
				color: [0x5865f2,0x757e8a,0x3ba55c,0xfaa61a,0xed4245][user.discriminator % 5]
			})]});
		} else {
			interaction.reply({content: `**${user.tag}** does not have an avatar.`, ephemeral: true});
		}
	}
};
