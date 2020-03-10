var qs = require("querystring"),
    Discord = require("discord.js"),
    request = require("request"),
    prettysize = require('prettysize'),
    whitelist = require("../config/config.json").whitelist,
    userAgent = require("../config/config.json").user_agents.danbooru,
    filter = require("../config/filter.json");

exports.module = {
	commands: ["danbooru","dan","safebooru","safe"],
	description: "Returns a random image from Danbooru or Safebooru, depending on the channel.\n[Cheatsheet available here](https://safebooru.donmai.us/wiki_pages/43049).",
	syntax: "tag_1 tag_2",
	tags: [],
	process: function(client, msg, params) {
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
		var domain = `${sfwMode ? "safe" : "dan"}booru.donmai.us`;
		var urlRegex = /^https?:\/\/(?:[-0-9A-Za-z]+\.)+[-0-9A-Za-z]+\/.*/;
		if(
			((sfwMode || paramArray.includes("rating:safe") || paramArray.includes("rating:s")) && filter.nsfw.some(r=> paramArray.includes(r))) ||
			((!sfwMode && !paramArray.includes("rating:safe") && !paramArray.includes("rating:s")) && filter.sfw_only.some(r=> paramArray.includes(r))) ||
			(whitelist.fetish.indexOf(msg.channel.id) == -1 && filter.fetish.some(r=> paramArray.includes(r))) ||
			(filter.blacklist.some(r=> paramArray.includes(r))) ||
			(filter.guilds[msg.guild.id] && filter.guilds[msg.guild.id].some(r=> paramArray.includes(r)))
		){
			msg.reply("Your search contains tags that are blacklisted in this channel.");
			return;
		}
		else {
			var searchURL;
			var singleImage;
			var md5Reg = /^(?:md5:)?([0-9a-f]{32})$/i;
			var idReg = /^(?:id:|#)(\d+)$/i;
			if(md5Reg.test(params)) { // md5
				searchURL = `https://${domain}/posts.json?md5=${qs.escape(md5Reg.exec(params)[1])}`;
				singleImage = true;
			} else if(idReg.test(params)) { // post ID
				searchURL = `https://${domain}/posts/${qs.escape(idReg.exec(params)[1])}.json`;
				singleImage = true;
			} else if(params.indexOf("order:") != -1) { // ordered search
				searchURL = `https://${domain}/posts.json?limit=25&tags=${qs.escape(params)}`;
				singleImage = false;
			} else { // random search
				searchURL = `https://${domain}/posts/random.json?tags=${qs.escape(params)}`;
				singleImage = true;
			};
			//console.log(searchURL);
			msg.channel.startTyping();
			request({
				url: searchURL,
				headers: {
					'User-Agent': userAgent
				}
			},
			function (error, response, body) {
				if ((!error && response.statusCode == 200)) {
					try {
						var json = JSON.parse(body);
						var isFiltered = function(post){
							return (sfwMode && filter.nsfw.some(r=> post.tag_string.split(" ").includes(r))) ||
							(post.rating !== "s" && filter.sfw_only.some(r=> post.tag_string.split(" ").includes(r))) ||
							(whitelist.fetish.indexOf(msg.channel.id) == -1 && filter.fetish.some(r=> post.tag_string.split(" ").includes(r))) ||
							(filter.blacklist.some(r=> post.tag_string.split(" ").includes(r))) ||
							(filter.guilds[msg.guild.id] && filter.guilds[msg.guild.id].some(r=> post.tag_string.split(" ").includes(r)))
						}
						if (typeof (json) !== "undefined" && Object.keys(json).length > 0) {
						var post = 
							singleImage ? json :
							params.indexOf("order:") != -1 ? json[Math.floor(Math.random() * json.length)] :
							json[0]

							// Blacklisted image
							let blacklistedTags = [];
							if(isFiltered(post)) {
								let tags = post.tag_string.split(" ");
								if(sfwMode && filter.nsfw.some(r=> tags.includes(r))) {
									filter.nsfw.map((first) => {
										blacklistedTags[tags.findIndex(def => def === first)] = first;
									});
								}

								if(post.rating !== "s" && filter.sfw_only.some(r=> tags.includes(r))) {
									filter.sfw_only.map((first) => {
										blacklistedTags[tags.findIndex(def => def === first)] = first;
									});
								}

								if(whitelist.fetish.indexOf(msg.channel.id) == -1 && filter.fetish.some(r=> tags.includes(r))) {
									filter.fetish.map((first) => {
										blacklistedTags[tags.findIndex(def => def === first)] = first;
									});
								}

								if(filter.blacklist.some(r=> tags.includes(r))) {
									filter.blacklist.map((first) => {
										blacklistedTags[tags.findIndex(def => def === first)] = first;
									});
								}

								if(filter.guilds[msg.guild.id] && filter.guilds[msg.guild.id].some(r=> tags.includes(r))) {
									filter.guilds[msg.guild.id].map((first) => {
										blacklistedTags[tags.findIndex(def => def === first)] = first;
									});
								}
								blacklistedTags = blacklistedTags.filter(v => v);
							}

							var rating = (
								post.rating == "s" ? "Safe" : 
								post.rating == "e" ? "Explicit" : 
								post.rating == "q" ? "Questionable" :
								"Unknown");
							if(sfwMode && post.rating !== "s") {
								msg.reply(`Sorry, the post you requested is not appropriate for this channel. (${rating})`);
							}
							else if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
								if(isFiltered(post)) {
									msg.reply(
										`Image #${post.id} (${rating	}${post.is_deleted ? ", Deleted" : ""}) has th${blacklistedTags.length > 1 ? 'ese' : 'is'} blacklisted tag${blacklistedTags.length > 1 ? 's' : ''}:` +
										`${blacklistedTags.length > 3 ? '\n' : ' '}${blacklistedTags.join(", ").replace(/_/g, " ")}`
									);
								} else {
									msg.reply(`https://${domain}/posts/${post.id} (${rating}${post.is_deleted ? ", Deleted" : ""})`);
								}
							} else {
								//var description = DText.parse(post.description).replace(/\]\(https\:\/\/DTextDomain\//g,`](https://${domain}/`);
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
									`${sfwMode ? "Safebooru" : "Danbooru"} - #${post.id} (${rating}${post.is_deleted ? ", Deleted" : ""})`,
									url: `https://${domain}/posts/${post.id}?q=${qs.escape(params)}`,
									color: 29695,
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
	
								// Blacklisted image
								if(isFiltered(post)){
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
										`Blacklisted tag${blacklistedTags.length > 1 ? 's' : ''}`,
										blacklistedTags.join(", ").replace(/_/g, " "),
										false
									);
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
										(isFiltered(post) ? `#${post.parent_id}` : `[#${post.parent_id}](https://${domain}/posts/${post.parent_id})`),
										true
									);
								}
								// post children have been hidden from the Danbooru API by default
								/* if(post.has_visible_children) {
									var children = post.children_ids.split(",");
									for ( var i in children.length ) {
										children[i] = (isFiltered(post) ? `#${children[i]}` : `[#${children[i]}](https://${domain}/posts/${children[i]})`);
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
							if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
								msg.reply(singleImage ? "The post you requested does not exist." : "No posts matched your search.");
							} else {
								msg.reply(undefined,{embed: {
									title: sfwMode ? "Safebooru" : "Danbooru",
									url: searchURL.replace(/\.json|limit=1&|&random=true/gi,""),
									description: singleImage ? "The post you requested does not exist." : "No posts matched your search.",
									color: 8529960,
									footer: {
										icon_url: "https://i.imgur.com/SSQuBPx.png",
										text: sfwMode ? "Safebooru" : "Danbooru"
									}
								}});
							}
						}
					} catch (e) {
						console.error("[Danbooru Error] " + e);

						if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
							msg.reply(`An error has occured. Please try again later.\n\n\`\`\`js\n${e}\`\`\`\nURL: ${response.request.uri.href}`);
						} else {
							msg.reply(undefined,{embed: {
								title: sfwMode ? "Safebooru" : "Danbooru",
								description: `Sorry, an error occured while getting your image. Please try again later.`,
								color: 8529960,
								fields: [
									{
										name: "Error Message",
										value: "```js\n" + e + "```",
										inline: false
									},
									{
										name: "URL",
										value: response.request.uri.href,
										inline: false
									}
								],
								footer: {
									icon_url: "https://i.imgur.com/SSQuBPx.png",
									text: sfwMode ? "Safebooru" : "Danbooru"
								}
							}});
						}
					}
				}
				else {
					try {
						var error = JSON.parse(body);
					} catch(e) {
						var error = {
							success: false,
							message: "A server error occured. Please try again later.",
							backtrace: []
						}
					}
					if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply(error.message || error.reason);
					} else {
						msg.reply(undefined,{embed: {
							title: `${response.statusCode} ${response.statusMessage}`,
							description: error.message || error.reason,
							color: 15597568,
							footer: {
								icon_url: "https://i.imgur.com/SSQuBPx.png",
								text: sfwMode ? "Safebooru" : "Danbooru"
							}
						}});
					}
				}
			});
			msg.channel.stopTyping();
		}
	}
}
