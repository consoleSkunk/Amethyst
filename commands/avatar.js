const { MessageEmbed } = require('discord.js');

exports.module = {
	name: "avatar",
	description: "Retrieves the specified user's avatar (or yours)",
	options: [{
		name: 'user',
		type: 'USER',
		description: "The user you want an avatar from",
		required: false
	}],
	process: function(interaction) {
		function displayAvatar(user) {
			if(user.avatar != null) {
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

		var userOption = interaction.options.get('user');

		if (userOption !== undefined) {
			displayAvatar(userOption.user);
		} else {
			displayAvatar(interaction.user);
		}
	}
};
