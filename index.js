const {
	Client,
	GatewayIntentBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonStyle,
	ButtonBuilder
} = require("discord.js");
require("dotenv").config();
const Gamedig = require("gamedig");
const QuickChart = require("quickchart-js");

const { BOT_TOKEN, STATUS_CHANNEL, HOST, PORT, DISPLAY_HOST, DISPLAY_PORT } = process.env;
let tic = false;
const time = [];
const online = [];
let link;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", async (c) => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
	const statusChannel = client.channels.cache.get(STATUS_CHANNEL);

	if (!statusChannel) {
		console.log("error: id of channel invalid!");
		return;
	}

	const statusMessage = await createStatusMessage(statusChannel);
	if (!statusMessage) {
		console.log("error: unable to send status message!");
		return;
	}

	const collector = statusMessage.channel.createMessageComponentCollector();
	collector.on("collect", async (i) => {
		try {
            await i.deferUpdate();
            let shouldUpdateGraph = false;
            if(i.message.embeds[0]?.image?.url == undefined){
                shouldUpdateGraph = true;
            }
            await i.editReply({
				embeds: [await generateStatusEmbed(shouldUpdateGraph)]
			});
		} catch (error) {
			console.error("error while updating status message:\n", error);
		}
	});

	setInterval(async () => {
		try {
			if (time.length > 0) {
				const now = new Date();
				const currentHour = now.getHours();
				const lastHour = parseInt(
					time[time.length - 1].split(":")[0],
					10
				);

				await statusMessage.edit({
					embeds: [
						await generateStatusEmbed(currentHour != lastHour)
					]
				});
			}
		} catch (error) {
            console.error("error while updating status message:\n", error);
		}
	}, 300000);
});

async function createStatusMessage(statusChannel) {
	await clearOldMessages(statusChannel, 1);

	const statusMessage = await getLastMessage(statusChannel);
	if (statusMessage && statusMessage.embeds[0]?.image?.url) {
		return statusMessage;
	}

	await clearOldMessages(statusChannel, 0);

	const embed = await generateStatusEmbed(true);
	const button = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("button")
			.setLabel("🔄️")
			.setStyle(ButtonStyle.Primary)
	);

	return statusChannel.send({ embeds: [embed], components: [button] });
}

async function clearOldMessages(statusChannel, nbr) {
	try {
		const messages = await statusChannel.messages.fetch({ limit: 99 });
		let i = 0;
		for (const message of messages.values()) {
			if (i >= nbr) {
				await message.delete().catch(() => {});
			}
			i += 1;
		}
	} catch (error) {
        console.error("error while deleting old status messages:\n", error.message);
	}
}

async function getLastMessage(statusChannel) {
	try {
		const messages = await statusChannel.messages.fetch({ limit: 20 });
		const filteredMessages = messages.filter((message) => {
			return true;
		});
		return filteredMessages.first();
	} catch (e) {
        console.error("error while getting last status message (does not exist):\n", error.message);
		return null;
	}
}

async function generateStatusEmbed(update_graph) {
	let embed;
	tic = !tic;
	let ticEmoji = tic ? "[⚪]" : "[⚫]";

	try {
		const state = await Gamedig.query({
			type: "minecraftbe",
			host: HOST,
			port: PORT,
			maxAttempts: 5,
			socketTimeout: 1000,
			debug: false
		});
		try {
			if (update_graph) {
				let timeStr = new Date().toString().split(" ")[4].substring(":", 5);
				if (online.length >= 15 || time.length >= 15) {
					online.shift();
					time.shift();
				}
				if (mins.length === 1) {
					mins = "0" + mins;
				}
				time.push(`${timeStr}`);
				online.push(state.players.length);

				const myChart = new QuickChart();

				myChart.setConfig({
					type: "line",
					data: {
						labels: time,
						datasets: [{ label: "online", data: online }]
					}
				});
				myChart.setWidth(800);
				myChart.setHeight(400);
				myChart.setBackgroundColor("white");
				link = await myChart.getShortUrl();
			}
            client.user.setActivity({
                name: `✅ ${state.players.length} / ${state.maxplayers}`
            });
            
			embed = new EmbedBuilder()
				.setTitle("Server online!")
				.setColor("#00CC00")
				.setImage(link)
				.addFields(
					{ name: "Address", value: `${"`" + DISPLAY_HOST + "`"}` },
					{
						name: "Port",
						value: "`" + DISPLAY_PORT + "`",
						inline: true
					},
					{
						name: "Online:",
						value: `${
							"`" +
							state.players.length +
							" / " +
							state.maxplayers +
							"`"
						}`,
						inline: true
					}
				)
				.setFooter({ text: `${ticEmoji} Cool kids never sleep` })
				.setTimestamp();
		} catch (e) {
            client.user.setActivity({
                name: `🆘 1000-7`
            });

            console.error("error while creating status message:\n", e);

			embed = new EmbedBuilder()
				.setTitle("Server offline!")
				.setColor("#ff0000")
				.setDescription(
					"Looks like admin have fucked up. Our team probably already working on this issue. If you don't think so, please contact the administration."
				)
				.setFooter({
					text: ticEmoji + " Even cool kids need to sleep"
				})
				.setTimestamp();
		}
	} catch (e) {
        client.user.setActivity({
            name: `🆘 1000-7`
        });
		console.error("error while creating status message:\n", e);
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