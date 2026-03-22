const { Client, GatewayIntentBits, PermissionsBitField, Events } = require('discord.js');
require('dotenv').config();
const token = process.env.DISCORD_TOKEN;

const Database = require("better-sqlite3");
const db = new Database("botdata.db");
const { EmbedBuilder } = require('discord.js');

// Crear tabla roblox_users si no existe
db.prepare(`
    CREATE TABLE IF NOT EXISTS roblox_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discordId TEXT UNIQUE,
        robloxName TEXT,
        robloxLink TEXT
    )
`).run();

// Crear tabla roles si no existe
db.prepare(`
    CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT,
    command TEXT,
    roleName TEXT
    );
`).run();

function addRoles(guildId, command, roles) {
    const stmt = db.prepare("INSERT INTO roles (guildId, command, roleName) VALUES (?, ?, ?)");
    for (const role of roles) {
        stmt.run(guildId, command, role);
    }
}

function getRoles(guildId, command) {
    const stmt = db.prepare("SELECT roleName FROM roles WHERE guildId = ? AND command = ?");
    return stmt.all(guildId, command).map(r => r.roleName);
}


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

    if (command === "addrole") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ No tienes permisos para usar este comando.");
    }

    const subCommand = args.shift();
    const roles = args;

    if (!subCommand || roles.length === 0) {
        return message.reply("Uso: ?addrole <verify|verifya|verifyla> <roles...>");
    }

    addRoles(message.guild.id, subCommand, roles);
    return message.reply(`✅ Roles añadidos a **${subCommand}** en este servidor: ${roles.join(", ")}`);
}

if (["verify", "verifya", "verifyla"].includes(command)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ No tienes permisos para usar este comando.");
    }

    const user = message.mentions.members.first();
    if (!user) return message.reply("Debes mencionar a un usuario. Ejemplo: `?verify @usuario`");

    const rolesToAdd = getRoles(message.guild.id, command);

    for (const roleName of rolesToAdd) {
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
            await user.roles.add(role).catch(err => console.log(err));
        } else {
            message.channel.send(`⚠️ El rol **${roleName}** no existe en este servidor.`);
        }
    }

    const roleToRemove = message.guild.roles.cache.find(r => r.name === "No Verificado");
    if (roleToRemove) {
        await user.roles.remove(roleToRemove).catch(err => console.log(err));
    }

    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle("✅ Verificación completada")
        .setDescription(`Se han asignado los roles configurados a **${user.user.tag}**`)
        .addFields(
            { name: "Roles añadidos", value: rolesToAdd.map(r => `• ${r}`).join("\n") }
        )
        .setThumbnail(user.user.displayAvatarURL())
        .setFooter({ text: "Sistema de verificación de roles 🐇" });

    return message.channel.send({ embeds: [embed] });
}


if (command === "listroles") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ No tienes permisos para usar este comando.");
    }

    const subCommand = args.shift();
    if (!subCommand) {
        return message.reply("Uso: ?listroles <verify|verifya|verifyla>");
    }

    const roles = getRoles(message.guild.id, subCommand);
    if (roles.length === 0) {
        return message.reply(`⚠️ No hay roles configurados para **${subCommand}** en este servidor.`);
    }

    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(`📜 Roles configurados para ${subCommand}`)
        .setDescription("Aquí tienes la lista de roles que se asignarán automáticamente:")
        .addFields(
            { name: "Roles", value: roles.map(r => `• ${r}`).join("\n") }
        )
        .setFooter({ text: "Sistema de verificación de roles 🐇" });

    return message.channel.send({ embeds: [embed] });
}

if (command === "removerole") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ No tienes permisos para usar este comando.");
    }

    const subCommand = args.shift();
    const roleToRemove = args.join(" ");

    if (!subCommand || !roleToRemove) {
        return message.reply("Uso: ?removerole <verify|verifya|verifyla> <rol>");
    }

    const stmt = db.prepare("DELETE FROM roles WHERE guildId = ? AND command = ? AND roleName = ?");
    const result = stmt.run(message.guild.id, subCommand, roleToRemove);

    if (result.changes === 0) {
        return message.reply(`⚠️ El rol **${roleToRemove}** no estaba configurado en **${subCommand}**.`);
    }

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🗑️ Rol eliminado")
        .setDescription(`El rol **${roleToRemove}** fue eliminado de la configuración de **${subCommand}**.`)
        .setFooter({ text: "Sistema de verificación de roles 🐇" });

    return message.channel.send({ embeds: [embed] });
}

if (command === "clearroles") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ No tienes permisos para usar este comando.");
    }

    const subCommand = args.shift();
    if (!subCommand) {
        return message.reply("Uso: ?clearroles <verify|verifya|verifyla>");
    }

    const stmt = db.prepare("DELETE FROM roles WHERE guildId = ? AND command = ?");
    const result = stmt.run(message.guild.id, subCommand);

    if (result.changes === 0) {
        return message.reply(`⚠️ No había roles configurados para **${subCommand}**.`);
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle("🧹 Roles limpiados")
        .setDescription(`Todos los roles configurados para **${subCommand}** han sido eliminados.`)
        .setFooter({ text: "Sistema de verificación de roles 🐇" });

    return message.channel.send({ embeds: [embed] });
}
  
if (command === "reg") {
    const args = message.content.split(" ");
    const username = args[1];
    const link = args[2];

    if (!username || !link) {
        return message.reply("❌ Uso correcto: `?reg <usuarioRoblox> <linkPerfil>`");
    }

    // Regex que acepta idioma opcional (/es/, /fr/, etc.)
    const regex = /^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/users\/\d+\/profile$/;
    if (!regex.test(link)) {
        return message.reply("❌ El link debe ser un perfil válido de Roblox (ejemplo: https://www.roblox.com/users/123456/profile).");
    }

    try {
        // Guardar en la tabla correcta
        db.prepare("INSERT OR REPLACE INTO roblox_users (discordId, robloxName, robloxLink) VALUES (?, ?, ?)")
          .run(message.author.id, username, link);

        // Embed de confirmación
        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("✅ Registro actualizado")
            .setDescription("Tu perfil de Roblox ha sido registrado correctamente.")
            .addFields(
                { name: "Usuario Roblox", value: username, inline: true },
                { name: "Perfil", value: `[Ver perfil](${link})`, inline: true }
            )
            .setThumbnail("https://upload.wikimedia.org/wikipedia/commons/1/1b/Roblox_Logo_2022.png")
            .setFooter({ text: "Sistema de verificación Roblox" });

        return message.channel.send({ embeds: [embed] });
    } catch (err) {
        console.error(err);
        return message.reply("⚠️ Hubo un error al guardar tu registro. Revisa la configuración de la base de datos.");
    }
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
    const pages = [
        new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("📜 Comandos básicos")
            .addFields(
                { name: "🏓 ?ping", value: "Responde con Pong!", inline: true },
                { name: "👤 ?reg <roblox_user> <link>", value: "Registra tu nombre y perfil de Roblox.", inline: false },
                { name: "📢 ?help", value: "Pide ayuda en Roblox, pingueando al rol y mostrando tu registro.", inline: false }
            )
            .setFooter({ text: "Página 1/3" }),

        new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("⚙️ Comandos de verificación")
            .addFields(
                { name: "✅ ?verify @usuario", value: "Asigna roles configurados para `verify`.", inline: false },
                { name: "✅ ?verifya @usuario", value: "Asigna roles configurados para `verifya`.", inline: false },
                { name: "✅ ?verifyla @usuario", value: "Asigna roles configurados para `verifyla`.", inline: false }
            )
            .setFooter({ text: "Página 2/3" }),

        new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("🛠️ Comandos de administración")
            .addFields(
                { name: "➕ ?addrole <verify|verifya|verifyla> <roles...>", value: "Agrega roles a la configuración.", inline: false },
                { name: "📜 ?listroles <verify|verifya|verifyla>", value: "Muestra roles configurados.", inline: false },
                { name: "🗑️ ?removerole <verify|verifya|verifyla> <rol>", value: "Elimina un rol específico.", inline: false },
                { name: "🧹 ?clearroles <verify|verifya|verifyla>", value: "Elimina todos los roles configurados.", inline: false }
            )
            .setFooter({ text: "Página 3/3" })
    ];

    let page = 0;

    const row = {
        type: 1,
        components: [
            {
                type: 2,
                style: 1,
                label: "⬅️",
                customId: "prev"
            },
            {
                type: 2,
                style: 1,
                label: "➡️",
                customId: "next"
            }
        ]
    };

    const msg = await message.channel.send({ embeds: [pages[page]], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: "❌ Solo quien ejecutó el comando puede usar los botones.", ephemeral: true });
        }

        if (i.customId === "prev") {
            page = page > 0 ? page - 1 : pages.length - 1;
        } else if (i.customId === "next") {
            page = page + 1 < pages.length ? page + 1 : 0;
        }

        await i.update({ embeds: [pages[page]], components: [row] });
    });
}



});

client.login(token);

