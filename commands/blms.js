var fetch = require("node-fetch"),
    { name, version } = require('../package.json');

exports.module = {
	commands: ["blms"],
	description: "Returns the master server for Blockland.",
	syntax: null,
	tags: [],
	process: function(client, msg, params) {
		msg.channel.startTyping();
		fetch("http://master3.blockland.us/", { headers: { 'User-Agent': "" } })
			.then(res => {
				if (res.ok) {
					return res.textConverted()
				} else {
					throw new Error(`${res.status} ${res.statusText}`);
				}
			})
			.then(body => {
				var servers = body.split(/\r?\n/);
				var total_players = 0;
				var total_servers = 0;

				var table;
				var fields = [];

				var buffer = "Pass Dedi     Players Server Name\n";
				for(i in servers) {
					var row = servers[i].split("\t");
					if(row[0] == "START") {
						continue;
					}
					if(row[0] == "END") {
						break;
					}
					
					if(row[0] == "FIELDS") {
						fields = row;
						fields.splice(0,1);
						continue;
					}
					
					address = row[fields.indexOf("IP")] + ":" + row[fields.indexOf("PORT")];
					var pass = row[fields.indexOf("PASSWORDED")];
					var dedi = row[fields.indexOf("DEDICATED")];
					var host = row[fields.indexOf("ADMINNAME")];
					var name = row[fields.indexOf("SERVERNAME")];
					var players = row[fields.indexOf("PLAYERS")];
					var max_players = row[fields.indexOf("MAXPLAYERS")];
					var mapname = row[fields.indexOf("MAPNAME")];
					var gamemode = row[fields.indexOf("GAMEMODE")];
					var bricks = row[fields.indexOf("BRICKCOUNT")];
					var blid = row[fields.indexOf("BLID")];
					var steamid = row[fields.indexOf("STEAMID")];
					
					total_players += parseInt(players);
					total_servers++;

					buffer += `${
						pass == 1 ? "Yes " : "No  "
					} ${
						dedi == 1 ? "Yes " : "No  "
					} ${
						players.padStart(4, ' ')
					} / ${
						max_players.padStart(4, ' ')
					} ${
						host + (host[host.length - 1] == "s" ? "' " : "'s ") + name
					}\n`;
				}
				msg.reply(`\n${total_players} players, ${total_servers} servers\n` + buffer,{code:true,split:true});
			}).catch(err => {
				msg.reply("Failed to fetch master server: ```js\n" + err + "```")
				console.error("[Error]",err);
			}).finally(() => msg.channel.stopTyping());
	}
};
