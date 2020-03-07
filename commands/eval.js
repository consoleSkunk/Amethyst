var Discord = require("discord.js");
var util = require("util");

exports.module = {
	commands: ["eval","ev"],
	description: "Send a raw JavaScript command.",
	syntax: "[command]",
	tags: ["OWNER"],
	process: function(client, msg, params){
		if(params) {
			try {
				var response = eval(params);
				var respString = util.format(response).replace(/(M[a-zA-Z0-9]{23}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27}|mfa\.[a-zA-Z0-9_\-]{84})/g,"{TOKEN REMOVED}");

				if(typeof response !== "undefined" && typeof response !== "object") {
					msg.reply(respString,{code:true});
				} else if(typeof response == "object" && !respString.startsWith("Promise")) {
					if(respString.length <= 1991) {
						msg.reply(respString,{code:"js"});
					} else {
						if(msg.channel.permissionsFor(client.user).has("ATTACH_FILES")) {
							msg.reply('',{files:[{attachment:Buffer.from(respString),name:`${params}.txt`}]});
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
