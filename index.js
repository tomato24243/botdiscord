const { Client, GatewayIntentBits, PermissionsBitField, Events } = require('discord.js');
require('dotenv').config();
const token = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const prefix = "?";

// Aquí usamos Events.ClientReady en lugar de 'clientReady'
client.once(Events.ClientReady, (c) => {
    console.log(`Bot conectado como ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "ping") {
        return message.reply("🏓 Pong!");
    }

    if (command === "verify" || command === "verifya" || command === "verifyla") {
        // Solo staff+ (ManageGuild) puede usarlo
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return message.reply("❌ No tienes permisos para usar este comando.");
        }

        const user = message.mentions.members.first();
        if (!user) return message.reply("Debes mencionar a un usuario. Ejemplo: `?verify @usuario`");

        // Roles base
        const rolesToAdd = [
            "⊹₊˚‧︵‿₊୨Popis Girls୧₊‿︵‧˚₊⊹",
            "Help Ping ִֶָ𓂃 ࣪˖ ִֶָ🐇་༘࿐",
            "⊹₊˚‧︵‿₊୨War Ping🐇୧₊‿︵‧˚₊⊹",
            "🐇| Revivan"
        ];

        // Si es verifyaliado, añadimos Alianza
        if (command === "verifya") {
            rolesToAdd.push("🐇| Alianza");
        }

        // Si es verifyLA, añadimos Alianza + Líder Ally
        if (command === "verifyla") {
            rolesToAdd.push("🐇| Alianza");
            rolesToAdd.push("| 𝐋𝐢𝐝𝐞𝐫 𝐀𝐥𝐥𝐲");
        }

        for (const roleName of rolesToAdd) {
            const role = message.guild.roles.cache.find(r => r.name === roleName);
            if (role) {
                await user.roles.add(role).catch(err => console.log(err));
            } else {
                message.channel.send(`⚠️ El rol **${roleName}** no existe en el servidor.`);
            }
        }

        const roleToRemove = message.guild.roles.cache.find(r => r.name === "No Verificado");
        if (roleToRemove) {
            await user.roles.remove(roleToRemove).catch(err => console.log(err));
        }

        return message.reply(`✅ Se han asignado los roles a ${user.user.tag}`);
    }
});


client.login(token);

