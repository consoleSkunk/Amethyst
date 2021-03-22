var Discord = require("discord.js"),
    prefix = require('../config/config.json').prefix;

exports.module = {
	commands: ["help","h","?"],
	description: "Shows the help message, or help for a specific command.",
	syntax: "[command]",
	tags: [],
	process: function(client, msg, argv, commands, isOwner) {
		var params = argv.slice(1).join(" ");
		var cmd = params.replace(prefix,"").trim().toLowerCase();
		var embed = new Discord.MessageEmbed({
			author: {
				name: "Help",
			},
		});
		var info = commands.find(x => x.commands.includes(cmd))
		if(cmd && typeof info == "object") {
			embed.setTitle(info.commands[0]);
			if(info.description !== null)
				embed.setDescription(info.description);
			if(info.syntax !== null)
				embed.addField("Syntax","```"+prefix + info.commands[0] + " " + info.syntax +"```",true);
			if(info.commands.length > 1) {
				var aliases = info.commands.filter(x => x !== info.commands[0]);
				embed.addField("Aliases","```" + prefix + aliases.join(", " + prefix) + "```",true);
			}
			if(info.tags.length > 0) {
				const permMap = new Map([
					["HIDDEN", "Hidden"],
					["NSFW", "NSFW Channel"],
					["MOD", "Moderator"],
					["ADMIN", "Administrator"],
					["OWNER", "Bot Owner"]
				]);
				let perms = new Array();
				info.tags.forEach((value) => {
					perms.push(permMap.get(value));
				});
				embed.addField("Restricted to",perms.join(", "),false);
			}
		} else {
			embed.setTitle("Commands available to you");
			let cmds = new Array();
			commands.forEach(function(elem) {
				if(
					(elem.tags.includes("HIDDEN")) ||
					(elem.tags.includes("NSFW") && !msg.channel.nsfw) ||
					(elem.tags.includes("ADMIN") && !msg.member.hasPermission("ADMINISTRATOR")) ||
					(elem.tags.includes("MOD") && (!msg.channel.permissionsFor(msg.author.id).has("MANAGE_MESSAGES") || !msg.channel.permissionsFor(client.user).has("MANAGE_MESSAGES"))) ||
					(elem.tags.includes("OWNER") && !isOwner)
				) {
					return;
				} else {
					cmds.push(prefix + elem.commands[0]);
				}
			});
			embed.setDescription(
			(cmd ? `Invalid command \`${cmd}\`.\n\n` : '') +	
			"```" + cmds.join(", ") + "```\n" +
			`Type \`${prefix + exports.module.commands[0] + " " + exports.module.syntax}\` for help on a specific command.`);
		}
		if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
			let fields = "";
			embed.fields.forEach((value) => {
				fields += `\n**${value.name}**\n${value.value}`;
			});
			msg.reply(`**${embed.title}**\n${embed.description}${fields}`)
		} else {
			msg.reply(undefined, {embed: embed})
		}
	}
};
