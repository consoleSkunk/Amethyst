# Amethyst
A modular Discord bot written with [Discord.js](https://discord.js.org/)

## Getting Started

1. Install [Node.js](https://nodejs.org) if it hasn't been installed yet.
2. Clone the repository: `git clone https://github.com/ErikaIsGirl/Amethyst`
3. Rename `config.example.json` and `filter.example.json` in `config` to `config.json` and `filter.json` respectively, and modify them accordingly.
4. Do `npm install` to install the required dependencies.
5. Set the `DISCORD_TOKEN` environment variable:
   1. `set DISCORD_TOKEN=<your token>` on Windows
   2. `export DISCORD_TOKEN="<your token>"` on Mac/Linux
6. Now start the bot by doing either:
   1. `npm start`
   2. Install [PM2](https://pm2.keymetrics.io/) or another process manager: `npm install -g pm2`, and run it using `pm2 start package.json`.  
      Make sure you unset the `DISCORD_TOKEN` variable afterwards.

## Credits

- [Yoshi-Bot](https://github.com/Woofie-Woof/Yoshi-Bot) by [Woofie-Woof](https://github.com/Woofie-Woof)  
  Originally started as a fork of this bot, and as a result, some code is still used from it.
- [selfbit](https://github.com/Ahe4d/selfbit) by [Ahe4d](https://github.com/Ahe4d) (ISC License)  
  Code was reused to make the bot modular.
- [e621-android](https://github.com/rebane621/e621-android/) by [rebane621](https://github.com/rebane621) (BSD 2-Clause License)  
  DText parser converted to JavaScript and adapted to Discord's Markdown formatting.
