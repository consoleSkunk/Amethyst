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
				interaction.reply(new MessageEmbed({
					author: {
						name: `${user.tag}'s avatar`,
						iconURL: user.defaultAvatarURL
					},
					image: {
						url: user.displayAvatarURL({size:4096,format:"png",dynamic:true})
					},
					url: user.displayAvatarURL({size:4096,format:"png",dynamic:true}),
					color: [7506394,7634829,4437377,16426522,15746887][user.discriminator % 5]
				}));
			} else {
				interaction.reply(`**${user.tag}** does not have an avatar.`, {ephemeral: true});
			}
		}

		var userOption = interaction.options.find(obj => obj.name == 'user');

		if (userOption !== undefined) {
			displayAvatar(userOption.user);
		} else {
			displayAvatar(interaction.user);
		}
	}
};
