var fetch = require("node-fetch"),
    { name, version } = require('../package.json');

exports.module = {
	name: "tiktok",
	description: "Generates the TikTok TTS voice.",
	options: [
		{
			name: 'message',
			type: 'STRING',
			description: "Your message",
			required: true
		},
		{
			name: 'voice',
			type: 'STRING',
			description: "The voice to use",
			required: true,
			choices: [
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
				{name: "Ghostface (Scream)", value: "en_us_ghostface"},
				{name: "Chewbacca (Star Wars)", value: "en_us_chewbacca"},
				{name: "C3PO (Star Wars)", value: "en_us_c3po"},
				{name: "Stitch (Lilo & Stitch)", value: "en_us_stitch"},
				{name: "Stormtrooper (Star Wars)", value: "en_us_stormtrooper"},
				{name: "Rocket (Guardians of the Galaxy)", value: "en_us_rocket"}
			]
		}
	],
	process: function(interaction) {
		// Based on https://github.com/weilbyte/tiktok-tts
		const ENDPOINT = 'https://api16-normal-useast5.us.tiktokv.com/media/api/text/speech/invoke/'

		let text = interaction.options.getString('message');
		let voice = interaction.options.getString('voice');
		
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
			console.error("[TikTok Error]",err);
		});
	}
};
