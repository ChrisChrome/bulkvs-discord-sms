// a simple express server that takes any URL and console logs it
const config = require('./config.json');
const express = require('express');
const axios = require('axios');
const Discord = require('discord.js');
const ffmpeg = require("ffmpeg");
const hook = new Discord.WebhookClient({ url: config.webhook }, {
	allowedMentions: {
		parse: []
	}
});
const fs = require('fs');
const app = express();
app.use(express.json());

cnamCache = {};

app.post('/sms', async (req, res) => {
	data = req.body;
	// Get the CNAM record for the number
	if (cnamCache[data.From]) {
		cnam = cnamCache[data.From];
	} else {
		cnam = data.From;
		await axios.get(`https://cnam.bulkvs.com/?id=${config.bulkvs.id}&did=${data.From}&format=json`, {
			headers: {
				'Content-Type': 'application/json'
			}
		}).then(function (response) {
			cnam = response.data.name;

		}).catch(function (error) {
			console.log(error);
		});
		cnamCache[data.From] = cnam;
	}
	if (data.MediaURLs) { // It's an MMS
		out = {
			"text": "",
			"images": []
		};
		// Check if theres any text files in MediaURLs
		// wrap the for loop in an async function so we can use await
		await (async () => {
			for (let i = 0; i < data.MediaURLs.length; i++) {
				if (data.MediaURLs[i].includes(".txt")) {
					// Get the text file
					await axios.get(data.MediaURLs[i]).then(function (response) {
						response.data = response.data.replaceAll("=\n", "");
						response.data = response.data.replaceAll("=\r\n", "");
						response.data = response.data.replaceAll("=\r", "");
						out["text"] = response.data;
					}).catch(function (error) {
						console.log(error);
					})
				} // Check for jpg and jpeg files
				else if (data.MediaURLs[i].includes(".jpg") || data.MediaURLs[i].includes(".jpeg") || data.MediaURLs[i].includes(".png") || data.MediaURLs[i].includes(".gif")) {
					// get file name from URL
					filename = data.MediaURLs[i].split("/").pop();
					out['images'].push({ name: filename, attachment: data.MediaURLs[i] });
				}
			}
		})();
		hook.send({
			content: out['text'],
			files: out['images'],
			username: cnam,
			avatarURL: encodeURI(`https://tiley.herokuapp.com/avatar/${cnam.replaceAll(" ", "")}/${cnam.replaceAll(" ", "")}.png?s=500`)
		})
	} else { // It's an SMS
		data.Message = data.Message.replaceAll("+", " ");
		data.Message = decodeURIComponent(data.Message);
		hook.send({
			content: data.Message,
			username: cnam,
			avatarURL: encodeURI(`https://tiley.herokuapp.com/avatar/${cnam.replaceAll(" ", "")}/${cnam.replaceAll(" ", "")}.png?s=500`)
		})
	}
	res.send("OK");
});

app.listen(config.port, () => {
	console.log(`Listening on port ${config.port}`);
});