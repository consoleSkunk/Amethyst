var qs = require("querystring"),
    Discord = require("discord.js"),
    fetch = require("node-fetch"),
    prettysize = require('prettysize'),
	{ name, version } = require('../package.json'),
    { user_agents, whitelist } = require("../config/config.json"),
    filter = require("../config/filter.json"),
    { danbooru } = require("../config/boorus.json");

exports.module = {
	commands: [],
	description: "Returns a random image from Danbooru or Safebooru, depending on the channel.\n[Cheatsheet available here](https://safebooru.donmai.us/wiki_pages/43049).",
	syntax: "tag_1 tag_2",
	tags: [],
	setup: function() {
		// add domains specified in boorus.json to alias list
		for (i in danbooru) {
			exports.module.commands = exports.module.commands.concat(danbooru[i].commands);
		}
	},
	process: function(client, msg, argv) {		
		var config = danbooru.filter(site => {
			return site.commands.includes(argv[0].toLowerCase())
		})[0];
		
		var params = argv.splice(1).join(" ");
		if(config == undefined)
			return;

		if(config.nsfw && !msg.channel.nsfw) {
			msg.reply("This site is NSFW and cannot be used in this this channel.");
			return;
		}

		var isFiltered = function(post){
			var all_tags = post.tag_string.split(" ");

			return (sfwMode && filter.nsfw.some(r=> all_tags.includes(r))) ||
			(post.rating !== "s" && filter.sfw_only.some(r=> all_tags.includes(r))) ||
			(whitelist.fetish.indexOf(msg.channel.id) == -1 && filter.fetish.some(r=> all_tags.includes(r))) ||
			(filter.blocked.some(r=> all_tags.includes(r))) ||
			(filter.guilds[msg.guild.id] && filter.guilds[msg.guild.id].some(r=> all_tags.includes(r))) ||
			post.is_banned || post.id == undefined
		};

		if(params.includes(", ")) {
			params = 
				params
				.split(",")
				.map(s => s.trim().replace(/ /g,"_"))
				.join(" ");
		}
		var paramsLC = params.toLowerCase();
		var paramArray = paramsLC.replace(/\~/g,"").split(" ");
		var sfwMode = !msg.channel.nsfw;
		var urlRegex = /^https?:\/\/(?:[-0-9A-Za-z]+\.)+[-0-9A-Za-z]+\/.*/;
		if(
			((sfwMode || paramArray.includes("rating:safe") || paramArray.includes("rating:s")) && filter.nsfw.some(r=> paramArray.includes(r))) ||
			((!sfwMode && !paramArray.includes("rating:safe") && !paramArray.includes("rating:s")) && filter.sfw_only.some(r=> paramArray.includes(r))) ||
			(whitelist.fetish.indexOf(msg.channel.id) == -1 && filter.fetish.some(r=> paramArray.includes(r))) ||
			(filter.blocked.some(r=> paramArray.includes(r))) ||
			(filter.guilds[msg.guild.id] && filter.guilds[msg.guild.id].some(r=> paramArray.includes(r)))
		){
			msg.reply("Your search contains tags that are blocked in this channel.");
			return;
		}
		else {
			var searchURL;
			var singleImage;
			var md5Reg = /^(?:md5:)?([0-9a-f]{32})$/i;
			var idReg = /^(?:id:|#)(\d+)$/i;
			if(md5Reg.test(params)) { // md5
				searchURL = `https://${config.domain}/posts.json?md5=${qs.escape(md5Reg.exec(params)[1])}`;
				singleImage = true;
			} else if(idReg.test(params)) { // post ID
				searchURL = `https://${config.domain}/posts/${qs.escape(idReg.exec(params)[1])}.json`;
				singleImage = true;
			} else if(params.indexOf("order:") != -1) { // ordered search
				searchURL = `https://${config.domain}/posts.json?limit=25&tags=${qs.escape(params)}`;
				singleImage = false;
			} else { // random search
				searchURL = `https://${config.domain}/posts.json?limit=75&tags=${qs.escape(params)}`;
				singleImage = false;
			};
			//console.log(searchURL);
			msg.channel.startTyping();
			fetch(searchURL, {
				url: searchURL,
				headers: {
					'User-Agent': `${name}/${version} ${user_agents.danbooru}`
				}
			})
			.then(res => res.json())
			.then(json => {
				if(json.success !== undefined && json.success == false) {
					if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply(json.message || json.reason);
					} else {
						msg.reply(undefined,{embed: {
							title: `Error`,
							description: json.message || json.reason,
							color: 15597568,
							footer: {
								icon_url: config.icon,
								text: config.name
							}
						}});
					}
				}
				else {
					if(typeof (json) !== "undefined") {
						var trueCount = json.length;
						json = singleImage ? json : json.filter(function(element){ return !isFiltered(element) })
						console.log(json);
					}
					if (typeof (json) !== "undefined" && Object.keys(json).length > 0) {
					var post = 
						singleImage ? json : json[Math.floor(Math.random() * json.length)]

						// Filtered image
						let filteredTags = [];
						if(isFiltered(post)) {
							var all_tags = post.tag_string.split(" ");
							if(sfwMode && filter.nsfw.some(r=> all_tags.includes(r))) {
								filter.nsfw.map((first) => {
									filteredTags[all_tags.findIndex(def => def === first)] = first;
								});
							}
	
							if(post.rating !== "s" && filter.sfw_only.some(r=> all_tags.includes(r))) {
								filter.sfw_only.map((first) => {
									filteredTags[all_tags.findIndex(def => def === first)] = first;
								});
							}
	
							if(whitelist.fetish.indexOf(msg.channel.id) == -1 && filter.fetish.some(r=> all_tags.includes(r))) {
								filter.fetish.map((first) => {
									filteredTags[all_tags.findIndex(def => def === first)] = first;
								});
							}
	
							if(filter.blocked.some(r=> all_tags.includes(r))) {
								filter.blocked.map((first) => {
									filteredTags[all_tags.findIndex(def => def === first)] = first;
								});
							}
	
							if(filter.guilds[msg.guild.id] && filter.guilds[msg.guild.id].some(r=> all_tags.includes(r))) {
								filter.guilds[msg.guild.id].map((first) => {
									filteredTags[all_tags.findIndex(def => def === first)] = first;
								});
							}
							filteredTags = filteredTags.filter(v => v);
						}

						var rating = (
							post.rating == "s" ? "Safe" : 
							post.rating == "e" ? "Explicit" : 
							post.rating == "q" ? "Questionable" :
							"Unknown");
						if(sfwMode && post.rating !== "s") {
							msg.reply(`Sorry, the post you requested is not appropriate for this channel. (${rating})`);
						}
						else if(post.id == undefined) {
							msg.reply("The API did not appear to return an ID for the fetched post. Sorry.");
						}
						else if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
							if(isFiltered(post)) {
								msg.reply(
									`Image #${post.id} (${rating}${post.is_deleted ? ", Deleted" : ""}) has th${filteredTags.length > 1 ? 'ese' : 'is'} blocked tag${filteredTags.length > 1 ? 's' : ''}:` +
									`${filteredTags.length > 3 ? '\n' : ' '}${filteredTags.join(", ").replace(/_/g, " ")}`
								);
							} else {
								msg.reply(`https://${config.domain}/posts/${post.id} (${rating}${post.is_deleted ? ", Deleted" : ""})`);
							}
						} else {
							//var description = DText.parse(post.description).replace(/\]\(https\:\/\/DTextDomain\//g,`](https://${config.domain}/`);
							var artist = (post.tag_string_artist.length ? post.tag_string_artist.replace(/_\(artist\)/g,"").split(" ").join(", ").replace(/_/g, " ") : "");
							var postEmbed = new Discord.MessageEmbed({
								author: {
									name: (
										post.tag_string_artist.length ? (
											artist.length > 64 ?
											artist.substr(0,63) + "…" :
											artist
										) : (
											post.pixiv_id !== null ? "Pixiv #" + post.pixiv_id
											: urlRegex.test(post.source) ? (
												post.source.length > 64 ? 
												post.source.substr(0,63) + "…" :
												post.source
											)
											: null
										)
									),
									// Override post source if Pixiv ID is available
									url: post.pixiv_id !== null ? "https://www.pixiv.net/en/artworks/" + post.pixiv_id :
									(urlRegex.test(post.source) ? post.source : null),
								},
								title:
								`${config.name} - #${post.id} (${rating}${post.is_deleted ? ", Deleted" : ""})`,
								url: `https://${config.domain}/posts/${post.id}?q=${qs.escape(params)}`,
								color: config.color,
								footer: {
									text: `${prettysize(post.file_size)} | ${(post.score > 0 ? "\u2b06" : (post.score < 0 ? "\u2b07" : "\u2195")) + "\ufe0f " + Math.abs(post.score)} \u2665\ufe0f ${post.fav_count}`,
									icon_url: 'https://i.imgur.com/SSQuBPx.png'
								},
								timestamp: post.created_at
							});
							// add image after the fact because some posts don't have one
							if(post.hasOwnProperty('file_url')) {
								postEmbed.setImage(
								post.file_ext == "swf" ? "https://static1.e926.net/images/download-preview.png" : 
								post.file_ext == "webm" || post.file_ext == "mp4" || post.file_ext == "zip" || post.file_size > "52428800" ? 
								(
									urlRegex.test(post.preview_file_url) ? post.preview_file_url :
									post.preview_file_url) :
								urlRegex.test(post.file_url) ? post.file_url :
								post.file_url
								);
							}

							// Filtered image
							if(isFiltered(post) && filteredTags.length > 0){
								// prevent blocked posts from being linked to
								// this is only done if you access a post directly
	
								postEmbed.setThumbnail("https://static1.e926.net/images/blacklisted-preview.png");
								if(postEmbed.image) {
									delete postEmbed.image;
								}
								if(postEmbed.url) {
									delete postEmbed.url;
								}
								if(postEmbed.author.url) {
									delete postEmbed.author.url;
								}

								postEmbed.addField(
									`Blocked tag${filteredTags.length > 1 ? 's' : ''}`,
									filteredTags.join(", ").replace(/_/g, " "),
									false
								);
							}

							if(post.file_ext == "swf" || post.file_ext == "webm" || post.file_ext == "mp4" || post.file_ext == "zip") {
								postEmbed.addField(
									"\u200B",
									`**[\u25B6\uFE0F Play/Download this ${post.file_ext == "swf" ? "Flash" : post.file_ext == "zip" ? "ugoira" : "video"}](${post.file_ext == "zip" ? post.large_file_url : post.file_url})**`,
									false); 
							}

							// Deleted or SWF/WebM
							if(post.status == "deleted" || post.file_ext == "swf" || post.file_ext == "webm" || post.file_ext == "mp4" || post.file_ext == "zip") {
								postEmbed.setThumbnail(
									post.status == "deleted" ? "https://static1.e926.net/images/deleted-preview.png" :
									post.file_ext == "swf" ? "https://static1.e926.net/images/download-preview.png" :
									post.file_ext == "webm" || post.file_ext == "mp4" || post.file_ext == "zip" ? "https://static1.e926.net/images/webm-preview.png" :
									postEmbed.thumbnail
								);

								if(postEmbed.image && post.file_ext !== "webm" && post.file_ext !== "mp4" && post.file_ext !== "zip") {
									delete postEmbed.image;
								}
							}

							// Characters and copyright
							if(post.tag_string_character.length !== 0) {
								var chars = post.tag_string_character.split(" ").join(", ")
									.replace(/_\([^),]+\)/g,"") // remove parentheses from character tags
									.replace(/_/g, " "); // replace all underscores with spaces
								postEmbed.addField(
									`Character${post.tag_string_character.split(" ").length > 1 ? `s (${post.tag_string_character.split(" ").length})` : ''}`,
									(chars.length > 280 ? chars.substr(0,279) + "…" : chars),
									true
								);
							}
							if(post.tag_string_copyright.length !== 0) {
								var copy = post.tag_string_copyright.split(" ").join(", ")
									.replace(/_\(series\)/g,"")
									.replace(/_/g, " ");
								postEmbed.addField(
									`Copyright${post.tag_string_copyright.split(" ").length > 1 ? `s (${post.tag_string_copyright.split(" ").length})` : ''}`,
									(copy.length > 280 ? copy.substr(0,279) + "…" : copy),
									true
								);
							}
							
							if(post.parent_id != null) {
								postEmbed.addField(
									`Parent`,
									(isFiltered(post) ? `#${post.parent_id}` : `[#${post.parent_id}](https://${config.domain}/posts/${post.parent_id})`),
									true
								);
							}
							// post children have been hidden from the Danbooru API by default
							/* if(post.has_visible_children) {
								var children = post.children_ids.split(",");
								for ( var i in children.length ) {
									children[i] = (isFiltered(post) ? `#${children[i]}` : `[#${children[i]}](https://${config.domain}/posts/${children[i]})`);
								}
								postEmbed.addField(
									`Child${children.length > 1 ? 'ren' : ''}`,
									children.join(", "),
									true
								);
							} */
							msg.reply(undefined, {embed: postEmbed});
						}

					}
					else {
						var response = singleImage ? "The post you requested does not exist." : trueCount > 0 ? "Your search returned only filtered images." : "No posts matched your search.";
						if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
							msg.reply(response);
						} else {
							msg.reply(undefined,{embed: {
								title: config.name,
								url: searchURL.replace(/\.json|limit=1&|&random=true/gi,""),
								description: response,
								color: 8529960,
								footer: {
									icon_url: config.icon,
									text: config.name
								}
							}});
						}
					}
				}
			}).catch(e => {
				console.error("[Danbooru Error] " + e.stack);

				if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
					msg.reply("An error has occurred. Please try again later.\n\n```js\n" + e + "```");
				} else {
					msg.reply(undefined,{embed: {
						title: config.name,
						description: `Sorry, an error has occurred. Please try again later.`,
						color: 8529960,
						fields: [
							{
								name: "Error Message",
								value: "```js\n" + e + "```",
								inline: false
							}
						],
						footer: {
							icon_url: config.icon,
							text: config.name
						}
					}});
				}
			});
			msg.channel.stopTyping();
		}
	}
}
