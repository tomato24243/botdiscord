const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getFunnyComment } = require('./util/funnycoments');
const pool = require("../index"); // tu conexión a Postgres

module.exports = {
    name: "ban",
    description: "Banea a un miembro si tienes permisos, o suelta un comentario gracioso si no.",
    async execute(message, args) {
        const targetMember = message.mentions.members.first();

        if (!targetMember) {
            return message.reply("❌ Por favor menciona un miembro para banear.");
        }

        if (message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            try {
                await targetMember.ban({ reason: `Baneado por ${message.author.tag}` });

                const banEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("🚫 Usuario baneado")
                    .addFields(
                        { name: "👤 Usuario", value: `${targetMember.user.tag}`, inline: true },
                        { name: "🔨 Moderador", value: `${message.author.tag}`, inline: true },
                        { name: "📄 Razón", value: "No especificada" }
                    )
                    .setTimestamp();

                // Enviar embed al canal actual
                await message.channel.send({ embeds: [banEmbed] });

                // Buscar canal de logs en la base de datos
                const res = await pool.query(
                    `SELECT logChannelId FROM moderation_settings WHERE guildId = $1`,
                    [message.guild.id]
                );

                if (res.rowCount > 0) {
                    const logChannelId = res.rows[0].logchannelid;
                    const logChannel = message.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [banEmbed] });
                    }
                }

            } catch (error) {
                console.error(error);
                return message.reply("❌ No pude banear a ese miembro, revisa mis permisos.");
            }
        } else {
            return message.channel.send(
                getFunnyComment("ban", message.author.username, targetMember.user.username)
            );
        }
    },
};
