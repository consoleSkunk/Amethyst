const fs = require("fs");
const util = require("util");

try {
	var config = require("./config/config.json");
} catch(e) {
	console.error("ERROR: The configuration file is missing. Please copy config.example.json and modify it accordingly.");
}

try {
	var Discord = require("discord.js"),
	clearModule = require('clear-module'),
	name = require('./package.json').name,
	    version = require('./package.json').version;
} catch(e) {
	console.error("ERROR: The required modules were not found. Please run 'npm install' first.");
	return;
}

let client = new Discord.Client({
	allowedMentions: {repliedUser: true},
	disabledEvents: ['TYPING_START'],
	intents: ['GUILDS', 'GUILD_EMOJIS', 'GUILD_MESSAGES']
});

if(!client.token) {
	console.error("ERROR: Token not set; please set it using the DISCORD_TOKEN environment variable.");
	client.destroy();
	return;
}

/* // /reload is a special command
let reload = {
	commands: ["reload"],
	description: "Reloads the bot's commands.",
	syntax: null,
	tags: ["OWNER"],
	process: function(client, msg) {
		var status = "";
		var date = Date.now();
		msg.reply("\u{1f501} Reloading commands...").then(m => {
			try {
				count = loadCommands();
				if(errors.length > 0) {
					status = msg.author.toString() + `, \u26a0 Successfully loaded ${count} commands in ${(Date.now() - date) / 1000} seconds, but ${errors.length} failed to load:`;
					for (let error of errors) {
						status += `\n**${error.file}**: \`${error.error}\``;
					}
				} else {
					status = msg.author.toString() + `, \u2705 Done! (loaded ${count} commands in ${(Date.now() - date) / 1000} seconds)`;
				}
			} catch(err) {
				status = msg.author.toString() + ", \u274c ERROR:\n```js\n" + err + "```";
			}
			m.edit(status);
		});
	}
} */

var loaded_commands = [];
var errors = [];

console.log(`Running ${name} ${version} on PID ${process.pid}`);

function loadCommands(log) {
	loaded_commands = [];
	errors = [];
	count = 0;
	let files = fs.readdirSync("./commands/");
	for(let file of files) {
		if(file.startsWith(".")) continue;
		if(!file.endsWith(".js")) continue;
		let filename = "./commands/" + file;
		try {
			clearModule(filename);
			let command = require.main.require(filename);
			if(typeof command.module.setup !== 'undefined') {
				// code to run when command is loaded
				if(log) console.log(`\x1b[1;34mRunning setup script for ${file}...\x1b[0m`);
				command.module.setup();
			}
			
			let commandData = {
				name: command.module.name,
				description: command.module.description,
				options: command.module.options,
			};

			if(command.module.syntax !== undefined || command.module.commands !== undefined)
				throw new Error("Command needs to be updated.");

			if(commandData.name == undefined || commandData.description == undefined)
				throw new Error("One or more required fields were not specified.");
			
			loaded_commands.push(command.module);

			// make sure the command hasn't already been registered and if not, register it
			if(client.application.commands.cache.find(cmd => cmd.name === commandData.name) == undefined) {
				client.application.commands.create(commandData).then(() => {
					console.log(`\x1b[1;34mCommand ${commandData.name} successfully registered.\x1b[0m`);
				}).catch(error => {
					console.error(`\x1b[1;31mFailed to register command ${file}`);
					console.error(error);
					console.error("\x1b[0m");
				});
			}
			
			if(log) console.log(`\x1b[1;34mSuccessfully loaded ${file}\x1b[0m`);
			count++;
		} catch(error) {
			errors.push({file: file, error: error});
			console.error(`\x1b[1;31mFailed to load ${file}`);
			console.error(error);
			console.error("\x1b[0m");
		}
	}

	return count;
}

client.once('ready', () => {
	console.log(`Logged in as ${client.user.username}#${client.user.discriminator}`);

	client.application.commands.fetch().then(() => loadCommands(true));

	if(client.application.partial) {
		client.application.fetch().catch(err => {
			console.error("[Application Fetch Error]",err);
		})
	}
});

client.on("interaction", interaction => {
		// If the interaction isn't a slash command, return
		if (!interaction.isCommand()) return;

		var cmd;

		// find the command the user wants
		for (let module of loaded_commands) {
			if (module.name == interaction.commandName) {
				cmd = module;
				break;
			}
		}
		if(cmd !== undefined) {
			try {
				cmd.process(interaction, client);
			} catch(err) {
				interaction.reply("\u274c ERROR:```js\n" + err + "```",{ephemeral: true});
				console.error(`\x1b[1;31mError running command ${cmd.name}:`);
				console.error(err);
				console.error("\x1b[0m");
			}
		} else {
			interaction.reply("\u274c This command has either failed to load or been removed.",{ephemeral: true});
		}
});

client.on("messageDelete", (msg) => {
	// write to the server's delete log if it exists
	var delete_channel = msg.guild.channels.cache.find(val => val.name.includes('delet'));
	if(!delete_channel) return;
	if(!delete_channel.permissionsFor(client.user).has("VIEW_CHANNEL") ||
	   !delete_channel.permissionsFor(client.user).has("SEND_MESSAGES"))
		return; // if we can't access the channel, we shouldn't try to write to it
	var attach = "";
	if(msg.channel == delete_channel || msg.author.bot) return;

	embed = new Discord.MessageEmbed();
	embed.setAuthor(msg.author.username + "#" + msg.author.discriminator, msg.author.displayAvatarURL({size:2048}).replace(".webp",".png"));
	embed.setDescription(msg.content);
	embed.setTitle("#" + msg.channel.name);
	embed.setTimestamp(msg.createdTimestamp);
	if(msg.embeds[0]) {
		var emb = msg.embeds[0];
		if(emb.type == "rich") {
			embed.addField(emb.description ? (emb.title ? emb.title : emb.author.name) : "Embed",emb.description ? (emb.description.length > 500 ? emb.description.substr(0,499) + "…" : emb.description) : (embed.title ? emb.title : emb.author),true);
			if(emb.url) { if(!emb.url.includes("://twitter.com/")) { embed.addField("URL",emb.url,true); }}
		}
	}
	if(msg.attachments.first()) {
		var attach = msg.attachments.first();
		if(attach.width !== null) {
			embed.attachFiles({attachment: attach.proxyURL,name: attach.name});
			embed.setImage("attachment://" + attach.name);
		} else {
			// likely not going to upload properly as it has already been deleted
			embed.addField("Atachment filename",attach.name,true);
		}
	}
	delete_channel.send(undefined, {embed: embed})
});

client.on("error", (err) => {
	console.error("[Error Event]",err);
});

process.on('uncaughtException', (err) => {
	console.error("[Uncaught Exception]",err);
});

process.on('uncaughtException', (err) => {
	console.error("[Uncaught Exception]",err.stack);
});

process.on('unhandledRejection', (reason, p) => {
	console.error("[Unhandled Rejection]",reason);
});

process.on("SIGINT", () => {
	exit(0);
});

function exit(code) {
	client.destroy();
	
	if(code !== undefined) {
		process.exitCode = code;
	}
}

client.login().catch(err => {
	console.error("[Login Failed]",err);
	process.abort();
});
