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


pool.connect();

// exporta el pool para usarlo en otros archivos
module.exports = pool;

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
            CREATE TABLE IF NOT EXISTS trivia_scores (
                guild_id TEXT,
                user_id TEXT,
                points INTEGER DEFAULT 0,
                PRIMARY KEY (guild_id, user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                guildId TEXT NOT NULL,
                command TEXT NOT NULL,
                roleId TEXT NOT NULL,
                action TEXT NOT NULL CHECK (action IN ('add','remove')),
                CONSTRAINT unique_role_entry UNIQUE (guildId, command, roleId, action)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                guildId TEXT PRIMARY KEY,
                helpRoleId TEXT
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS moderation_settings (
            guildId TEXT PRIMARY KEY,
            logChannelId TEXT,
            spamThreshold INT DEFAULT 15,   -- antes estaba en 5
            timeoutDuration INT DEFAULT 10  -- minutos
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
             ON CONFLICT (guildId, command, roleId, action) DO NOTHING`,
            [guildId, command, roleId]
        );
    }

    for (const roleId of rolesToRemove) {
        await pool.query(
            `INSERT INTO roles (guildId, command, roleId, action)
             VALUES ($1, $2, $3, 'remove')
             ON CONFLICT (guildId, command, roleId, action) DO NOTHING`,
            [guildId, command, roleId]
        );
    }
}

async function getRoles(guildId, command) {
    const res = await pool.query(
        `SELECT roleId, action FROM roles WHERE guildId = $1 AND command = $2`,
        [guildId, command]
    );

    const add = res.rows
        .filter(r => r.action === 'add')
        .map(r => r.roleid);

    const remove = res.rows
        .filter(r => r.action === 'remove')
        .map(r => r.roleid);

    return { add, remove };
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
// Crear instancia de REST
const rest = new REST({ version: '10' }).setToken(token);

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
  description: "Registrar roles para un subcomando",
  options: [
    {
      name: "subcomando",
      type: 3, // STRING
      description: "verify | verifya | verifyla",
      required: true
    },
    {
      name: "roles",
      type: 3, // STRING
      description: "Lista de roles separados por coma",
      required: true
    },
    {
      name: "roleseliminar",
      type: 3, // STRING
      description: "Lista de roles a eliminar separados por coma",
      required: false
    }
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
    },
    {
        name: "unreg",
        description: "Eliminar tu registro de Roblox"
    },
    {
        name: "setlogchannel",
        description: "Configurar canal de logs de moderación",
        options: [
            { name: "canal", type: 7, description: "Selecciona un canal", required: true }
        ]
    },
    {
        name: "setspamconfig",
        description: "Configurar umbral y duración del anti-spam",
        options: [
            { name: "umbral", type: 4, description: "Mensajes permitidos en 10s", required: true },
            { name: "duracion", type: 4, description: "Duración del timeout en minutos", required: true }
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

    // Validar nombre de usuario (solo letras, números y espacios, entre 3 y 20 caracteres)
    const usernameRegex = /^[a-zA-Z0-9 ]+$/;
    if (!usernameRegex.test(username)) {
        return interaction.reply("❌ Nombre inválido. Solo se permiten letras, números y espacios.");
    }
    if (username.length < 3 || username.length > 20) {
        return interaction.reply("❌ El nombre debe tener entre 3 y 20 caracteres.");
    }

    // Validar link de Roblox
    const regex = /^https:\/\/www\.roblox\.com(\/[a-z]{2})?\/users\/\d+\/profile(\?.*)?$/;
    if (!regex.test(link)) {
        return interaction.reply("❌ Link inválido. Debe ser un perfil de Roblox.");
    }

    // Insertar/actualizar registro en la base de datos
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

    // Roles a añadir
    const rolesToAdd = interaction.options.getString("roles")
        .split(",")
        .map(r => r.trim())
        .map(r => r.replace(/<@&(\d+)>/, "$1")) // acepta menciones
        .filter(roleId => /^\d+$/.test(roleId)); // solo números

    // Roles a eliminar
    const rolesToRemove = interaction.options.getString("roleseliminar")
        ?.split(",")
        .map(r => r.trim())
        .map(r => r.replace(/<@&(\d+)>/, "$1"))
        .filter(roleId => /^\d+$/.test(roleId)) || [];

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
        return interaction.reply("⚠️ No se proporcionaron roles válidos.");
    }

    // Guardar en la BD
    await addRoles(interaction.guild.id, subCommand, rolesToAdd, rolesToRemove);

    // Embed de confirmación
    const embed = new EmbedBuilder()
        .setTitle("📋 Roles registrados")
        .setColor(0x00AE86)
        .addFields(
            { name: "Roles a añadir", value: rolesToAdd.length ? rolesToAdd.map(id => `<@&${id}>`).join(" ") : "Ninguno" },
            { name: "Roles a eliminar", value: rolesToRemove.length ? rolesToRemove.map(id => `<@&${id}>`).join(" ") : "Ninguno" }
        )
        .setFooter({ text: `Subcomando: ${subCommand}` })
        .setTimestamp();

    return interaction.reply({ embeds: [embed] });
}

    // /removerole → Eliminar un rol específico
    if (commandName === "removerole") {
    if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply("❌ Solo los administradores pueden usar este comando.");
    }

    const subCommand = interaction.options.getString("subcomando");
    const roleInput = interaction.options.getString("rol").trim();
    const roleId = roleInput.replace(/<@&(\d+)>/, "$1");

    if (!/^\d+$/.test(roleId)) {
        return interaction.reply("❌ Rol inválido. Debes proporcionar un ID o mención de rol.");
    }

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
        return interaction.reply("❌ El rol no existe en este servidor.");
    }

    const result = await pool.query(
        `DELETE FROM roles WHERE guildId = $1 AND command = $2 AND roleId = $3`,
        [interaction.guild.id, subCommand, roleId]
    );

    if (result.rowCount === 0) {
        return interaction.reply(`⚠️ El rol no estaba configurado en ${subCommand}.`);
    }

    return interaction.reply(`🗑️ Rol eliminado de ${subCommand}: ${role.name}`);
}

    // /clearroles → Eliminar todos los roles de un subcomando
    if (commandName === "clearroles") {
    if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply("❌ Solo los administradores pueden usar este comando.");
    }

    const subCommand = interaction.options.getString("subcomando");
    const validCommands = ["verify", "verifya", "verifyla"];
    if (!validCommands.includes(subCommand)) {
        return interaction.reply("❌ Subcomando inválido.");
    }

    const res = await pool.query(
        `SELECT roleId FROM roles WHERE guildId = $1 AND command = $2`,
        [interaction.guild.id, subCommand]
    );

    if (res.rowCount === 0) {
        return interaction.reply(`⚠️ No había roles configurados para ${subCommand}.`);
    }

    const existingRoles = res.rows
        .map(r => interaction.guild.roles.cache.get(r.roleid))
        .filter(role => role);

    await pool.query(
        `DELETE FROM roles WHERE guildId = $1 AND command = $2`,
        [interaction.guild.id, subCommand]
    );

    return interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle("🧹 Roles limpiados")
            .setDescription(`Se eliminaron todos los roles configurados para **${subCommand}**.`)
            .addFields(existingRoles.length > 0
                ? [{ name: "Roles eliminados", value: existingRoles.map(r => r.name).join("\n") }]
                : [])
            .setTimestamp()]
    });
}

        if (commandName === "setlogchannel") {
    if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply("❌ Solo administradores pueden usar este comando.");
    }

    const channel = interaction.options.getChannel("canal");
    await pool.query(`
        INSERT INTO moderation_settings (guildId, logChannelId)
        VALUES ($1, $2)
        ON CONFLICT (guildId) DO UPDATE SET logChannelId = $2
    `, [interaction.guild.id, channel.id]);

    return interaction.reply({
        embeds: [{
            color: 0x3498db,
            title: "📡 Canal de logs configurado",
            description: `Los reportes de moderación se enviarán a **${channel.name}**.`,
            footer: { text: `Configurado por ${interaction.user.tag}` },
            timestamp: new Date()
        }]
    });
}

    if (commandName === "setspamconfig") {
    if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply("❌ Solo administradores pueden usar este comando.");
    }

    const threshold = interaction.options.getInteger("umbral");
    const duration = interaction.options.getInteger("duracion");

    await pool.query(`
        INSERT INTO moderation_settings (guildId, spamThreshold, timeoutDuration)
        VALUES ($1, $2, $3)
        ON CONFLICT (guildId) DO UPDATE SET spamThreshold = $2, timeoutDuration = $3
    `, [interaction.guild.id, threshold, duration]);

    // Embed de confirmación
    return interaction.reply({
        embeds: [{
            color: 0x2ecc71,
            title: "⚙️ Configuración anti-spam actualizada",
            description: "Los parámetros de moderación fueron guardados correctamente.",
            fields: [
                { name: "Umbral", value: `${threshold} mensajes en 10s`, inline: true },
                { name: "Timeout", value: `${duration} minutos`, inline: true }
            ],
            footer: { text: `Configurado por ${interaction.user.tag}` },
            timestamp: new Date()
        }]
    });
}


    // /unreg → Eliminar registro de Roblox
if (commandName === "unreg") {
    const result = await pool.query(
        `DELETE FROM roblox_users WHERE discordId = $1`,
        [interaction.user.id]
    );

    if (result.rowCount === 0) {
        return interaction.reply("⚠️ No tienes un registro guardado.");
    }

    return interaction.reply("🗑️ Tu registro de Roblox ha sido eliminado correctamente.");
    }

});
// Definición del prefijo
const prefix = "?";

const trivia = require("./commands/trivia");
const ban = require("./commands/ban");
const mute = require("./commands/mute");
//Tracker global
const spamTracker = new Map();

// Handler de comandos con prefijo
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const key = `${message.guild.id}-${message.author.id}`;
   
    //--- AntiSpam ---
    if (!spamTracker.has(key)) {
        spamTracker.set(key, { timestamps: [], suspension: null, longMsgCount: 0 });
    }

    const data = spamTracker.get(key);
    const now = Date.now();

    // Filtrar últimos 10s
    data.timestamps = data.timestamps.filter(ts => now - ts < 10000);
    data.timestamps.push(now);

    // Contar palabras del mensaje
    const wordCount = message.content.trim().split(/\s+/).length;

    const res = await pool.query(
        `SELECT logChannelId, spamThreshold, timeoutDuration FROM moderation_settings WHERE guildId = $1`,
        [message.guild.id]
    );

    if (res.rowCount > 0) {
        const { logchannelid, spamthreshold, timeoutduration } = res.rows[0];

        // --- Detector 1: spam por frecuencia (tu lógica original) ---
        if (data.timestamps.length >= spamthreshold) {
            try {
                await message.member.timeout(timeoutduration * 60 * 1000, "Spam detectado (frecuencia)");
                // ... tus embeds y logs originales ...
                spamTracker.set(key, { timestamps: [], suspension: data.suspension, longMsgCount: 0 });
            } catch (err) {
                console.error("❌ Error aplicando timeout:", err);
            }
        }

        // --- Detector 2: spam por longitud (≥50 palabras, mínimo 3 mensajes en 10s) ---
        if (wordCount >= 50) {
            data.longMsgCount += 1;

            if (data.longMsgCount >= 3) {
                try {
                    // Suspensión progresiva
                    let suspensionMs;
                    if (data.suspension) {
                        suspensionMs = data.suspension * 2;
                    } else {
                        suspensionMs = timeoutduration * 60 * 1000; // primera suspensión
                    }

                    await message.member.timeout(suspensionMs, "Spam detectado (mensajes largos)");

                    await message.channel.send({
                        embeds: [{
                            color: 0xf39c12,
                            title: "⏳ Usuario suspendido",
                            description: `${message.author} fue suspendido automáticamente por **mensajes largos repetidos**.`,
                            fields: [
                                { name: "Duración", value: `${Math.floor(suspensionMs / 1000)} segundos`, inline: true },
                                { name: "Mensajes largos en 10s", value: `${data.longMsgCount}`, inline: true },
                                { name: "Palabras último mensaje", value: `${wordCount}`, inline: true }
                            ],
                            footer: { text: "Sistema de moderación automática" },
                            timestamp: new Date()
                        }]
                    });

                    const logChannel = message.guild.channels.cache.get(logchannelid);
                    if (logChannel) {
                        logChannel.send({
                            embeds: [{
                                color: 0xe74c3c,
                                title: "🚨 Moderación: Mensajes largos detectados",
                                description: `${message.author.tag} fue suspendido.`,
                                fields: [
                                    { name: "Duración", value: `${Math.floor(suspensionMs / 1000)} segundos`, inline: true },
                                    { name: "Mensajes largos en 10s", value: `${data.longMsgCount}`, inline: true },
                                    { name: "Palabras último mensaje", value: `${wordCount}`, inline: true }
                                ],
                                timestamp: new Date()
                            }]
                        });
                    }

                    // Resetear contador de mensajes largos y guardar suspensión
                    spamTracker.set(key, { timestamps: data.timestamps, suspension: suspensionMs, longMsgCount: 0 });

                } catch (err) {
                    console.error("❌ Error aplicando timeout:", err);
                }
            } else {
                // Actualizar sin sanción todavía
                spamTracker.set(key, data);
            }
        }
    }


    if (!message.content.startsWith(prefix)) return;

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

     if (command === "trivia") return trivia.execute(message, args);
     
     if (command === "mute") return mute.execute(message, args);

     if (command === "ban") return ban.execute(message, args);

    if (command === "ranking") {
    const res = await pool.query(
        "SELECT user_id, points, max_streak FROM trivia_scores WHERE guild_id = $1 ORDER BY points DESC LIMIT 10",
        [message.guild.id]
    );

    if (res.rowCount === 0) {
        return message.channel.send("📉 Aún no hay puntuaciones en este servidor.");
    }

    let ranking = await Promise.all(res.rows.map(async (row, i) => {
        let username;
        try {
        const member = await message.guild.members.fetch(row.user_id);
        username = member.displayName;
        } catch {
        username = row.user_id;
        }

        // 🥇🥈🥉 según posición
        let medal = "";
        if (i === 0) medal = "🥇";
        else if (i === 1) medal = "🥈";
        else if (i === 2) medal = "🥉";

        let streakInfo = row.max_streak > 0 ? ` | 🔥 Racha máxima: ${row.max_streak}` : "";
        return `${medal} **${i + 1}.** ${username} — ${row.points} puntos${streakInfo}`;
    }));

    // 🎨 Colores según top 3
    let color = 0xf1c40f; // default oro
    if (res.rowCount > 1) color = 0xc0c0c0; // plata si hay al menos 2
    if (res.rowCount > 2) color = 0xcd7f32; // bronce si hay al menos 3

    const embed = new EmbedBuilder()
        .setTitle("🏆 Ranking Trivia")
        .setDescription(ranking.join("\n"))
        .setColor(color);

    await message.channel.send({ embeds: [embed] });
    }
    if (command === "puntos" || command === "perfil") {
    let targetUser = message.mentions.users.first() || message.author;

    const res = await pool.query(
        "SELECT points, current_streak, max_streak FROM trivia_scores WHERE guild_id = $1 AND user_id = $2",
        [message.guild.id, targetUser.id]
    );

    if (res.rowCount === 0) {
        return message.channel.send(`📉 ${targetUser.username} aún no tiene puntuaciones registradas.`);
    }

    const { points, current_streak, max_streak } = res.rows[0];

    // 🔎 Verificar si el usuario está en el top 3
    const rankRes = await pool.query(
        "SELECT user_id FROM trivia_scores WHERE guild_id = $1 ORDER BY points DESC LIMIT 3",
        [message.guild.id]
    );
    const top3 = rankRes.rows.map(r => r.user_id);

    let medal = "";
    let color = 0x2ecc71; // verde por defecto
    if (top3[0] === targetUser.id) {
        medal = "🥇";
        color = 0xf1c40f; // dorado
    } else if (top3[1] === targetUser.id) {
        medal = "🥈";
        color = 0xc0c0c0; // plateado
    } else if (top3[2] === targetUser.id) {
        medal = "🥉";
        color = 0xcd7f32; // bronce
    }

    const embed = new EmbedBuilder()
        .setTitle(`📊 Perfil de Trivia — ${targetUser.username} ${medal}`)
        .setColor(color)
        .addFields(
        { name: "Puntos", value: `${points}`, inline: true },
        { name: "🔥 Racha actual", value: current_streak > 0 ? `${current_streak}` : "—", inline: true },
        { name: "🏆 Racha máxima", value: max_streak > 0 ? `${max_streak}` : "—", inline: true }
        );

    await message.channel.send({ embeds: [embed] });
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
        if (!message.member || !message.member.permissions.has("ManageRoles")) {
            return message.reply("❌ No tienes permisos suficientes para usar este comando.");
        }


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
        for (const roleId of rolesToAdd) {
            const role = message.guild.roles.cache.get(roleId);
            console.log("Intentando asignar rol:", roleId, role?.name);

            if (!role) {
                console.log("❌ No se encontró el rol en cache.");
                continue;
            }

            try {
                await member.roles.add(role);
                console.log("✅ Rol asignado:", role.name);
            } catch (error) {
                console.error("❌ Error al asignar rol:", role.name, error);
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
            { name: "🗑️ /unreg", value: "Elimina tu registro de Roblox.", inline: false },
            { name: "📢 ?help", value: "Pide ayuda en Roblox, pingueando al rol configurado y mostrando tu registro.", inline: false },
            { name: "ℹ️ ?userinfo [@usuario]", value: "Muestra tu registro o el de otro usuario.", inline: false }
        )
        .setFooter({ text: "Página 1/6" }),

    new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle("🎲 Comandos de Trivia")
        .setDescription("Juega trivia y compite con otros en el servidor:")
        .addFields(
            { name: "❓ ?trivia", value: "Lanza una pregunta aleatoria con botones.", inline: false },
            { name: "🎯 ?puntos", value: "Muestra tu puntuación personal en este servidor.", inline: false },
            { name: "🏆 ?ranking", value: "Muestra el top 10 de jugadores en el servidor.", inline: false }
        )
        .setFooter({ text: "Página 2/6" }), // ajusta el número de página según tu orden

    new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("⚙️ Comandos de verificación")
        .setDescription("Estos comandos asignan o eliminan roles configurados:")
        .addFields(
            { name: "✅ ?verify @usuario", value: "Asigna roles configurados para `verify`.", inline: false },
            { name: "🔒 ?verifya @usuario", value: "Asigna roles configurados para `verifya`.", inline: false },
            { name: "🔑 ?verifyla @usuario", value: "Asigna roles configurados para `verifyla`.", inline: false }
        )
        .setFooter({ text: "Página 3/6" }),

    new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("ℹ️ Información general")
        .setDescription("Este bot combina comandos clásicos con prefijo y nuevos slash commands para administración.\n\n✨ Diseñado para facilitar la gestión de roles y registros de Roblox.")
        .setFooter({ text: "Página 4/6" }),

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
        .setFooter({ text: "Página 5/6" }),
    
        new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("🚨 Moderación automática")
        .setDescription("El bot cuenta con un sistema anti-spam y opciones de configuración para administradores.")
        .addFields(
            { name: "⚙️ /setlogchannel <canal>", value: "Configura el canal donde se enviarán los reportes de moderación.", inline: false },
            { name: "⚙️ /setspamconfig <umbral> <duración>", value: "Ajusta el número de mensajes permitidos en 10s y la duración de la suspensión.", inline: false },
            { name: "⏳ Suspensión automática", value: "Si un usuario envía más mensajes de los permitidos en 10s, será suspendido automáticamente y se notificará en el canal.", inline: false }
        )
        .setFooter({ text: "Página 6/6" })
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