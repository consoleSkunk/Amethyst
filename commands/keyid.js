exports.module = {
	commands: ["keyid","blid","bl_id"],
	description: "Converts the Blockland key ID to BL_ID or vice versa.",
	syntax: "[Key ID or BL_ID]",
	tags: [],
	process: function(client, msg, argv) {
		var params = argv.slice(1).join(" ");
		var charlist = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

		function getChars(num, res) {
		  var mod = num % 32,
			  remaining = Math.floor(num / 32),
			  chars = charlist.charAt(mod) + res;

		  if (remaining <= 0) { return chars; }
		  return getChars(remaining, chars);
		};
		if(params.match(/^[0-9]+$/) && params <= 33554431) {
			msg.reply(getChars(params, '').padStart(5,'A'));
		}
		else if (params.toUpperCase().match(/^[a-hj-mp-z2-9]{5}$/i)) {
			msg.reply(params.toUpperCase().split('').reverse().reduce(function(prev, cur, i) {
				return prev + charlist.indexOf(cur) * Math.pow(32, i);
			}, 0));
		}
	}
};
