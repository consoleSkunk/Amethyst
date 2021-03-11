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
	allowedMentions: {parse:['users']},
	disabledEvents: ['TYPING_START'],
	presence: {
		activity: {
			type: "LISTENING",
			name: `${config.prefix}help`
		}
	}
});

if(!client.token) {
	console.error("ERROR: Token not set; please set it using the DISCORD_TOKEN environment variable.");
	client.destroy();
	return;
}

// /reload is a special command
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
}

var loaded_commands = [reload];
var errors = [];

console.log(`Running ${name} ${version} on PID ${process.pid}`);
loadCommands(true);

function loadCommands(log) {
	loaded_commands = [reload];
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
			loaded_commands.push(command.module);
			if(log) console.log(`\x1b[1;34mSuccessfully loaded ${file}\x1b[0m`);
			count++;
		} catch(error) {
			errors.push({file: file, error: error});
			console.error(`\x1b[1;31mFailed to load ${file}`);
			console.error(error);
			console.error("\x1b[0m");
		}
	}

	// sort the list so /help appears alphabetically, regardless of load order
	loaded_commands.sort(function (a, b) {
		var a = a.commands[0], b = b.commands[0];
		return (a < b ? -1 : a > b ? 1 : 0);
	});
	return count;
}

let application;
client.on('ready', () => {
	console.log(`Logged in as ${client.user.username}#${client.user.discriminator}`)

	client.fetchApplication().then(app => {
		application = app;
	}).catch(err => {
		console.error("[App Error]",err);
		
		// log out since we can't do things properly
		exit(-1);
	})
});

client.on("message", function (msg) {
	var isOwner = (
		application.owner.members // check if bot is part of a team application
		? application.owner.members.find(user => user.id === msg.author.id) !== undefined // check for team membership
		: application.owner.id === msg.author.id
	);

	if (msg.channel.type !== "text") {
		return;
	}

	if (msg.author.id != client.user.id && 
		msg.content.substr(0,config.prefix.length) === config.prefix && 
	(
		config.whitelist.channels.indexOf(msg.channel.id) != -1
		|| config.whitelist.guilds.indexOf(msg.guild.id) != -1
		|| config.whitelist.categories.indexOf(msg.channel.parentID) != -1
		|| config.whitelist.chan_names.some(function(v) { return msg.channel.name.indexOf(v) != -1; })
	)) {

		if(msg.author.id == client.user.id) {
			return;
		}

		var argv = msg.content.substring(config.prefix.length,msg.content.length).trim().split(" "),
		    argc = argv[0].toLowerCase();

		var cmd = {commands:[],description:"",syntax:"",tags:[],process:function(){}}

		for (let module of loaded_commands) {
			if (module.commands.includes(argc)) {
				var cmd = module;
				break;
			}
		}
		if(cmd !== undefined) {
			try {
				if(
					(cmd.tags.includes("OWNER") && !isOwner) || 
					(cmd.tags.includes("MOD") && (
						!msg.channel.permissionsFor(client.user).has("MANAGE_MESSAGES") ||
						!msg.channel.permissionsFor(msg.author).has("MANAGE_MESSAGES"))
					)
				) {
					if(isOwner)
						msg.reply("Sorry, you cannot use this command.")
				} else {
					if(cmd.commands[0] == "help") { // needs access to the loaded commands
						cmd.process(client, msg, argv, loaded_commands, isOwner);
					} else {
						cmd.process(client, msg, argv);
					}
				}
			} catch(err) {
				msg.reply("\u274c ERROR:```js\n" + err + "```");
				console.error(`\x1b[1;31mError running command ${argc}:`);
				console.error(err);
				console.error("\x1b[0m");
				msg.channel.stopTyping();
			}
		}
	}
});

client.on("messageDelete", (msg) => {
	if(msg.content.substr(0,config.prefix.length) === config.prefix) { // look for commands
		msg.channel.messages.fetch({limit: 1, after: msg.id}).then(messages => {
			if(messages.array().length == 0) return;
			var botmsg = messages.array()[0];
			if(msg.content.substr(0,config.prefix.length) === config.prefix && (botmsg.author.id == client.user.id)
				&& (botmsg.mentions.users.has(msg.author.id))) {
				botmsg.delete();
			}
		}).catch(error => console.log(error));
	}
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
