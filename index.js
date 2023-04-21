const fs = require("fs");
const util = require("util");

try {
	var config = require("./config/config.json");
} catch(e) {
	if(e instanceof SyntaxError)
		console.error("ERROR: The configuration file has a syntax error.\n" + e.message);
	else
		console.error("ERROR: The configuration file is missing. Please copy config.example.json and modify it accordingly.");
	return;
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
	intents: new Discord.IntentsBitField(['Guilds', 'GuildEmojisAndStickers'])
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
			let metadata = command.module.command;

			if(typeof command.module.setup !== 'undefined') {
				// code to run when command is loaded
				if(log) console.log(`\x1b[1;34mRunning setup script for ${file}...\x1b[0m`);
				command.module.setup();
			}

			if(metadata.name == undefined || metadata.description == undefined)
				throw new Error("One or more required fields were not specified.");
			
			loaded_commands.push(command.module);

			// if command exists but its metadata doesn't match, update it
			if(
				client.application.commands.cache.find(cmd => cmd.name === metadata.name) !== undefined || 
				client.application.commands.cache.find(cmd => cmd.description === metadata.description) !== undefined
			) {
				var appcmd = client.application.commands.cache.find(cmd => cmd.name === metadata.name || cmd.description === metadata.description);
				if(!appcmd.equals(metadata)) {
					client.application.commands.edit(appcmd, metadata).then(() => {
						console.log(`\x1b[1;34mCommand ${metadata.name} successfully updated.\x1b[0m`);
					}).catch(error => {
						console.error(`\x1b[1;31mFailed to update command ${file}`);
						console.error(error);
						console.error("\x1b[0m");
					});
				}
			}
			// otherwise register command if it doesn't exist yet
			else if(client.application.commands.cache.find(cmd => cmd.name === metadata.name) == undefined) {
				client.application.commands.create(metadata).then(() => {
					console.log(`\x1b[1;34mCommand ${metadata.name} successfully registered.\x1b[0m`);
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

client.on("interactionCreate", interaction => {
		const InteractionType = Discord.InteractionType;
		// ignore unknown interaction types
		if (![
			InteractionType.ApplicationCommand,
			InteractionType.ApplicationCommandAutocomplete
		].includes(interaction.type)) return;

		var cmd;

		// find the command the user wants
		for (let module of loaded_commands) {
			if (module.command.name == interaction.commandName) {
				cmd = module;
				break;
			}
		}
		if(cmd !== undefined) {
			try {
				if(interaction.type === InteractionType.ApplicationCommand)
					cmd.process(interaction, client);
				else if(interaction.type === InteractionType.ApplicationCommandAutocomplete)
					cmd.autocomplete(interaction, client);
			} catch(err) {
				if(interaction.type === InteractionType.ApplicationCommand)
					interaction.reply({content: "\u274c ERROR:```js\n" + err + "```", ephemeral: true});
				console.error(`\x1b[1;31mError running command ${interaction.commandName}:`);
				console.error(err);
				console.error("\x1b[0m");
			}
		} else {
			if(interaction.type === InteractionType.ApplicationCommand)
				interaction.reply({content: "\u274c This command has either failed to load or been removed.", ephemeral: true});
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
