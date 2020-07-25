var Discord = require("discord.js");
var util = require("util");

exports.module = {
	commands: ["eval","ev"],
	description: "Send a raw JavaScript command.",
	syntax: "[command]",
	tags: ["OWNER"],
	process: function(client, msg, argv) {
		var params = argv.splice(1).join(" ");
		if(params) {
			try {
				var response = eval(params);
				var respString = util.inspect(response,{depth:0}).replace(/([a-zA-Z0-9]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}|mfa\.[a-zA-Z0-9_\-]{84})/g,"{TOKEN REMOVED}");

				if(typeof response !== "undefined" && respString !== ("Promise { <pending> }")) { // hide Promise responses
					if(respString.length <= 1991) { // taking into account the markdown required for the code block
						msg.reply(respString,{code:"js"});
					} else {
						if(msg.channel.permissionsFor(client.user).has("ATTACH_FILES")) {
							msg.reply('',{files:[{attachment:Buffer.from(respString),name:"message.txt"}]});
						} else {
							msg.reply(respString.substring(0,1976) + "…\n\n[truncated]",{code:"js"});
						}
					}
				}
			} catch (e) {
				msg.reply(e,{code:"js"});
			}
		}
	}
};
