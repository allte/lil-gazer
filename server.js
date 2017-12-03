const { Client } = require('discord.js');
const yt = require('ytdl-core');
const tokens = require('./tokens.json');
const client = new Client();
const Discord = require('discord.js');

const http = require('http');
const express = require('express');
const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 2800);


let queue = {};

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(new Discord.RichEmbed().setTitle(":x:Error:x:").setDescription(`Add some songs to the queue first with ${tokens.prefix}add`));
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.send(new Discord.RichEmbed().setTitle(":x:Error:x:").setDescription("Already playing music"));
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.send(new Discord.RichEmbed().setTitle(":x:Error:x:").setDescription("There are currently no songs in the queue")).then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.send(new Discord.RichEmbed().setTitle(":mag_right:Info:mag:").setDescription("Playing " + song.title))
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : tokens.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(tokens.prefix + 'pause')) {
					msg.channel.send(new Discord.RichEmbed().setTitle(":mag_right:Info:mag:").setDescription("Successfully paused \n" + song.title)).then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(tokens.prefix + 'resume')){
					msg.channel.send(new Discord.RichEmbed().setDescription("Resuming\n" + song.title)).then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(tokens.prefix + 'skip')){
					msg.channel.send(new Discord.RichEmbed().setTitle(":mag_right:Info:mag:").setDescription("Successfully skipped \n" + song.title)).then(() => {dispatcher.end();});
				} else if (m.content.startsWith('volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith('volume-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(tokens.prefix + 'time')){
					msg.channel.send(new Discord.RichEmbed().setTitle(":mag_right:Info:mag:").addField("Time Elapsed", `${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`));
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.send('error: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.channel.send(new Discord.RichEmbed().setTitle(":x:Error:x:").setDescription("I couldn't connect to your voice channel."))
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'add': (msg) => {
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.send(new Discord.RichEmbed().setTitle(":x:Error:x:").setDescription(`Don't forget to add a youtube link / search query after ${tokens.prefix}add`));
    if(!url.startsWith("https://")){
      const YouTube = require("discord-youtube-api");
      const youtube = new YouTube("AIzaSyCQ_-aH215btVPOX331giHH6P79x4kZxLk");
      async function testAll(input) {
    const video = await youtube.searchVideos(input);
    let Url = video.url;
    let Title = video.title;
    let Requester = msg.author.username
    if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: Url, title: Title, requester: Requester});
    msg.channel.send(new Discord.RichEmbed().setTitle(":white_check_mark: Success :white_check_mark:").setDescription("Your song has been successfully added to the queue").addField("Song", Title).addField("Length", video.length));
}
      testAll(url);
      
    } else 
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.send(new Discord.RichEmbed().setTitle(":x:Error:x:").setDescription(err));
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.send(new Discord.RichEmbed().setTitle(":white_check_mark: Success :white_check_mark:").setDescription("Your song has been successfully added to the queue").addField("Song", info.title));
		});
    
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(new Discord.RichEmbed().setTitle(":x:Error:x:").setDescription(`Add some songs to the queue first with ${tokens.prefix}add`));
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.sendMessage(`__**Queue:**__ Currently **${tosend.length}** song(s) queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'help': (msg) => {
		let tosend = ['```xl', tokens.prefix + 'join : "Joins VC of whoever sent the message"',	tokens.prefix + 'add : "Add songs to the queue (links only)"', tokens.prefix + 'queue : "Shows t"', tokens.prefix + 'play : "Play the music queue if already joined to a voice channel"', '', 'if the music bot is running => {'.toUpperCase(), tokens.prefix + 'pause : "Pauses the music playing"',	tokens.prefix + 'resume : "Resumes the music playing"', tokens.prefix + 'skip : "Skips the song playing"', tokens.prefix + 'time : "Shows the playtime of the song."',	'volume+ : "increases volume by 2%/+"',	'volume- : "decreases volume by 2%/-"',	'```'];
		msg.channel.sendMessage(tosend.join('\n'));
	},
	'reboot': (msg) => {
		if (msg.author.id == tokens.adminID) process.exit(); //Requires a node module like Forever to work.
	},
        'info': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(new Discord.RichEmbed().setTitle(":x:Error:x:").setDescription(`Add some songs to the queue first with ${tokens.prefix}add`));
		queue[msg.guild.id].songs.forEach((song, i) => {
			let temporary = song.title;
			const YouTube = require("discord-youtube-api");
      const youtube = new YouTube("AIzaSyCQ_-aH215btVPOX331giHH6P79x4kZxLk");
      async function testAll(input) {
    const video = await youtube.searchVideos(input);
			message.reply(`"${video.title}"'s length is ${video.length}`);
			}
			testAll(temporary);
		});
	}
			
};

client.on('ready', () => {
	console.log('RIP Lil Peep');
});

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});

client.login(process.env.TOKEN);
