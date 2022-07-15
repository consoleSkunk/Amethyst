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
	],
	process: function(interaction) {
		// Based on https://github.com/weilbyte/tiktok-tts
		const ENDPOINT = 'https://api16-normal-useast5.us.tiktokv.com/media/api/text/speech/invoke/'
		const voice = 'en_us_001';

		let text = interaction.options.getString('message');
		
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
				interaction.reply(`Server returned error (message: "${json.message}").`)
			} else {
				let buffer = Buffer.from(json.data.v_str, "base64");
				interaction.reply({
					files: [{
						attachment: buffer,
						name: `${text}.mp3`
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
