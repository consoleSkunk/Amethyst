const { ApplicationCommandOptionType } = require('discord.js'),
      fetch = require("node-fetch"),
      { name, version } = require('../package.json');

exports.module = {
	command: {
		name: "tiktok",
		description: "Generates the TikTok TTS voice.",
		options: [
			{
				name: 'message',
				type: ApplicationCommandOptionType.String,
				description: "Your message",
				required: true
			},
			{
				name: 'voice',
				type: ApplicationCommandOptionType.String,
				description: "The voice to use",
				required: true,
				autocomplete: true
			}
		],
	},
	config: {
		voices: [
			{name: "English US - Female", value: "en_us_001"},
			{name: "English US - Male 1", value: "en_us_006"},
			{name: "English US - Male 2", value: "en_us_007"},
			{name: "English US - Male 3", value: "en_us_009"},
			{name: "English US - Male 4", value: "en_us_010"},
			
			{name: "English UK - Male 1", value: "en_uk_001"},
			{name: "English UK - Male 2", value: "en_uk_003"},
			
			{name: "English AU - Female", value: "en_au_001"},
			{name: "English AU - Male", value: "en_au_002"},
			
			{name: "French - Male 1", value: "fr_001"},
			{name: "French - Male 2", value: "fr_002"},
			
			{name: "German - Female", value: "de_001"},
			{name: "German - Male", value: "de_002"},
			
			{name: "Spanish - Male", value: "es_002"},
			
			{name: "Spanish MX - Male", value: "es_mx_002"},
			{name: "Portuguese BR - Female 1", value: "br_001"},
			{name: "Portuguese BR - Female 2", value: "br_003"},
			{name: "Portuguese BR - Female 3", value: "br_004"},
			{name: "Portuguese BR - Male", value: "br_005"},
			
			{name: "Indonesian - Female", value: "id_001"},
			
			{name: "Japanese - Female 1", value: "jp_001"},
			{name: "Japanese - Female 2", value: "jp_003"},
			{name: "Japanese - Female 3", value: "jp_005"},
			{name: "Japanese - Male", value: "jp_006"},
			
			{name: "Korean - Male 1", value: "kr_002"},
			{name: "Korean - Male 2", value: "kr_004"},
			{name: "Korean - Female", value: "kr_003"},
			
			{name: "Ghostface (Scream)", value: "en_us_ghostface"},
			{name: "Chewbacca (Star Wars)", value: "en_us_chewbacca"},
			{name: "C3PO (Star Wars)", value: "en_us_c3po"},
			{name: "Stitch (Lilo & Stitch)", value: "en_us_stitch"},
			{name: "Stormtrooper (Star Wars)", value: "en_us_stormtrooper"},
			{name: "Rocket (Guardians of the Galaxy)", value: "en_us_rocket"},
			
			{name: "Alto", value: "en_female_f08_salut_damour"},
			{name: "Tenor", value: "en_male_m03_lobby"},
			{name: "Sunshine Soon", value: "en_male_m03_sunshine_soon"},
			{name: "Warmy Breeze", value: "en_female_f08_warmy_breeze"},
		]
	},
	autocomplete: function(interaction) {
		const choices = exports.module.config.voices,
		      focusedOption = interaction.options.getFocused(true);

		if(focusedOption.name === 'voice') {
			const filtered = choices.filter(choice =>
				choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
				choice.value.toLowerCase().includes(focusedOption.value.toLowerCase())
			).slice(0,25);

			interaction.respond(filtered);
		}
	},
	process: function(interaction) {
		// Based on https://github.com/weilbyte/tiktok-tts
		const ENDPOINT = 'https://api16-normal-useast5.us.tiktokv.com/media/api/text/speech/invoke/'

		let text = interaction.options.getString('message');
		let voice = interaction.options.getString('voice');
		
		if(!exports.module.config.voices.some(i => i.value === voice))
			return interaction.reply({content: `Unknown voice \`${voice}\``, ephemeral: true});
		
		fetch(`${ENDPOINT}?text_speaker=${voice}&req_text=${encodeURIComponent(text)}`, {
			method: 'POST',
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
			if (json.status_code != 0) {
				interaction.reply({content: json.message, ephemeral: true})
			} else {
				let buffer = Buffer.from(json.data.v_str, "base64");
				interaction.reply({
					files: [{
						attachment: buffer,
						name: `${text.substr(0,166)}.mp3`
					}]
				});
			}
		})
		.catch(err => {
			interaction.reply({content: "Failed to generate text: ```js\n" + err + "```", ephemeral: true})
			console.error("[Command Error: /tiktok]",err);
		});
	}
};
