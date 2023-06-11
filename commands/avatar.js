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

		var colorId = (["0","0000",null,undefined].includes(user.discriminator)) ? (Number(BigInt(user.id) >> 22n) % 6) : user.discriminator % 5;
		
		if(user.avatar !== null || hasServerAvatar) {
			interaction.reply({embeds: [new EmbedBuilder({
				author: {
					name: `${["0",null,undefined].includes(user.discriminator) ? user.username : user.tag}'s ${hasServerAvatar ? "server " : ""}avatar`,
					iconURL: (hasServerAvatar ? user.displayAvatarURL({size:4096,format:"png",dynamic:true}) : `https://cdn.discordapp.com/embed/avatars/${colorId}.png`)
				},
				image: {
					url: avatar
				},
				url: avatar,
				color: [0x5865f2,0x757e8a,0x3ba55c,0xfaa61a,0xed4245,0xeb459f][colorId]
			})]});
		} else {
			interaction.reply({content: `**${user.tag}** does not have an avatar.`, ephemeral: true});
		}
	}
};
