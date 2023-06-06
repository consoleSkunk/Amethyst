const qs = require("querystring"),
      Discord = require("discord.js"),
      fetch = import("node-fetch"),
      prettysize = require('prettysize'),
      { name, version } = require('../package.json'),
      { contact } = require("../config/config.json")

exports.module = {
	command: {
		name: "e621",
		description: "Returns a random image from e621.",
		nsfw: true,
		options: [{
			name: 'tags',
			type: Discord.ApplicationCommandOptionType.String,
			description: "List of tags to search",
			required: false,
		}]
	},
	process: function(interaction) {
		var params = interaction.options.getString('tags');

		if(params !== null && params.includes(",")) {
			params = 
				params
				.split(",")
				.map(s => s.trim().replace(/ /g,"_"))
				.join(" ");
		}

		var searchURL, query = null;
		var md5Reg = /^(?:md5:|https?:\/\/static1\.e(?:621|926)\.net\/data\/[0-9a-f]{2}\/[0-9a-f]{2}\/)?([0-9a-f]{32})(?:\.(?:jpg|png|gif|webm|swf))?$/i;
		var idReg = /^(?:id:|#|https?:\/\/e(?:621|926)\.net\/posts\/)(\d+)/i;
		if(md5Reg.test(params)) { // md5
			searchURL = `https://e621.net/posts.json?md5=${qs.escape(md5Reg.exec(params)[1])}`;
		} else if(idReg.test(params)) { // post ID
			searchURL = `https://e621.net/posts/${qs.escape(idReg.exec(params)[1])}.json`;
		} else if(params === null) { // empty search
			searchURL = "https://e621.net/posts.json?limit=75&tags=order:random";
		} else { // regular search
			searchURL = `https://e621.net/posts.json?limit=${
				params.toLowerCase().indexOf("order:") != -1 ? "75" : "10"
			}&tags=${params.toLowerCase().indexOf("order:") != -1 ? "" : "order:random+"}${qs.escape(params)}`;
			query = params;
		}
		fetch(searchURL, {
			headers: {
				'User-Agent': `${name}/${version} (by ${contact.e621} on e621; +${contact.project_url})`
			}
		})
		.then(res => res.json())
		.then(api => {
			if(api.success !== undefined && api.success == false) {
				{
					interaction.reply({embed: [{
						title: `Error`,
						description: api.message || api.reason,
						color: 15597568,
						footer: {
							icon_url: "https://e926.net/android-chrome-192x192.png",
							text: "e621"
						}
					}], ephemeral: true});
				}
				return;
			}

			var singleImage = api.post ? true : false;
			var posts = api.post ? [api.post] : api.posts;
			var ephemeral = false;
			if(typeof (posts) !== "undefined") {
				var trueCount = Object.keys(posts).length;
				posts = singleImage ? posts : posts.filter(function(element){ return (element.file.url !== null && element.file.ext !== "swf") })
			}
			if (typeof (posts) !== "undefined" && Object.keys(posts).length > 0) {
					var post = singleImage ? api.post : posts[Math.floor(Math.random() * posts.length)];
				var srcUrls = (post.sources ? post.sources : []).filter(function(srcValue){
					if(srcValue) {
						return urlRegex = /^https?:\/\/(?:[-0-9A-Za-z]+\.)+[-0-9A-Za-z]+\/.*/.test(srcValue);
					}
				});

				var rating = (
				post.rating == "s" ? "Safe" : 
				post.rating == "e" ? "Explicit" : 
				post.rating == "q" ? "Questionable" :
				"Unknown");
				{
					var description = DText(post.description);
					artists = post.tags.artist.join(", ").replace(/_\(artist\)/g,"").replace(/_/g, " ");
					var postEmbed = new Discord.EmbedBuilder({
						author: {
							name: (post.tags.artist.length ? (artists.length > 64 ? artists.substr(0,63) + "…" : artists) : (srcUrls ? srcUrls[0] : null)),
							url: (srcUrls ? srcUrls[0] : null),
						},
						title:
						`e621 - #${post.id} (${rating})`,
						url: `https://e621.net/posts/${post.id}${query !== null ? "?q=" + qs.escape(query) : ""}`,
						description: (description.length > 512 ? description.substr(0,511) + "…" : description),
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
					if(post.flags.deleted) {
						ephemeral = true;
					}

					// Characters, copyright, and lore
					if(post.tags.character.length > 0) {
						var chars = post.tags.character.join(", ")
							.replace(/_\([^),]+\)/g,"") // remove parentheses from character tags
							.replace(/_/g, " "); // replace all underscores with spaces
						postEmbed.addFields([{
							name: `Character${post.tags.character.length > 1 ? `s (${post.tags.character.length})` : ''}`,
							value: (chars.length > 200 ? chars.substr(0,199) + "…" : chars),
							inline: true
						}]);
					}
					if(post.tags.copyright.length > 0) {
						var copy = post.tags.copyright.join(", ")
							.replace(/_\(series\)/g,"")
							.replace(/_/g, " ");
						postEmbed.addFields([{
							name: `Copyright${post.tags.copyright.length > 1 ? `s (${post.tags.copyright.length})` : ''}`,
							value: (copy.length > 200 ? copy.substr(0,199) + "…" : copy),
							inline: true
						}]);
					}
					if(post.tags.lore.length > 0) {
						var lore = post.tags.lore.join(", ")
							.replace(/_\(lore\)/g,"")
							.replace(/_/g, " ");
						postEmbed.addFields([{
							name: `Lore`,
							value: (lore.length > 200 ? lore.substr(0,199) + "…" : lore),
							inline: true
						}]);
					}
					if(post.tags.species.length > 0) {
						var species = post.tags.species.join(", ")
							.replace(/_\(species\)/g,"")
							.replace(/_/g, " ");
						postEmbed.addFields([{
							name: `Species${post.tags.species.length > 4 ? ` (${post.tags.species.length})` : ''}`,
							value: (species.length > 200 ? species.substr(0,199) + "…" : species),
							inline: false
						}]);
					}
					
					// Pools
					if(post.pools.length > 0) {
						var pools =	[];
						for ( var i in post.pools ) {
							pools.push(`[#${post.pools[i]}](https://e621.net/pools/${post.pools[i]})`);
						}
						postEmbed.addFields([{
							name: `Pool${pools.length > 1 ? 's' : ''}`,
							value: pools.join(", "),
							inline: true
						}]);
					}

					if(post.file.url == undefined && !post.flags.deleted) {
						postEmbed.addFields([{
							name: "\u200B",
							value: "**You must be logged in to view this image.**",
							inline: false
						}]); 
						ephemeral = true;
					}
					else if(post.file.ext == "swf" || post.file.ext == "webm") {
						postEmbed.addFields([{
							name: "\u200B",
							value: `**[\u25B6\uFE0F Play/Download this ${post.file.ext == "swf" ? "Flash" : post.file.ext == "webm" ? "WebM" : "file"}](${post.file.url})**`,
							inline: false
						}]); 
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
						postEmbed.addFields([{
							name: `Parent`,
							value: `[#${post.relationships.parent_id}](https://e621.net/posts/${post.relationships.parent_id})`,
							inline: true
						}]);
					}
					if(post.relationships.children.length > 0) {
						var children = post.relationships.children;
						for ( var i in children ) {
							children[i] = `[#${children[i]}](https://e621.net/posts/${children[i]})`;
						}
						postEmbed.addFields([{
							name: `Child${children.length > 1 ? 'ren' : ''}`,
							value: children.join(", "),
							inline: true
						}]);
					}
					interaction.reply({content: `https://e621.net/posts/${post.id}${query !== null ? "?q=" + qs.escape(query) : ""}`, embeds: [postEmbed], ephemeral: ephemeral});
				}

			}
			else {
				var response = singleImage ? "The post you requested does not exist." : trueCount > 0 ? "Your search returned only filtered images." : "No posts matched your search.";
				interaction.reply({embeds: [{
					title: `e621`,
					url: searchURL.replace(/\.json|limit=1&|order:random\+/gi,""),
					description: response,
					color: 8529960,
					footer: {
						icon_url: "https://e926.net/android-chrome-192x192.png",
						text: "e621"
					}
				}], ephemeral: true});
			}
		})
		.catch(error => {
			console.error("[e621 Error] " + error.stack);
			interaction.reply({embed: [{
				title: "e621",
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
					text: "e621"
				}
			}], ephemeral: true});
		})
	}
};

// DText parser
var DTextMap = new Map([
	//escapes
	[/(\r\n|\r|\n\r)/g,'\n'],

	// bullets, put before bbcode to avoid conflict with bold
	[/^(\*{1,11}) ([\s\S]+?)$/gim,(match, p1, p2) => {
		return "  ".repeat(p1.length - 1) + "* " + p2;
	}],

	// headings
	[/^h1\.([\s\S]+?)$/gim,'# $1'],
	[/^h2\.([\s\S]+?)$/gim,'## $1'],
	[/^h3\.([\s\S]+?)$/gim,'### $1'],
	[/^h[4-6]\.([\s\S]+?)$/gim,'**$1**'],

	//BBCode
	[/\[b\]([\s\S]+?)\[\/b\]/gi,'**$1**'],
	[/\[i\]([\s\S]+?)\[\/i\]/gi,'*$1*'],
	[/\[u\]([\s\S]+?)\[\/u\]/gi,'__$1__'],
	[/\[s\]([\s\S]+?)\[\/s\]/gi,'~~$1~~'],
	[/\[code\]([\s\S]+?)\[\/code\]/gi,'```$1```'],
	[/\[spoiler\]([\s\S]+?)\[\/spoiler\]/gi,'||$1||'],

	// sections are converted to quotes to be reparsed
	[/\[section(?:,expanded)?\]([\s\S]+?)\[\/section\]/gi,'[quote]$1[/quote]'],
	[/\[section(?:,expanded)?\=(?:"([^\]]+)"|([^\]]+))\]([\s\S]+?)\[\/section\]/gi,'### $1$2\n[quote]$3[/quote]'],
	[/\[quote\](\n?[\s\S]+?\n?)\[\/quote\]/gi,(match, p1) => {
		content = p1.replace(/^\n+|\n+$/g, '')
		content = content.replace(/^/gm, '> ')
		return content;
	}],

	//disabled since there's no Discord equivalent
	[/\[o\]([\s\S]+?)\[\/o\]/gi,'$1'],
	[/\[sup\]([\s\S]+?)\[\/sup\]/gi,'$1'],
	[/\[sub\]([\s\S]+?)\[\/sub\]/gi,'$1'],
	[/\[color=([\s\S]+?)\]([\s\S]+?)\[\/color\]/gi,'$2'],
	//tables
	[/\[table\]([\s\S]+?)\[\/table\]/gi,'$1'],
	[/\[thead\]([\s\S]+?)\[\/thead\]/gi,'$1'],
	[/\[tbody\]([\s\S]+?)\[\/tbody\]/gi,'$1'],
	[/\[tr\]([\s\S]+?)\[\/tr\]/gi,'$1'],
	[/\[th\]([\s\S]+?)\[\/th\]/gi,'$1'],
	[/\[td\]([\s\S]+?)\[\/td\]/gi,'$1'],

	//enclosing stuff
	//[/`([\s\S]+?)`/gi, '`$1`'] //discord already handles inline code
	[/\"([^"]+?)\":\/([^\s]+)/g, '[$1](https://e621.net/$2)'], //local links, that stay on the page
	[/\"([^"]+?)\":([^\s]+)/g,'[$1]($2)'],
	[/\[\[(.+?)\|([\s\S]+?)\]\]/g,'[$2](https://e621.net/wiki_pages/show_or_new?title=$1)'],
	[/\[\[(.+?)\]\]/g,'[$1](https://e621.net/wiki_pages/show_or_new?title=$1)'],
	[/\{\{(.+?)\|([\s\S]+?)\}\}/g,'[$2](https://e621.net/posts?tags=$1)'],
	[/\{\{(.+?)\}\}/g,'[$1](https://e621.net/posts?tags=$1)'],

	// id based links
	[
		/(post|note|comment|pool|user|artist|ban|blip|ticket) #([0-9]+)/gi,
		'[$1 #$2](https://e621.net/$1s/$2)'
	],
	[/thumb #([0-9]+)/gi, '[thumb #$1](https://e621.net/posts/$1)'],
	[/post changes #([0-9]+)/gi, '[post changes #$1]/post_versions?search[post_id]=$1'],
	[/(flag|set) #([0-9]+)/gi, '[$1 #$2](https://e621.net/post_$1s/$2)'],
	[/forum #([0-9]+)/gi, '[forum #$1](https://e621.net/forum_posts/$1)'],
	[/topic #([0-9]+)\/p([0-9]+)/gi, '[forum #$1](https://e621.net/forum_topics/$1?page=$2)'],
	[/topic #([0-9]+)/gi, '[forum #$1](https://e621.net/forum_topics/$1)'],
	[/bur #([0-9]+)/gi, '[BUR #$1](https://e621.net/bulk_update_requests/$1)'],
	[/(alias|implication) #([0-9]+)/gi, '[$1 #$2](https://e621.net/tag_$1s/$2)'],
	[/mod action #([0-9]+)/gi, '[mod action #$1](https://e621.net/mod_actions/$1)'],
	[/record #([0-9]+)/gi, '[record #$1](https://e621.net/user_feedbacks/$1)'],
	[/wiki #([0-9]+)/gi, '[wiki #$1](https://e621.net/wiki_pages/$1)'],
	[/category #([0-9]+)/gi, '[category #$1](https://e621.net/forum_topics?search%5Bcategory_id%5D=2$1)'],
	[/take ?down (?:request )?#([0-9]+)/gi, '[takedown #$1](https://e621.net/takedowns/$1'],
	//[/\]\(http[\S]+?([\s])[\S]+?\)$/gi,'%20'], //replace spaces in URLs with %20
]);

var DText = function(text) {
	DTextMap.forEach((value, key) => {
		text = text.replace(key, value);
	});

	return text;
};
