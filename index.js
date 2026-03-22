const { Client, GatewayIntentBits, PermissionsBitField, Events, EmbedBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const { Pool } = require("pg");
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Crear tablas si no existen
(async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS roblox_users (
            discordId TEXT PRIMARY KEY,
            robloxName TEXT,
            robloxLink TEXT
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            guildId TEXT,
            command TEXT,
            roleName TEXT
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
            guildId TEXT PRIMARY KEY,
            helpRoleId TEXT
        );
    `);
})();

async function addRoles(guildId, command, roles) {
    for (const role of roles) {
        await pool.query("INSERT INTO roles (guildId, command, roleName) VALUES ($1, $2, $3)", [guildId, command, role]);
    }
}

async function getRoles(guildId, command) {
    const res = await pool.query(
        'SELECT roleName AS "roleName" FROM roles WHERE guildId = $1 AND command = $2',
        [guildId, command]
    );
    return res.rows.map(r => r.roleName);
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

// Slash commands definition
const commands = [
    {
        name: "reg",
        description: "Registrar tu perfil de Roblox",
        options: [
            { name: "usuario", type: 3, description: "Nombre de usuario Roblox", required: true },
            { name: "link", type: 3, description: "Link al perfil Roblox", required: true }
        ]
    },
    {
    name: "addrole",
    description: "Agregar roles a un subcomando",
    options: [
        { name: "subcomando", type: 3, description: "verify | verifya | verifyla", required: true },
        { name: "roles", type: 3, description: "Lista de roles separados por coma", required: true },
        { name: "roleseliminar", type: 3, description: "Lista de roles a eliminar separados por coma", required: false } // 👈 nuevo
    ]
    },
    {
        name: "removerole",
        description: "Eliminar un rol de un subcomando",
        options: [
            { name: "subcomando", type: 3, description: "verify | verifya | verifyla", required: true },
            { name: "rol", type: 3, description: "Nombre del rol a eliminar", required: true }
        ]
    },
    {
        name: "clearroles",
        description: "Eliminar todos los roles de un subcomando",
        options: [
            { name: "subcomando", type: 3, description: "verify | verifya | verifyla", required: true }
        ]
    },
    {
        name: "sethelprole",
        description: "Configurar el rol para ?help",
        options: [
            { name: "rol", type: 8, description: "Selecciona un rol", required: true }
        ]
    }
];

// Registrar slash commands
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
})();

client.once(Events.ClientReady, (c) => {
    console.log(`Bot conectado como ${c.user.tag}`);
});

// Slash command handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === "reg") {
        const username = interaction.options.getString("usuario");
        const link = interaction.options.getString("link");
        const regex = /^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/users\/\d+\/profile(\?.*)?$/;
        if (!regex.test(link)) return interaction.reply({ content: "❌ Link inválido.", ephemeral: true });

        await pool.query(`
            INSERT INTO roblox_users (discordId, robloxName, robloxLink)
            VALUES ($1, $2, $3)
            ON CONFLICT (discordId) DO UPDATE SET robloxName = $2, robloxLink = $3
        `, [interaction.user.id, username, link]);

        return interaction.reply({ content: `✅ Registro actualizado para ${username}`, ephemeral: true });
    }

    if (commandName === "sethelprole") {
    if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator))  {
        return interaction.reply({ content: "❌ Solo los administradores pueden usar este comando.", ephemeral: true });
    }
    const role = interaction.options.getRole("rol");
    await pool.query(`
        INSERT INTO settings (guildId, helpRoleId)
        VALUES ($1, $2)
        ON CONFLICT (guildId) DO UPDATE SET helpRoleId = $2
    `, [interaction.guild.id, role.id]);
    return interaction.reply({ content: `✅ Rol de ayuda configurado: ${role.name}`, ephemeral: true });
}


    const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addrole")
        .setDescription("Configura roles para verificación")
        .addStringOption(option =>
            option.setName("subcomando")
                .setDescription("El subcomando de verificación (verify, verifya, verifyla)")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("roles")
                .setDescription("Roles a añadir (separados por coma)")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("roleseliminar")
                .setDescription("Roles a eliminar (separados por coma)")
                .setRequired(false)), // 👈 opcional

    async execute(interaction) {
        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Solo los administradores pueden usar este comando.", ephemeral: true });
        }

        const subCommand = interaction.options.getString("subcomando");
        const rolesToAdd = interaction.options.getString("roles")
            .split(",")
            .map(r => r.trim())
            .filter(r => r.length > 0);

        const rolesToRemove = interaction.options.getString("roleseliminar")
            ?.split(",")
            .map(r => r.trim())
            .filter(r => r.length > 0) || [];

        const validCommands = ["verify", "verifya", "verifyla"];
        if (!validCommands.includes(subCommand)) {
            return interaction.reply({ content: "❌ Subcomando inválido.", ephemeral: true });
        }

        // Guardar roles en la base de datos (ahora como objeto con add/remove)
        await addRoles(interaction.guild.id, subCommand, { add: rolesToAdd, remove: rolesToRemove });

        return interaction.reply({ 
            content: `✅ Roles añadidos a ${subCommand}: ${rolesToAdd.join(", ")}`
                   + (rolesToRemove.length > 0 ? `\n🗑️ Roles que se quitarán: ${rolesToRemove.join(", ")}` : ""),
            ephemeral: true 
        });
    }
};

if (commandName === "removerole") {
    if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Solo los administradores pueden usar este comando.", ephemeral: true });
    }

    const subCommand = interaction.options.getString("subcomando");
    const roleToRemove = interaction.options.getString("rol");

    const result = await pool.query(
        'DELETE FROM roles WHERE guildId = $1 AND command = $2 AND roleName = $3',
        [interaction.guild.id, subCommand, roleToRemove]
    );

    if (result.rowCount === 0) {
        return interaction.reply({ content: `⚠️ El rol ${roleToRemove} no estaba configurado en ${subCommand}.`, ephemeral: true });
    }

    return interaction.reply({ content: `🗑️ Rol eliminado: ${roleToRemove}`, ephemeral: true });
}

if (commandName === "clearroles") {
    if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Solo los administradores pueden usar este comando.", ephemeral: true });
    }

    const subCommand = interaction.options.getString("subcomando");

    const result = await pool.query(
        'DELETE FROM roles WHERE guildId = $1 AND command = $2',
        [interaction.guild.id, subCommand]
    );

    if (result.rowCount === 0) {
        return interaction.reply({ content: `⚠️ No había roles configurados para ${subCommand}.`, ephemeral: true });
    }

    return interaction.reply({ content: `🧹 Roles limpiados para ${subCommand}`, ephemeral: true });
}
});

// Prefijo commands
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "help") {
    // Buscar configuración del rol de ayuda en la tabla settings
    const res = await pool.query(
        'SELECT helpRoleId AS "helpRoleId" FROM settings WHERE guildId = $1',
        [message.guild.id]
    );
    if (res.rowCount === 0) {
        return message.reply("⚠️ No se ha configurado un rol de ayuda. Usa `/sethelprole`.");
    }

    const helpRoleId = res.rows[0].helpRoleId;
    const helpRole = message.guild.roles.cache.get(helpRoleId);
    if (!helpRole) {
        return message.reply("⚠️ El rol configurado ya no existe en el servidor.");
    }

    // Buscar datos del usuario en la tabla roblox_users
    const userRes = await pool.query(
        'SELECT robloxName AS "robloxName", robloxLink AS "robloxLink" FROM roblox_users WHERE discordId = $1',
        [message.author.id]
    );
    if (userRes.rowCount === 0) {
        return message.reply("❌ No tienes un registro. Usa `/reg` primero.");
    }

    const userData = userRes.rows[0];

    // Enviar mensaje de ayuda al canal
    return message.channel.send(
        `${helpRole}\n📢 ¡${message.author} necesita ayuda!\n👤 Roblox User: **${userData.robloxName}**\n🔗 Perfil: ${userData.robloxLink}`
    );
}


    if (command === "info") {
    const pages = [
        new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("📜 Comandos básicos")
            .addFields(
                { name: "🏓 ?ping", value: "Responde con Pong!", inline: true },
                { name: "👤 /reg <usuario> <link>", value: "Registra tu nombre y perfil de Roblox.", inline: false },
                { name: "📢 ?help", value: "Pide ayuda en Roblox, pingueando al rol configurado y mostrando tu registro.", inline: false }
            )
            .setFooter({ text: "Página 1/4" }),

        new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("⚙️ Comandos de verificación")
            .addFields(
                { name: "✅ ?verify @usuario", value: "Asigna roles configurados para `verify`.", inline: false },
                { name: "✅ ?verifya @usuario", value: "Asigna roles configurados para `verifya`.", inline: false },
                { name: "✅ ?verifyla @usuario", value: "Asigna roles configurados para `verifyla`.", inline: false }
            )
            .setFooter({ text: "Página 2/4" }),

        new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("🛠️ Comandos de administración (slash)")
            .addFields(
                { name: "➕ /addrole <subcomando> <roles>", value: "Agrega roles a la configuración.", inline: false },
                { name: "📜 /removerole <subcomando> <rol>", value: "Elimina un rol específico.", inline: false },
                { name: "🧹 /clearroles <subcomando>", value: "Elimina todos los roles configurados.", inline: false },
                { name: "⚙️ /sethelprole <rol>", value: "Configura el rol que se usará en `?help`.", inline: false }
            )
            .setFooter({ text: "Página 3/4" }),

        new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle("ℹ️ Información")
            .setDescription("Este bot combina comandos clásicos con prefijo y nuevos slash commands para administración.")
            .setFooter({ text: "Página 4/4" })
    ];

    let page = 0;
    const row = {
        type: 1,
        components: [
            { type: 2, style: 1, label: "⬅️", customId: "prev" },
            { type: 2, style: 1, label: "➡️", customId: "next" }
        ]
    };

    const msg = await message.channel.send({ embeds: [pages[page]], components: [row] });
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: "❌ Solo quien ejecutó el comando puede usar los botones.", ephemeral: true });
        }
        if (i.customId === "prev") page = page > 0 ? page - 1 : pages.length - 1;
        else if (i.customId === "next") page = page + 1 < pages.length ? page + 1 : 0;
        await i.update({ embeds: [pages[page]], components: [row] });
    });
}

    if (command === "ping") {
    return message.reply("🏓 Pong!");
    }
    if (command === "userinfo") {
    let targetUser = message.author;

    // Si se menciona a alguien, usar ese usuario
    if (message.mentions.members.size) {
        targetUser = message.mentions.members.first().user;
    }

    // Buscar datos del usuario en la tabla roblox_users
    const userRes = await pool.query(
        'SELECT robloxName AS "robloxName", robloxLink AS "robloxLink" FROM roblox_users WHERE discordId = $1',
        [targetUser.id]
    );

    if (userRes.rowCount === 0) {
        return message.reply(`❌ ${targetUser.id === message.author.id 
            ? "No tienes un registro. Usa `/reg` primero." 
            : `El usuario ${targetUser.tag} no tiene un registro.`}`);
    }

    const userData = userRes.rows[0];

    // Crear embed con la información del usuario
    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle("👤 Información de registro")
        .addFields(
            { name: "Usuario de Roblox", value: userData.robloxName, inline: true },
            { name: "Perfil", value: userData.robloxLink, inline: false }
        )
        .setFooter({ text: `Solicitado por ${message.author.tag}` });

    return message.channel.send({ embeds: [embed] });
}

    if (["verify", "verifya", "verifyla"].includes(command)) {
    if (!message.mentions.members.size) 
        return message.reply("❌ Debes mencionar al usuario. Ejemplo: `?verify @usuario`");

    const member = message.mentions.members.first();
    const { add: rolesToAdd = [], remove: rolesToRemove = [] } = await getRoles(message.guild.id, command) || {};

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
        return message.reply(`⚠️ No hay roles configurados para **${command}** en este servidor.`);
    }

    // Asignar roles configurados
    for (const roleName of rolesToAdd) {
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (role) await member.roles.add(role);
    }

    // Eliminar roles configurados
    for (const roleName of rolesToRemove) {
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (role && member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
        }
    }

    // Embed de confirmación
    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle("✅ Verificación completada")
        .setDescription(`Se aplicaron los cambios de roles para **${command}** a ${member.user.tag}.`)
        .addFields(
            rolesToAdd.length > 0 ? { name: "Roles asignados", value: rolesToAdd.map(r => `• ${r}`).join("\n") } : null,
            rolesToRemove.length > 0 ? { name: "Roles eliminados", value: rolesToRemove.map(r => `• ${r}`).join("\n") } : null
        ).fields.filter(Boolean);

    return message.channel.send({ embeds: [embed] });
}

});

client.login(token);
