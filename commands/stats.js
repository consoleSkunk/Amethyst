var Discord = require("discord.js"),
    os = require('os'),
	fs = require("fs"),
    lsb_release = require('bizzby-lsb-release')(),
	moment = require('moment'),
	git_commit;

if(fs.existsSync("./.git")) {
	git_HEAD = fs.readFileSync('.git/HEAD').toString().replace(/\n$/, ''),
	git_commit = (git_HEAD.indexOf(':') === -1 ? git_HEAD : fs.existsSync('.git/' + git_HEAD.substring(5)) ? fs.readFileSync('.git/' + git_HEAD.substring(5)).toString().replace(/\n$/, '') : undefined);
}

require('moment-precise-range-plugin');

exports.module = {
	commands: ["stats","uptime","botinfo"],
	description: "See some info about the bot, like uptime and some system information.",
	syntax: "[basic]",
	tags: [],
	permissions: [],
	process: function(client, msg, params){
		var uptime = moment.preciseDiff(moment(moment.unix(client.readyTimestamp/1000)),moment());
		if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS") || params.toLowerCase() == "basic") {
			msg.reply(
				`**Uptime**: ${uptime}\n\n` +
				`**Process ID:** ${process.pid}\n` +
				`**OS:** ${os.platform() == "linux" ? lsb_release.description : os.platform()} ${os.release().includes("Microsoft") ? " (on Windows 10)" : ""}\n` +
				(os.platform() == "linux" ? `**Release:** ${lsb_release.release} ${lsb_release.codename}\n` : "") +
				`**${os.platform() == "linux" ? "Kernel" : "Release"}:** ${os.release()}\n`
			);
		} else {
			client.fetchApplication().then(application => {
				msg.reply(undefined, {embed: {
					author: {
						name: `${application.name}`
					},
					thumbnail: {
						url: application.iconURL({format:'png',size:256})
					},
					fields: [
						{
							name: 'Discord:',
							value: `**Name**: ${application.name}\n` +
							`**Account Name**: \`${client.user.username+"#"+client.user.discriminator}\`\n` +
							`**Owner**: ${application.owner.ownerID ? `${application.owner.name} (${application.owner.members.size} member${application.owner.members.size !== 1 ? "s" : ""})` : "`"+application.owner.username+"#"+application.owner.discriminator+"`"}\n` +
							`**Created at:** ${moment(moment.unix(application.createdTimestamp/1000))}\n`,
							inline: true
						},
						{
							name: 'Bot:',
							value: `**Library:** ${Discord.Constants.Package._from}\n` +
							`**Library Version:** ${Discord.version}${
								Discord.Constants.Package._from.indexOf("github:") != -1 ?
								` (commit [\`${Discord.Constants.Package._resolved.split("#")[1].slice(0,7)}\`](https://github.com/discordjs/discord.js/commit/${Discord.Constants.Package._resolved.split("#")[1]}))` :
								""}\n` +
							`**Uptime:** ${uptime}\n` +
							(git_commit ? `**Git Commit:** \`${git_commit.slice(0,7)}\`\n` : ''),
							inline: true
						},
						{
							name: 'System:',
							value: `**OS:** ${os.platform() == "linux" ? lsb_release.description  : os.platform()} ${os.release().includes("Microsoft") ? " (on Windows 10)" : ""}\n` +
							(os.platform() == "linux" ? `**Release:** ${lsb_release.release} ${lsb_release.codename}\n` : "") +
							`**${os.platform() == "linux" ? "Kernel" : "Release"}:** ${os.release()}\n` +
							`**Arch:** ${os.arch()}\n` +
							`**Node.js Version:** ${process.version}\n` +
							`**Process ID:** ${process.pid}\n` +
							`**Load Averages:** (${os.cpus().length} logical CPUs)\n`+
								`\t1 min: ${os.loadavg()[0]}\n`+
								`\t5 min: ${os.loadavg()[1]}\n`+
								`\t15 min: ${os.loadavg()[2]}\n`,
							inline: false
						}
					]
				}});
			}).catch(err => {
				msg.reply("Failed to retrieve stats: ```js\n" + err + "```")
			})
		}
	}
};
