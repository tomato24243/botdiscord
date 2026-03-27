// Importar dependencias
const { Client, GatewayIntentBits, PermissionsBitField, Events, REST, Routes, EmbedBuilder } = require("discord.js");
require("dotenv").config();
const { Pool } = require("pg");

// Variables de entorno
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Crear tablas si no existen
(async () => {
    try {
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
                guildId TEXT NOT NULL,
                command TEXT NOT NULL,
                roleId TEXT NOT NULL,
                action TEXT CHECK (action IN ('add','remove')) NOT NULL,
                UNIQUE (guildId, command, roleId, action)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                guildId TEXT PRIMARY KEY,
                helpRoleId TEXT
            );
        `);

        console.log("✅ Tablas verificadas/creadas.");
    } catch (err) {
        console.error("❌ Error al crear tablas:", err);
    }
})();

// Funciones auxiliares
async function addRoles(guildId, command, rolesToAdd = [], rolesToRemove = []) {
    for (const roleId of rolesToAdd) {
        await pool.query(
            `INSERT INTO roles (guildId, command, roleId, action)
             VALUES ($1, $2, $3, 'add')
             ON CONFLICT DO NOTHING`,
            [guildId, command, roleId]
        );
    }
    for (const roleId of rolesToRemove) {
        await pool.query(
            `INSERT INTO roles (guildId, command, roleId, action)
             VALUES ($1, $2, $3, 'remove')
             ON CONFLICT DO NOTHING`,
            [guildId, command, roleId]
        );
    }
}

async function getRoles(guildId, command) {
    const res = await pool.query(
        `SELECT roleId, action FROM roles WHERE guildId = $1 AND command = $2`,
        [guildId, command]
    );
    return {
        add: res.rows.filter(r => r.action === 'add').map(r => r.roleId),
        remove: res.rows.filter(r => r.action === 'remove').map(r => r.roleId)
    };
}

// Inicializar cliente
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Definición de slash commands
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
            { name: "roleseliminar", type: 3, description: "Lista de roles a eliminar separados por coma", required: false }
        ]
    },
    {
        name: "removerole",
        description: "Eliminar un rol de un subcomando",
        options: [
            { name: "subcomando", type: 3, description: "verify | verifya | verifyla", required: true },
            { name: "rol", type: 3, description: "Rol a eliminar (ID o mención)", required: true }
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
// Registrar slash commands en Discord

(async () => {
    try {
        console.log("📡 Registrando slash commands...");
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        console.log("✅ Slash commands registrados correctamente.");
    } catch (err) {
        console.error("❌ Error al registrar slash commands:", err);
    }
})();

// Handler de slash commands
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // /reg → Registrar perfil de Roblox
    if (commandName === "reg") {
        const username = interaction.options.getString("usuario");
        const link = interaction.options.getString("link");

        const regex = /^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/users\/\d+\/profile(\?.*)?$/;
        if (!regex.test(link)) {
            return interaction.reply("❌ Link inválido.");
        }

        await pool.query(`
            INSERT INTO roblox_users (discordId, robloxName, robloxLink)
            VALUES ($1, $2, $3)
            ON CONFLICT (discordId) DO UPDATE SET robloxName = $2, robloxLink = $3
        `, [interaction.user.id, username, link]);

        return interaction.reply(`✅ Registro actualizado para ${username}`);
    }

    // /sethelprole → Configurar rol de ayuda
    if (commandName === "sethelprole") {
        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply("❌ Solo los administradores pueden usar este comando.");
        }

        const role = interaction.options.getRole("rol");
        await pool.query(`
            INSERT INTO settings (guildId, helpRoleId)
            VALUES ($1, $2)
            ON CONFLICT (guildId) DO UPDATE SET helpRoleId = $2
        `, [interaction.guild.id, role.id]);

        return interaction.reply(`✅ Rol de ayuda configurado: ${role.name}`);
    }

    // /addrole → Agregar roles a un subcomando
    if (commandName === "addrole") {
        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply("❌ Solo los administradores pueden usar este comando.");
        }

        const subCommand = interaction.options.getString("subcomando");
        const validCommands = ["verify", "verifya", "verifyla"];
        if (!validCommands.includes(subCommand)) {
            return interaction.reply("❌ Subcomando inválido.");
        }

        const rolesToAdd = interaction.options.getString("roles")
            .split(",")
            .map(r => r.trim().replace(/<@&(\d+)>/, "$1"))
            .filter(r => r.length > 0);

        const rolesToRemove = interaction.options.getString("roleseliminar")
            ?.split(",")
            .map(r => r.trim().replace(/<@&(\d+)>/, "$1"))
            .filter(r => r.length > 0) || [];

        await addRoles(interaction.guild.id, subCommand, rolesToAdd, rolesToRemove);

        return interaction.reply(`✅ Roles procesados para ${subCommand}`);
    }

    // /removerole → Eliminar un rol específico
    if (commandName === "removerole") {
        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply("❌ Solo los administradores pueden usar este comando.");
        }

        const subCommand = interaction.options.getString("subcomando");
        const roleToRemove = interaction.options.getString("rol").replace(/<@&(\d+)>/, "$1");

        const result = await pool.query(
            `DELETE FROM roles WHERE guildId = $1 AND command = $2 AND roleId = $3`,
            [interaction.guild.id, subCommand, roleToRemove]
        );

        if (result.rowCount === 0) {
            return interaction.reply(`⚠️ El rol no estaba configurado en ${subCommand}.`);
        }

        return interaction.reply(`🗑️ Rol eliminado de ${subCommand}`);
    }

    // /clearroles → Eliminar todos los roles de un subcomando
    if (commandName === "clearroles") {
        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply("❌ Solo los administradores pueden usar este comando.");
        }

        const subCommand = interaction.options.getString("subcomando");
        const result = await pool.query(
            `DELETE FROM roles WHERE guildId = $1 AND command = $2`,
            [interaction.guild.id, subCommand]
        );

        if (result.rowCount === 0) {
            return interaction.reply(`⚠️ No había roles configurados para ${subCommand}.`);
        }

        return interaction.reply(`🧹 Roles limpiados para ${subCommand}`);
    }
});
// Definición del prefijo
const prefix = "?";

// Handler de comandos con prefijo
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ?ping → Responde Pong!
    if (command === "ping") {
        return message.reply("🏓 Pong!");
    }

    // ?help → Pide ayuda en Roblox
    if (command === "help") {
        const res = await pool.query(
            `SELECT helpRoleId FROM settings WHERE guildId = $1`,
            [message.guild.id]
        );

        if (res.rowCount === 0) {
            return message.reply("⚠️ No se ha configurado un rol de ayuda. Usa `/sethelprole`.");
        }

        const helpRoleId = res.rows[0].helproleid;
        const helpRole = message.guild.roles.cache.get(helpRoleId);
        if (!helpRole) {
            return message.reply("⚠️ El rol configurado ya no existe en el servidor.");
        }

        const userRes = await pool.query(
            `SELECT robloxName, robloxLink FROM roblox_users WHERE discordId = $1`,
            [message.author.id]
        );

        if (userRes.rowCount === 0) {
            return message.reply("❌ No tienes un registro. Usa `/reg` primero.");
        }

        const userData = userRes.rows[0];

        return message.channel.send(
            `${helpRole}\n📢 ¡${message.author} necesita ayuda!\n👤 Roblox User: **${userData.robloxname}**\n🔗 Perfil: ${userData.robloxlink}`
        );
    }

    // ?userinfo → Muestra información de registro
    if (command === "userinfo") {
        let targetUser = message.author;
        if (message.mentions.members.size) {
            targetUser = message.mentions.members.first().user;
        }

        const userRes = await pool.query(
            `SELECT robloxName, robloxLink FROM roblox_users WHERE discordId = $1`,
            [targetUser.id]
        );

        if (userRes.rowCount === 0) {
            return message.reply(`❌ ${targetUser.id === message.author.id 
                ? "No tienes un registro. Usa `/reg` primero." 
                : `El usuario ${targetUser.tag} no tiene un registro.`}`);
        }

        const userData = userRes.rows[0];

        return message.channel.send({
            embeds: [{
                color: 0x00AE86,
                title: "👤 Información de registro",
                fields: [
                    { name: "Usuario de Roblox", value: userData.robloxname, inline: true },
                    { name: "Perfil", value: userData.robloxlink, inline: false }
                ],
                footer: { text: `Solicitado por ${message.author.tag}` }
            }]
        });
    }

    // ?verify, ?verifya, ?verifyla → Asignar/eliminar roles configurados
    if (["verify", "verifya", "verifyla"].includes(command)) {
        if (!message.mentions.members.size) {
            return message.reply("❌ Debes mencionar al usuario. Ejemplo: `?verify @usuario`");
        }

        const member = message.mentions.members.first();
        const { add: rolesToAdd = [], remove: rolesToRemove = [] } = await getRoles(message.guild.id, command);

        if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
            return message.reply(`⚠️ No hay roles configurados para **${command}** en este servidor.`);
        }

        for (const roleId of rolesToAdd) {
            const role = message.guild.roles.cache.get(roleId);
            if (role) await member.roles.add(role);
        }

        for (const roleId of rolesToRemove) {
            const role = message.guild.roles.cache.get(roleId);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
            }
        }

        return message.channel.send({
            embeds: [{
                color: 0x00AE86,
                title: "✅ Verificación completada",
                description: `Se aplicaron los cambios de roles para **${command}** a ${member.user.tag}.`,
                fields: [
                    ...(rolesToAdd.length > 0 ? [{ name: "Roles asignados", value: rolesToAdd.map(id => message.guild.roles.cache.get(id)?.name || id).join("\n") }] : []),
                    ...(rolesToRemove.length > 0 ? [{ name: "Roles eliminados", value: rolesToRemove.map(id => message.guild.roles.cache.get(id)?.name || id).join("\n") }] : [])
                ]
            }]
        });
    }

    // ?info → Paginación de comandos
    if (command === "info") {
        const pages = [
            new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("📜 Comandos básicos")
                .setDescription("Estos son los comandos principales que puedes usar:")
                .addFields(
                    { name: "🏓 ?ping", value: "Responde con Pong!", inline: true },
                    { name: "👤 /reg <usuario> <link>", value: "Registra tu nombre y perfil de Roblox.", inline: false },
                    { name: "📢 ?help", value: "Pide ayuda en Roblox, pingueando al rol configurado y mostrando tu registro.", inline: false }
                )
                .setFooter({ text: "Página 1/4" }),

            new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("⚙️ Comandos de verificación")
                .setDescription("Estos comandos asignan o eliminan roles configurados:")
                .addFields(
                    { name: "✅ ?verify @usuario", value: "Asigna roles configurados para `verify`.", inline: false },
                    { name: "✅ ?verifya @usuario", value: "Asigna roles configurados para `verifya`.", inline: false },
                    { name: "✅ ?verifyla @usuario", value: "Asigna roles configurados para `verifyla`.", inline: false }
                )
                .setFooter({ text: "Página 2/4" }),

            new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle("ℹ️ Información general")
                .setDescription("Este bot combina comandos clásicos con prefijo y nuevos slash commands para administración.\n\n✨ Diseñado para facilitar la gestión de roles y registros de Roblox.")
                .setFooter({ text: "Página 3/4" }),

            new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle("🛠️ Comandos de administración")
                .setDescription("Solo administradores pueden usar estos comandos:")
                .addFields(
                    { name: "➕ /addrole <subcomando> <roles>", value: "Agrega roles a la configuración.", inline: false },
                    { name: "📜 /removerole <subcomando> <rol>", value: "Elimina un rol específico.", inline: false },
                    { name: "🧹 /clearroles <subcomando>", value: "Elimina todos los roles configurados.", inline: false },
                    { name: "⚙️ /sethelprole <rol>", value: "Configura el rol que se usará en `?help`.", inline: false }
                )
                .setFooter({ text: "Página 4/4" })
        ];

        let page = 0;
        const row = {
            type: 1,
            components: [
                { type: 2, style: 1, label: "⬅️ Anterior", customId: "prev" },
                { type: 2, style: 1, label: "➡️ Siguiente", customId: "next" }
            ]
        };

        const msg = await message.channel.send({ embeds: [pages[page]], components: [row] });
        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: "❌ Solo quien ejecutó el comando puede usar los botones." });
            }
            if (i.customId === "prev") page = page > 0 ? page - 1 : pages.length - 1;
            else if (i.customId === "next") page = page + 1 < pages.length ? page + 1 : 0;
            await i.update({ embeds: [pages[page]], components: [row] });
        });
    }
});
// Eventos finales
client.once(Events.ClientReady, (c) => {
    console.log(`✅ Bot conectado como ${c.user.tag}`);
});

// Captura de errores no manejados
process.on("unhandledRejection", (error) => {
    console.error("❌ Error no manejado:", error);
});

// Log de slash commands recibidos
client.on(Events.InteractionCreate, (interaction) => {
    if (interaction.isChatInputCommand()) {
        console.log(`📥 Slash command recibido: ${interaction.commandName}`);
    }
});

// Log de comandos con prefijo recibidos
client.on(Events.MessageCreate, (message) => {
    if (!message.author.bot && message.content.startsWith(prefix)) {
        console.log(`💬 Prefijo command recibido: ${message.content}`);
    }
});

// Iniciar sesión del bot
client.login(token);