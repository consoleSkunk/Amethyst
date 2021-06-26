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

			if(command.module.syntax !== undefined || command.module.commands !== undefined)
				throw new Error("Command needs to be updated.");

			if(command.module.name == undefined || command.module.description == undefined)
				throw new Error("One or more required fields were not specified.");
			
			loaded_commands.push(command.module);

			// make sure the command hasn't already been registered and if not, register it
			if(client.application.commands.cache.find(cmd => cmd.name === command.module.name) == undefined) {
				client.application.commands.create(command.module).then(() => {
					console.log(`\x1b[1;34mCommand ${command.module.name} successfully registered.\x1b[0m`);
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
				interaction.reply({content: "\u274c ERROR:```js\n" + err + "```", ephemeral: true});
				console.error(`\x1b[1;31mError running command ${cmd.name}:`);
				console.error(err);
				console.error("\x1b[0m");
			}
		} else {
			interaction.reply({content: "\u274c This command has either failed to load or been removed.", ephemeral: true});
		}
});

client.on("messageDelete", (msg) => {
	try {
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
			embed.addField(emb.description ? (emb.title ? emb.title : emb.author.name) : "Embed",emb.description ? (emb.description.length > 500 ? emb.description.substr(0,499) + "…" : emb.description) : (embed.title ? emb.title : emb.author),true);
		}

		var attachment;
		if(msg.attachments.first()) {
			var attach = msg.attachments.first();
			if(attach.width !== null) {
				attachment = new Discord.MessageAttachment(attach.proxyURL);
				embed.setImage("attachment://" + attach.name);
			} else {
				// likely not going to upload properly as it has already been deleted
				embed.addField("Atachment filename",attach.name,true);
			}
		}

		var messageData = {embeds: [embed], files: []}
		if(attachment !== undefined) { messageData.files.push(attachment); }

		delete_channel.send(messageData);
	} catch(e) {
		console.error("[Error: messageDelete]", e);
	}
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
