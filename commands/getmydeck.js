var fetch = require("node-fetch"),
    { MessageEmbed, ApplicationCommand, CommandInteraction } = require('discord.js'),
    { name, version } = require('../package.json');

exports.module = {
	name: "getmydeck",
	description: "Returns reservation status from GetMyDeck.",
	options: [
		{
			name: 'timestamp',
			type: 'INTEGER',
			description: "Reservation timestamp",
			required: true
		},
		{
			name: 'region',
			type: 'STRING',
			description: "Your region",
			required: true,
			choices: [
				{name: "United States", value: "US"},
				{name: "United Kingdom", value: "UK"},
				{name: "European Union", value: "EU"},
			]
		},
		{
			name: 'model',
			type: 'STRING',
			description: "Your reserved model",
			required: true,
			choices: [
				{name: "64GB eMMC", value: "64"},
				{name: "256GB NVMe", value: "256"},
				{name: "512GB NVMe", value: "512"},
			]
		}
	],
	process: function(interaction) {
		let timestamp = interaction.options.getInteger('timestamp'),
		    region = interaction.options.getString('region'),
		    model = interaction.options.getString('model');

		if(timestamp <= 1626454800) {
			return interaction.reply({content: "**Error:** Reservations were not open at that point in time.", ephemeral: true})
		} else if(timestamp > new Date().getTime()/1000) {
			return interaction.reply({content: "**Error:** That timestamp appears to be ", ephemeral: true})
		}
		fetch(`https://getmydeck.ingenhaag.dev/api/v2/regions/${region}/versions/${model}/infos/${timestamp}`, {
			headers: {
				'User-Agent': `${name}/${version}`
			}
		})
		.then(res => {
			if (res.ok) {
				return res.json()
			} else {
				throw new Error(`${res.status} ${res.statusText}`);
			}
		})
		.then(json => {
			interaction.reply({embeds: [new MessageEmbed({
				title: `GetMyDeck`,
				url: `https://getmydeck.ingenhaag.dev/s/${region}/${model}/${timestamp}`,
				description: `${json.personalInfo.prettyText}`,
				fields: [
					{name:"Your Reservation",value:`${json.personalInfo.region} ${json.personalInfo.version}GB\n<t:${1627752329}>`,inline: true},
					{name:"Last Processed",value:`<t:${json.personalInfo.latestOrderSeconds}>`,inline: true},
					{name:"%",value:`${json.personalInfo.elapsedTimePercentage}%`,inline: true}
				],
				timestamp: `${json.officialInfo.lastDataUpdate}`,
				footer: {icon_url: "https://cdn.cloudflare.steamstatic.com/steamdeck/images/favicon-32x32.png"}
			})]})
		})
		.catch(err => {
			interaction.reply({content: "Error: ```js\n" + err + "```", ephemeral: true})
			console.error("[Command Error: /getmydeck]",err);
		});
	}
};
