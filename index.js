const { Client, GatewayIntentBits, PermissionsBitField, Events } = require('discord.js');
require('dotenv').config();
const token = process.env.DISCORD_TOKEN;

const Database = require("better-sqlite3");
const db = new Database("botdata.db");
const { EmbedBuilder } = require('discord.js');

// Crear tabla si no existe
db.prepare(`
    CREATE TABLE IF NOT EXISTS roblox_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discordId TEXT UNIQUE,
        robloxName TEXT,
        robloxLink TEXT
    )
`).run();

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

        if (command === "verifya") {
            rolesToAdd.push("🐇| Alianza");
        }

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
    if (command === "reg") {
    const args = message.content.split(" ");
    const username = args[1];
    const link = args[2];

    // Validación básica
    if (!username || !link) {
        return message.reply("❌ Uso correcto: `?reg <usuarioRoblox> <linkPerfil>`");
    }

    // Validar que el link sea un perfil de Roblox
    const regex = /^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/users\/\d+\/profile$/;
    if (!regex.test(link)) {
        return message.reply("❌ El link debe ser un perfil válido de Roblox (ejemplo: https://www.roblox.com/users/123456/profile).");
    }

    // Guardar o actualizar en la base de datos
    db.prepare("INSERT OR REPLACE INTO users (discord_id, roblox_username, roblox_link) VALUES (?, ?, ?)")
      .run(message.author.id, username, link);

    // Crear embed de confirmación
    const { EmbedBuilder } = require("discord.js");
    const embed = new EmbedBuilder()
        .setColor(0x00AE86) // Verde/Azul profesional
        .setTitle("✅ Registro actualizado")
        .setDescription(`Tu perfil de Roblox ha sido registrado correctamente.`)
        .addFields(
            { name: "Usuario Roblox", value: username, inline: true },
            { name: "Perfil", value: `[Ver perfil](${link})`, inline: true }
        )
        .setThumbnail("https://upload.wikimedia.org/wikipedia/commons/1/1b/Roblox_Logo_2022.png")
        .setFooter({ text: "Sistema de verificación Roblox" });

    return message.channel.send({ embeds: [embed] });
}


if (command === "help") {
    const userData = db.prepare(`
        SELECT robloxName, robloxLink FROM roblox_users WHERE discordId = ?
    `).get(message.author.id);

    if (!userData) {
        return message.reply("❌ No tienes un registro. Usa `?reg <roblox_user> <link>` primero.");
    }

    // Buscar el rol exacto
    const helpRole = message.guild.roles.cache.find(r => r.name === "Help Ping ִֶָ𓂃 ࣪˖ ִֶָ🐇་༘࿐");
    if (!helpRole) {
        return message.reply("⚠️ No encontré el rol **Help Ping ִֶָ𓂃 ࣪˖ ִֶָ🐇་༘࿐** en el servidor.");
    }

    // Enviar solicitud de ayuda
    return message.channel.send(
        `${helpRole}\n📢 ¡${message.author} necesita ayuda!\n👤 roblox_user: **${userData.robloxName}**\n🔗 Perfil: ${userData.robloxLink}`
    );
}
// Lista de comandos en formato embed
if (command === "info") {
    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle("📜 Lista de comandos disponibles")
        .setDescription("Aquí tienes todos los comandos que puedes usar con el bot:")
        .addFields(
            { name: "🏓 ?ping", value: "Responde con Pong!", inline: true },
            { name: "✅ ?verify @usuario", value: "Asigna roles base y quita 'No Verificado'.", inline: false },
            { name: "✅ ?verifya @usuario", value: "Roles base + 🐇| Alianza.", inline: false },
            { name: "✅ ?verifyla @usuario", value: "Roles base + 🐇| Alianza + | 𝐋𝐢𝐝𝐞𝐫 𝐀𝐥𝐥𝐲.", inline: false },
            { name: "👤 ?reg <roblox_user> <link>", value: "Registra tu nombre y perfil de Roblox.", inline: false },
            { name: "📢 ?help", value: "Pide ayuda en Roblox, pingueando al rol y mostrando tu registro.", inline: false },
            { name: "ℹ️ ?info", value: "Muestra esta lista de comandos.", inline: false }
        )
        .setThumbnail("https://upload.wikimedia.org/wikipedia/commons/6/6c/Roblox_Logo_2022.png") // 👈 Logo Roblox
        .setFooter({ text: "Bot de verificación y ayuda Roblox 🐇", iconURL: "https://cdn-icons-png.flaticon.com/512/616/616408.png" }); // 👈 Conejito

    return message.reply({ embeds: [embed] });
}


});

client.login(token);

