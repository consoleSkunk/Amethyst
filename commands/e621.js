var clearModule = require('clear-module');
clearModule("../config/filter.json"); // remove old filter from cache

var qs = require("querystring"),
    Discord = require("discord.js"),
    fetch = require("node-fetch"),
    prettysize = require('prettysize'),
	{ name, version } = require('../package.json'),
    { user_agents, whitelist } = require("../config/config.json"),
    filter = require("../config/filter.json");

exports.module = {
	commands: ["e621","e6","e926","e9","e"],
	description: "Returns a random image from [e621](https://e621.net/) or [e926](https://e926.net/), depending on the channel.\n[Cheatsheet available here](https://e621.net/help/show/cheatsheet).",
	syntax: "tag_1 tag_2 tag_3",
	tags: [],
	process: function(client, msg, argv) {
		var params = argv.splice(1).join(" ");
		if(params.includes(",")) {
			params = 
				params
				.split(",")
				.map(s => s.trim().replace(/ /g,"_"))
				.join(" ");
		}
		var paramsLC = params.toLowerCase();
		var paramArray = paramsLC.replace(/\~/g,"").split(" ");
		var sfwMode = !msg.channel.nsfw;
		var domain = `e${sfwMode ? "926" : "621"}`;
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
			var md5Reg = /^(?:md5:)?([0-9a-f]{32})$/i;
			var idReg = /^(?:id:|#)(\d+)$/i;
			if(md5Reg.test(params)) { // md5
				searchURL = `https://${domain}.net/posts.json?md5=${qs.escape(md5Reg.exec(params)[1])}`;
			} else if(idReg.test(params)) { // post ID
				searchURL = `https://${domain}.net/posts/${qs.escape(idReg.exec(params)[1])}.json`;
			} else { // regular search
				searchURL = `https://${domain}.net/posts.json?limit=${
					paramsLC.indexOf("order:") != -1 ? "75" : "10"
				}&tags=${paramsLC.indexOf("order:") != -1 ? "" : "order:random+"}${qs.escape(params)}`;
			};
			msg.channel.startTyping();
			fetch(searchURL, {
				headers: {
					'User-Agent': `${name}/${version} ${user_agents.e621}`
				}
			})
			.then(res => res.json())
			.then(api => {
				if(api.success !== undefined && api.success == false) {
					if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply(api.message || api.reason);
					} else {
						msg.reply(undefined,{embed: {
							title: `Error`,
							description: api.message || api.reason,
							color: 15597568,
							footer: {
								icon_url: "https://e926.net/android-chrome-192x192.png",
								text: domain
							}
						}});
					}
					return;
				}

				var concatTags = function(tags) {
					// concatenate all tag groups into one array
					var array = [], keys = Object.keys(tags);
					for(var i in keys) {
						array = array.concat(tags[keys[i]])
					}
					return array;
				};

				var isFiltered = function(post){
					var all_tags = concatTags(post.tags);

					return (sfwMode && filter.nsfw.some(r=> all_tags.includes(r))) ||
					(post.rating !== "s" && filter.sfw_only.some(r=> all_tags.includes(r))) ||
					(whitelist.fetish.indexOf(msg.channel.id) == -1 && filter.fetish.some(r=> all_tags.includes(r))) ||
					(filter.blocked.some(r=> all_tags.includes(r))) ||
					(filter.guilds[msg.guild.id] && filter.guilds[msg.guild.id].some(r=> all_tags.includes(r)))
				};

				var singleImage = api.post ? true : false;
				var posts = api.post ? [api.post] : api.posts;
				if(typeof (posts) !== "undefined") {
					var trueCount = Object.keys(posts).length;
					posts = singleImage ? posts : posts.filter(function(element){ return !isFiltered(element) })
				}
				if (typeof (posts) !== "undefined" && Object.keys(posts).length > 0) {
						var post = singleImage ? api.post : posts[Math.floor(Math.random() * posts.length)];
					var srcUrls = (post.sources ? post.sources : []).filter(function(srcValue){
						if(srcValue) {
							return urlRegex = /^https?:\/\/(?:[-0-9A-Za-z]+\.)+[-0-9A-Za-z]+\/.*/.test(srcValue);
						}
					});

					var all_tags = concatTags(post.tags);

					// Filtered image
					let filteredTags = [];
					if(isFiltered(post)) {
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
					if(sfwMode && post.rating !== "s" && post.status !== "deleted") {
						msg.reply(`Sorry, the post you requested is not appropriate for this channel. (${rating})`);
					}
					else if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						if(isFiltered(post)) {
							msg.reply(
								`Image #${post.id} (${rating}) has th${filteredTags.length > 1 ? 'ese' : 'is'} blocked tag${filteredTags.length > 1 ? 's' : ''}:` +
								`${filteredTags.length > 3 ? '\n' : ' '}${filteredTags.join(", ").replace(/_/g, " ")}`
							);
						} else {
							msg.reply(`https://${domain}.net/posts/${post.id} (${rating})`);
						}
					} else {
						var description = DText(post.description).replace(/\]\(https\:\/\/e926.net\//g,`](https://${domain}.net/`);
						artists = post.tags.artist.join(", ").replace(/_\(artist\)/g,"").replace(/_/g, " ");
						var postEmbed = new Discord.MessageEmbed({
							author: {
								name: (post.tags.artist.length ? (artists.length > 64 ? artists.substr(0,63) + "…" : artists) : (srcUrls ? srcUrls[0] : null)),
								url: (srcUrls ? srcUrls[0] : null),
							},
							title:
							`${domain} - #${post.id} (${rating})`,
							url: `https://${domain}.net/posts/${post.id}?q=${qs.escape(params)}`,
							description: (description.length > 280 ? description.substr(0,279) + "…" : description),
							color: 77398,
							image: {
								url: (
								post.flags.deleted ? "https://static1.e926.net/images/deleted-preview.png" :
								post.file.ext == "swf" ? "https://static1.e926.net/images/download-preview.png" : 
								post.file.ext == "webm" ? post.sample.url : 
								post.file.size > "52428800" ? post.sample.url : 
								post.file.url
								)
							},
							footer: {
								text: `${prettysize(post.file.size)} | ${(post.score.total > 0 ? "\u2b06" : (post.score.total < 0 ? "\u2b07" : "\u2195")) + "\ufe0f " + Math.abs(post.score.total)} \u2665\ufe0f ${post.fav_count} \u{1f5e8}\ufe0f ${post.comment_count}`,
								icon_url: 'https://e926.net/android-chrome-192x192.png'
							},
							timestamp: post.created_at
						});
						// Deleted post
						/*if(post.flags.deleted) {
							postEmbed.addField(
								`Reason for deletion`,
								DText(post.delreason).replace(/\]\(https\:\/\/e926.net\//g,`](https://${domain}.net/`),
								false
							);
						}*/

						// Characters, copyright, and lore
						if(post.tags.character.length > 0) {
							var chars = post.tags.character.join(", ")
								.replace(/_\([^),]+\)/g,"") // remove parentheses from character tags
								.replace(/_/g, " "); // replace all underscores with spaces
							postEmbed.addField(
								`Character${post.tags.character.length > 1 ? `s (${post.tags.character.length})` : ''}`,
								(chars.length > 200 ? chars.substr(0,199) + "…" : chars),
								true
							);
						}
						if(post.tags.copyright.length > 0) {
							var copy = post.tags.copyright.join(", ")
								.replace(/_\(series\)/g,"")
								.replace(/_/g, " ");
							postEmbed.addField(
								`Copyright${post.tags.copyright.length > 1 ? `s (${post.tags.copyright.length})` : ''}`,
								(copy.length > 200 ? copy.substr(0,199) + "…" : copy),
								true
							);
						}
						if(post.tags.lore.length > 0) {
							var lore = post.tags.lore.join(", ")
								.replace(/_\(lore\)/g,"")
								.replace(/_/g, " ");
							postEmbed.addField(
								`Lore`,
								(lore.length > 200 ? lore.substr(0,199) + "…" : lore),
								true
							);
						}
						if(post.tags.species.length > 0) {
							var species = post.tags.species.join(", ")
								.replace(/_\(species\)/g,"")
								.replace(/_/g, " ");
							postEmbed.addField(
								`Species${post.tags.species.length > 4 ? ` (${post.tags.species.length})` : ''}`,
								(species.length > 200 ? species.substr(0,199) + "…" : species),
								false
							);
						}
						
						// Pools
						if(post.pools.length > 0) {
							var pools =	[];
							for ( var i in post.pools ) {
								pools.push(isFiltered(post) ? `#${post.pools[i]}` : `[#${post.pools[i]}](https://${domain}.net/pools/${post.pools[i]})`);
							}
							postEmbed.addField(
								`Pool${pools.length > 1 ? 's' : ''}`,
								pools.join(", "),
								true
							);
						}

						if(isFiltered(post)) {
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

						if(post.file.url == undefined && !post.flags.deleted && !isFiltered(post)) {
							postEmbed.addField("\u200B","**You must be logged in to view this image.**",false); 
						}
						else if(post.file.ext == "swf" || post.file.ext == "webm") {
							postEmbed.addField(
								"\u200B",
								`**[\u25B6\uFE0F Play/Download this ${post.file.ext == "swf" ? "Flash" : post.file.ext == "webm" ? "WebM" : "file"}](${post.file.url})**`,
								false); 
						}

						// Deleted or SWF/WebM
						if(post.flags.deleted || post.file.ext == "swf" || post.file.ext == "webm") {
							postEmbed.setThumbnail(
								post.flags.deleted ? "https://static1.e926.net/images/deleted-preview.png" :
								post.file.ext == "swf" ? "https://static1.e926.net/images/download-preview.png" :
								post.file.ext == "webm" ? "https://static1.e926.net/images/webm-preview.png" :
								postEmbed.thumbnail
							);

							if(postEmbed.image && post.file.ext !== "webm") {
								delete postEmbed.image;
							}
						}
						if(post.relationships.parent_id != null) {
							postEmbed.addField(
								`Parent`,
								(isFiltered(post) ? `#${post.relationships.parent_id}` : `[#${post.relationships.parent_id}](https://${domain}.net/posts/${post.relationships.parent_id})`),
								true
							);
						}
						if(post.relationships.children.length > 0) {
							var children = post.relationships.children;
							for ( var i in children ) {
								children[i] = (isFiltered(post) ? `#${children[i]}` : `[#${children[i]}](https://${domain}.net/posts/${children[i]})`);
							}
							postEmbed.addField(
								`Child${children.length > 1 ? 'ren' : ''}`,
								children.join(", "),
								true
							);
						}
						msg.reply(undefined, {embed: postEmbed});
					}

				}
				else {
					var response = singleImage ? "The post you requested does not exist." : trueCount > 0 ? "Your search returned only filtered images." : "No posts matched your search.";
					if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
						msg.reply(response);
					}
					else {
						msg.reply(undefined,{embed: {
							title:
							`${domain}`,
							url: searchURL.replace(/\.json|limit=1&|order:random\+/gi,""),
							description: response,
							color: 8529960,
							footer: {
								icon_url: "https://e926.net/android-chrome-192x192.png",
								text: domain
							}
						}});
					}
				}
			})
			.catch(error => {
				console.error("[e621 Error] " + error.stack);
				if(!msg.channel.permissionsFor(client.user).has("EMBED_LINKS")) {
					msg.reply(`An error has occurred. Please try again later..\n\n\`\`\`js\n${error}\`\`\`\nURL: ${searchURL}`);
				} else {
					msg.reply(undefined,{embed: {
						title: domain,
						description: `Sorry, an error has occurred. Please try again later.`,
						color: 8529960,
						fields: [
							{
								name: "Error Message",
								value: "```js\n" + error + "```",
								inline: false
							}
						],
						footer: {
							icon_url: "https://e926.net/android-chrome-192x192.png",
							text: domain
						}
					}});
				}
			}).finally(() => msg.channel.stopTyping());
		}
	}
};

// DText parser
var DTextMap = new Map([
	//escapes
	[/(\r\n|\r|\n\r)/g,'\n'],

	// bullets, put before bbcode to avoid conflict with bold
	[/^\* ([\s\S]+?)$/gim,'• $1'],
	[/^\*{2} ([\s\S]+?)$/gim,' ◦ $1'],
	[/^\*{3,} ([\s\S]+?)$/gim,'  ▪ $1'],

	//BBCode
	[/\[b\]([\s\S]+?)\[\/b\]/gi,'**$1**'],
	[/\[i\]([\s\S]+?)\[\/i\]/gi,'*$1*'],
	[/\[u\]([\s\S]+?)\[\/u\]/gi,'__$1__'],
	[/\[s\]([\s\S]+?)\[\/s\]/gi,'~~$1~~'],
	[/\[code\]([\s\S]+?)\[\/code\]/gi,'```$1```'],
	[/\[spoiler\]([\s\S]+?)\[\/spoiler\]/gi,'||$1||'],
	[/\[section(?:,expanded)?\]([\s\S]+?)(?:\[\/section\])?/gi,'**Section:**\n$1'],
	[/\[section(?:,expanded)?\="?([^\]]+?)"?\]([\s\S]+?)(?:\[\/section\])?/gi,'**$1:**\n$2'],

	//disabled since there's no Discord equivalent
	[/\[o\]([\s\S]+?)\[\/o\]/gi,'$1'],
	[/\[sup\]([\s\S]+?)\[\/sup\]/gi,'$1'],
	[/\[sub\]([\s\S]+?)\[\/sub\]/gi,'$1'],
	[/\[color=([\s\S]+?)\]([\s\S]+?)\[\/color\]/gi,'$2'],
	[/\[quote\]([\s\S]+?)\[\/quote\]/gi,'$1'], // may need a special case for this (i.e. prepending `> ` before every line)

	//enclosing stuff
	//[/`([\s\S]+?)`/gi, '`$1`'] //discord already handles inline code
	[/\"([^"]+?)\":\/([^\s]+)/g, '[$1](https://e926.net/$2)'], //local links, that stay on the page
	[/\"([^"]+?)\":([^\s]+)/g,'[$1]($2)'],
	[/\[\[(.+?)\|([\s\S]+?)\]\]/g,'[$2](https://e926.net/wiki_pages/show_or_new?title=$1)'],
	[/\[\[(.+?)\]\]/g,'[$1](https://e926.net/wiki_pages/show_or_new?title=$1)'],
	[/\{\{(.+?)\|([\s\S]+?)\}\}/g,'[$2](https://e926.net/posts?tags=$1)'],
    [/\{\{(.+?)\}\}/g,'[$1](https://e926.net/posts?tags=$1)'],
	[
		/(post|forum|comment|blip|pool|takedown|ticket) #([0-9]+)/gi,
		'[$1 #$2](https://e926.net/$1s/$2)'
	],
	[/thumb #([0-9]+)/gi, '[thumb #$1](https://e926.net/posts/$1)'],
	[/forum #([0-9]+)/gi, '[forum #$1](https://e926.net/forum_posts/$1)'],
	[/set #([0-9]+)/gi, '[set #$1](https://e926.net/post_sets/$1)'],
	[/record #([0-9]+)/gi, '[record #$1](https://e926.net/user_feedbacks/$1)'],
	[/category #([0-9]+)/gi, '[category #$1](https://e926.net/forum_topics?search%5Bcategory_id%5D=2$1)'],
	//[/\]\(http[\S]+?([\s])[\S]+?\)$/gi,'%20'], //replace spaces in URLS with %20
	[/^h[1-6]\.(\*\*[\s\S]+?\*\*)$/gim,'$1'], // do not double bold
	[/^h[1-6]\.([\s\S]+?)$/gim,'**$1**'],
]);

var DText = function(text) {
	DTextMap.forEach((value, key) => {
		text = text.replace(key, value);
	});

	return text;
};
