const { ApplicationCommandOptionType } = require('discord.js');

exports.module = {
	command: {
		name: "sdate",
		description: "Check what day of Eternal September it is.",
		options: [
			{
				name: 'epoch',
				type: ApplicationCommandOptionType.String,
				description: "The starting month in YYYY-MM format",
				required: false
			},
		],
	},
	process: function(interaction) {
		var date;
		var epochRegex = /^(\d{4})[-\/](\d{2})$/
		if(interaction.options.get('epoch')) {
			if(!epochRegex.test(interaction.options.getString('epoch'))) {
				interaction.reply({content: `That doesn't appear to be a valid date.`, ephemeral: true});
				return;
			} else
				date = interaction.options.getString('epoch');
		} else
			date = "1993-09";

		var epoch = epochRegex.exec(date);

		var today = new Date();
		var epochDate = new Date(epoch[1],epoch[2]-1,1);
		var dayDiff = Math.ceil(
			(
				today.getTime() - epochDate.getTime()
			) / (1000 * 3600 *24)
		);
		var months = ['January','February','March','April','May','June','July','August','September','October','November','December']
		var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
		interaction.reply(`Today is ${days[today.getDay()]}, ${months[epochDate.getMonth()]} ${dayDiff}, ${epochDate.getFullYear()}`);
	}
};
