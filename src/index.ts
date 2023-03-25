import discord, { ChannelType, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('No bot token found!');
}

const saveMessage = async (message: discord.Message, parentChannel?: discord.BaseGuildTextChannel) => {
  let directory = `messages/${parentChannel ? `${parentChannel.id}/` : ''}${message.channel.id}`;
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }

  fs.writeFileSync(
    `${directory}/${message.id}.json`, 
    JSON.stringify(message, null, 4)
  );
}

const getMessageHistory = async (channel: discord.AnyThreadChannel | discord.BaseGuildTextChannel, parentChannel?: discord.BaseGuildTextChannel) => {
  let message = await channel.messages
    .fetch({ limit: 1 })
    .then(messagePage => {
      messagePage.forEach(msg => saveMessage(msg, parentChannel));
      return messagePage.size === 1 ? messagePage.at(0) : null;
    });

  while (message) {
    await channel.messages
      .fetch({ limit: 100, before: message.id })
      .then(messagePage => {
        messagePage.forEach(msg => saveMessage(msg, parentChannel));
        message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
      })
  }
}

const client = new discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});


client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  
  let guilds = await client.guilds.fetch();
  for (let guild of guilds) {
    let server = await client.guilds.fetch(guild[1].id);
    let channels = await server.channels.fetch();
    
    for (let channel of channels) {
      if (channel[1]?.type == ChannelType.GuildText) {
        getMessageHistory(channel[1]);

        let threads = await channel[1].threads.fetch();
        for (let thread of threads.threads) {
          getMessageHistory(thread[1], channel[1]);
        }
      }
    }
  }
});

client.on('messageCreate', (message: any) => {
  if (message.author.bot) return;
  
  console.log('message:', message);
});

// Wake up 🤖
client.login(process.env.DISCORD_BOT_TOKEN);
