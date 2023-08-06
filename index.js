const { Client, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require("discord.js");
require("dotenv").config();
const Gamedig = require("gamedig");
const QuickChart = require("quickchart-js");

const { BOT_TOKEN, STATUS_CHANNEL, HOST, PORT, DISPLAY_HOST, DISPLAY_PORT } = process.env;
let tic = false;
const time = [];
const online = [];
let link;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
    console.log(`Готово! Вошли как ${client.user.tag}`);
    const statusChannel = client.channels.cache.get(STATUS_CHANNEL);

    if (!statusChannel) {
        console.log("Ошибка: неверный идентификатор канала!");
        return;
    }

    const statusMessage = await createStatusMessage(statusChannel);
    if (!statusMessage) {
        console.log("Ошибка: невозможно отправить сообщение со статусом!");
        return;
    }

	const collector = statusMessage.channel.createMessageComponentCollector();

	collector.on("collect", async (i) => {
		try {
			await i.update({ embeds: [await generateStatusEmbed()] });
		} catch (error) {
			console.log('Произошла ошибка при обновлении сообщения:\n', error.message);
		}
	});

	setInterval(async () => {
		try {
			if (time.length > 0) {
				const now = new Date();
				const currentHour = now.getHours();
				const lastHour = parseInt(time[time.length - 1].split(":")[0], 10);
	
				await statusMessage.edit({
					embeds: [await generateStatusEmbed(currentHour !== lastHour)],
				});
			}
		} catch (error) {
			console.log('Произошла ошибка при обновлении сообщения:\n', error.message);
		};
	}, 300000);
});

async function createStatusMessage(statusChannel) {
    await clearOldMessages(statusChannel, 1);

    const statusMessage = await getLastMessage(statusChannel);
    if (statusMessage) {
        return statusMessage;
    }

    await clearOldMessages(statusChannel, 0);
    const embed = await generateStatusEmbed(true);

    const button = new ActionRowBuilder()
	.addComponents(
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
        console.log('Произошла ошибка при удалении старых сообщений:\n', error.message);
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
	  console.error('Произошла ошибка при получении последнего сообщения:\n', e.message);
	  return null;
	}
}  

async function generateStatusEmbed(update_graph = false) {
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
			debug: false,
		})
		try {
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
			
			client.user.setPresence({
				activities: [{ name: `✅ ${state.players.length} / ${state.maxplayers}`, type: 'PLAYING' }],
				status: 'online',
			});

			embed = new EmbedBuilder()
			.setTitle("Server online!")
			.setColor("#00CC00")
			.setImage(link)
			.addFields(
				{ name: "Address", value: `${'`' + DISPLAY_HOST + '`'}` },
				{
					name: "Port",
					value: "`" + DISPLAY_PORT + "`",
					inline: true,
				},
				{
					name: "Online:",
					value: `${'`' + state.players.length + " / " + state.maxplayers + '`'}` ,
					inline: true,
				}
			)
			.setFooter({ text: `${ticEmoji} Cool kids never sleep` })
			.setTimestamp();
		} catch (e) {
			client.user.setPresence({
				activities: [{ name: `🆘 1000-7`, type: 'WATCHING' }],
				status: 'dnd',
			});

			console.info('Произошла ошибка при создании сообщения:\n', e.message);

			embed = new EmbedBuilder()
			.setTitle("Server offline!")
			.setColor("#ff0000")
			.setDescription("Looks like admin have fucked up. Our team probably already working on this issue. If you don't think so, please contact the administration.")
			.setFooter({
				text: ticEmoji + " Even cool kids need to sleep",
			})
			.setTimestamp();
		}
	} catch (e) {
		client.user.setPresence({
			activities: [{ name: `🆘 1000-7`, type: 'WATCHING' }],
			status: 'dnd',
		});
		console.info('Произошла ошибка при создании сообщения 2:\n', e.message);
		embed = new EmbedBuilder()
		.setTitle("Server offline!")
		.setColor("#ff0000")
		.setDescription("Looks like admin have fucked up. Our team probably already working on this issue. If you don't think so, please contact the administration.")
		.setFooter({ text: ticEmoji + " Even cool kids need to sleep" })
		.setTimestamp();
	}
	return embed;
}

client.login(BOT_TOKEN);