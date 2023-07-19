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

const { BOT_TOKEN, STATUS_CHANNEL, HOST, PORT, DISPLAY_HOST, DISPLAY_PORT } =
	process.env;

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
        await statusMessage.edit({ embeds: [await generateStatusEmbed()] });
    }, 300000);
});

async function createStatusMessage(statusChannel) {
	await clearOldMessages(statusChannel, 1);

	let statusMessage = await getLastMessage(statusChannel);
	if (statusMessage != undefined) {
		return statusMessage;
	}
	await clearOldMessages(statusChannel, 0);

	let embed = await generateStatusEmbed();
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
		.catch(function (error) {
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
		.catch(function (error) {
			return;
		});
}

async function generateStatusEmbed() {
	let embed;
    try{
        await Gamedig.query({
            type: "minecraftbe",
            host: HOST,
            port: PORT,
            maxAttempts: 1,
            socketTimeout: 1000,
            debug: false,
        })
            .then(async (state) => {
                embed = new EmbedBuilder()
                    .setTitle("Server online!")
                    .setColor("#00CC00")
                    .setImage(
                        "https://images-ext-1.discordapp.net/external/hJPm9Sl17p6eowUWiv6uUXOL6hmMxY6awkKe05KgNXw/%3Fc%3D%257Btype%253A%2527line%2527%252Cdata%253A%257Blabels%253A%255B%252719%253A9%2527%252C%252719%253A10%2527%252C%252719%253A11%2527%252C%252719%253A12%2527%252C%252719%253A13%2527%252C%252719%253A14%2527%252C%252719%253A15%2527%252C%252719%253A16%2527%252C%252719%253A17%2527%252C%252719%253A18%2527%252C%252719%253A19%2527%252C%252719%253A20%2527%252C%252719%253A21%2527%252C%252719%253A22%2527%252C%252719%253A23%2527%252C%252719%253A24%2527%252C%252719%253A25%2527%252C%252719%253A26%2527%252C%252719%253A27%2527%252C%252719%253A28%2527%252C%252719%253A29%2527%252C%252719%253A30%2527%252C%252719%253A31%2527%252C%252719%253A32%2527%252C%252719%253A33%2527%252C%252719%253A34%2527%252C%252719%253A35%2527%252C%252719%253A36%2527%252C%252719%253A37%2527%252C%252719%253A38%2527%252C%252719%253A39%2527%252C%252719%253A40%2527%252C%252719%253A41%2527%252C%252719%253A42%2527%252C%252719%253A43%2527%252C%252719%253A44%2527%252C%252719%253A45%2527%252C%252719%253A46%2527%252C%252719%253A47%2527%252C%252719%253A48%2527%255D%252Cdatasets%253A%255B%257Blabel%253A%2527%25D0%25BE%25D0%25BD%25D0%25BB%25D0%25B0%25D0%25B9%25D0%25BD%2B%25D0%25B8%25D0%25B3%25D1%2580%25D0%25BE%25D0%25BA%25D0%25BE%25D0%25B2%2527%252Cdata%253A%255B1%252C1%252C2%252C2%252C2%252C2%252C2%252C2%252C2%252C2%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C1%252C2%252C2%252C2%252C2%252C2%252C2%252C2%252C2%252C2%252C2%252C1%252C1%252C2%255D%257D%255D%257D%257D%26w%3D800%26h%3D400%26bkg%3D%2523ffffff%26f%3Dpng%26v%3D2.9.4/https/quickchart.io/chart?width=1342&height=671"
                    )
                    .addFields(
                        { name: "Address", value: "`" + DISPLAY_HOST + "`" },
                        { name: "Port", value: "`" + DISPLAY_PORT + "`", inline: true },
                        { name: "Online:", value: "`" + state.players.length + " / " + state.maxplayers + "`", inline: true }
                    )
                    .setFooter({ text: "Cool kids never sleep" })
                    .setTimestamp();
            })
            .catch(async (e) => {
                embed = new EmbedBuilder()
                    .setTitle("Server offline!")
                    .setColor("#ff0000")
                    .setDescription(
                        "Looks like admin have fucked up. Our team probably already working on this issue. If you don't think so, please contact the administration."
                    )
                    .setFooter({ text: "Even cool kids need to sleep" })
                    .setTimestamp();
            });
    }
    catch(e){
        embed = new EmbedBuilder()
        .setTitle("Server offline!")
        .setColor("#ff0000")
        .setDescription(
            "Looks like admin have fucked up. Our team probably already working on this issue. If you don't think so, please contact the administration."
        )
        .setFooter({ text: "Even cool kids need to sleep" })
        .setTimestamp();
    }
	return embed;
}

client.login(BOT_TOKEN);
