const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
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

client.once('clientReady', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;
    

    // Solo staff+ (ManageGuild) puede usarlo
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ No tienes permisos para usar este comando.");
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === "ping") {
        return message.reply("🏓 Pong!");
    }

    if (command === "verify") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Debes mencionar a un usuario. Ejemplo: `?verify @usuario`");

    // Roles que se van a añadir
    const rolesToAdd = ["⊹₊˚‧︵‿₊୨Popis Girls୧₊‿︵‧˚₊⊹", "Help Ping ִֶָ𓂃 ࣪˖ ִֶָ🐇་༘࿐", "⊹₊˚‧︵‿₊୨War Ping🐇୧₊‿︵‧˚₊⊹", "🐇| Revivan"];

    for (const roleName of rolesToAdd) {
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
            await user.roles.add(role).catch(err => console.log(err));
        } else {
            message.channel.send(`⚠️ El rol **${roleName}** no existe en el servidor.`);
        }
    }

    // Rol que se va a eliminar
    const roleToRemove = message.guild.roles.cache.find(r => r.name === "No Verificado");
    if (roleToRemove) {
        await user.roles.remove(roleToRemove).catch(err => console.log(err));
    }



        message.reply(`✅ Se han asignado los roles a ${user.user.tag}`);
    }
});

client.login(process.env.TOKEN);
