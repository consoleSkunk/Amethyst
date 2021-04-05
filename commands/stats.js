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
	name: "stats",
	aliases: ["uptime","botinfo"],
	description: "See some info about the bot, like uptime and some system information.",
	options: [
		{
			name: 'basic',
			type: 'SUB_COMMAND',
			description: "Basic stats",
		},
		{
			name: 'full',
			type: 'SUB_COMMAND',
			description: "Full stats",
		}
	],
	process: function(interaction, client) {
		var uptime = moment.preciseDiff(moment(moment.unix(client.readyTimestamp/1000)),moment());
		var os_info =
				`**OS:** ${os.platform() == "linux" ? (lsb_release ? lsb_release.description : "Linux") : os.platform()} ${os.release().includes("Microsoft") ? " (on Windows 10)" : ""}\n` +
				(os.platform() == "linux" && lsb_release ? `**Release:** ${lsb_release.release} ${lsb_release.codename ? lsb_release.codename : ""}\n` : "") +
				`**${os.platform() == "linux" ? "Kernel" : "Release"}:** ${os.release()}\n`;

		if(interaction.options.find(obj => obj.name == 'basic')) {
			interaction.reply(
				`**Uptime**: ${uptime}\n\n` +
				`**Process ID:** ${process.pid}\n` +
				os_info
			);
		}
		else if(interaction.options.find(obj => obj.name == 'full')) {
			var embed = new Discord.MessageEmbed({
				fields: [
					{
						name: 'Discord:',
						value: (!client.application.partial ? `**Name**: ${client.application.name}\n` +
						`**Owner**: ${client.application.owner.ownerID ? `${client.application.owner.name} (${client.application.owner.members.size} member${client.application.owner.members.size !== 1 ? "s" : ""})` : "`"+client.application.owner.username+"#"+client.application.owner.discriminator+"`"}\n`: "") +
						`**Account Name**: \`${client.user.username+"#"+client.user.discriminator}\`\n` +
						`**Created at:** ${moment(moment.unix(client.application.createdTimestamp/1000))}\n`,
						inline: true
					},
					{
						name: 'Bot:',
						value: `**Library:** ${Discord.Constants.Package.name}\n` +
						`**Library Version:** ${Discord.version}\n` +
						`**Uptime:** ${uptime}\n` +
						(git_commit ? `**Git Commit:** \`${git_commit.slice(0,7)}\`\n` : ''),
						inline: true
					},
					{
						name: 'System:',
						value: os_info +
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
			});

			if(!client.application.partial) {
				embed.setAuthor(`${client.application.name}`);
				embed.setThumbnail(client.application.iconURL({format:'png',size:256}));
			}
			interaction.reply(undefined, {embed: embed});
		}
	}
};
