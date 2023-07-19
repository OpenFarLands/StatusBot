const {
	Client,
	Events,
	GatewayIntentBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");
require("dotenv").config();
const Gamedig = require("gamedig");
const QuickChart = require("quickchart-js");

let tic = false;
const { BOT_TOKEN, STATUS_CHANNEL, HOST, PORT, DISPLAY_HOST, DISPLAY_PORT } = process.env;

let time = [];
let online = [];
let link;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

	let statusChannel = client.channels.cache.get(STATUS_CHANNEL);
	if (statusChannel == undefined) {
		console.log("error: id of channel invalid!");
		return;
	}
	let statusMessage = await createStatusMessage(statusChannel);
	if (statusMessage == undefined) {
		console.log("error: unable to send status message!");
		return;
	}

	const collector = statusMessage.channel.createMessageComponentCollector();
	collector.on("collect", async (i) => {
		await i.update({ embeds: [await generateStatusEmbed()] });
	});
	setInterval(async () => {
		let now = new Date();
		if (now.getHours() - time[time.length - 1].split(":")[0] > 0) {
			await statusMessage.edit({
				embeds: [await generateStatusEmbed(true)],
			});
		} else {
			await statusMessage.edit({ embeds: [await generateStatusEmbed()] });
		}
	}, 300000);
});

async function createStatusMessage(statusChannel) {
	await clearOldMessages(statusChannel, 1);

	let statusMessage = await getLastMessage(statusChannel);
	if (statusMessage != undefined) {
		return statusMessage;
	}
	await clearOldMessages(statusChannel, 0);

	let embed = await generateStatusEmbed(true);
	let button = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("button")
			.setLabel("🔄️")
			.setStyle(ButtonStyle.Primary)
	);
	return await statusChannel
		.send({ embeds: [embed], components: [button] })
		.then((sentMessage) => {
			return sentMessage;
		});
}

function clearOldMessages(statusChannel, nbr) {
	return statusChannel.messages
		.fetch({ limit: 99 })
		.then((messages) => {
			messages = messages.filter(
				(msg) => msg.author.id == client.user.id && !msg.system
			);
			let promises = [];
			let i = 0;
			messages.each((message) => {
				if (i >= nbr) {
					promises.push(
						message.delete().catch(function (error) {
							return;
						})
					);
				}
				i += 1;
			});
			return Promise.all(promises).then(() => {
				return;
			});
		})
		.catch((e) => {
			return;
		});
}

function getLastMessage(statusChannel) {
	return statusChannel.messages
		.fetch({ limit: 20 })
		.then((messages) => {
			messages = messages.filter();
			return messages.first();
		})
		.catch((e) => {
			return;
		});
}

async function generateStatusEmbed(update_graph = false) {
	let embed;
	tic = !tic;
	let ticEmoji = tic ? "[⚪]" : "[⚫]";

	try {
		await Gamedig.query({
			type: "minecraftbe",
			host: HOST,
			port: PORT,
			maxAttempts: 5,
			socketTimeout: 1000,
			debug: false,
		})
			.then(async (state) => {
				if (update_graph) {
					let now = new Date();
					let mins = now.getMinutes().toString();
					let hours = now.getHours().toString();
					if (online.length >= 15 || time.length >= 15) {
						online.shift();
						time.shift();
					}
					if (mins.length === 1) {
						mins = "0" + mins;
					}
					if (hours.length === 1) {
						hours = "0" + hours;
					}
					time.push(`${hours}:${mins}`);
					online.push(state.players.length);

					const myChart = new QuickChart();
					myChart.setConfig({
						type: "line",
						data: {
							labels: time,
							datasets: [{ label: "online", data: online }],
						},
					});
					myChart.setWidth(800);
					myChart.setHeight(400);
					myChart.setBackgroundColor("white");
					link = await myChart.getShortUrl();
				}
				embed = new EmbedBuilder()
					.setTitle("Server online!")
					.setColor("#00CC00")
					.setImage(link)
					.addFields(
						{ name: "Address", value: "`" + DISPLAY_HOST + "`" },
						{
							name: "Port",
							value: "`" + DISPLAY_PORT + "`",
							inline: true,
						},
						{
							name: "Online:",
							value: "`" + state.players.length + " / " + state.maxplayers + "`",
							inline: true,
						}
					)
					.setFooter({ text: ticEmoji + " Cool kids never sleep" })
					.setTimestamp();
			})
			.catch(async (e) => {
				console.info(e);
				embed = new EmbedBuilder()
					.setTitle("Server offline!")
					.setColor("#ff0000")
					.setDescription(
						"Looks like admin have fucked up. Our team probably already working on this issue. If you don't think so, please contact the administration."
					)
					.setFooter({
						text: ticEmoji + " Even cool kids need to sleep",
					})
					.setTimestamp();
			});
	} catch (e) {
		console.info(e);
		embed = new EmbedBuilder()
			.setTitle("Server offline!")
			.setColor("#ff0000")
			.setDescription(
				"Looks like admin have fucked up. Our team probably already working on this issue. If you don't think so, please contact the administration."
			)
			.setFooter({ text: ticEmoji + " Even cool kids need to sleep" })
			.setTimestamp();
	}
	return embed;
}

client.login(BOT_TOKEN);
