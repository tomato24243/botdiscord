const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getFunnyComment } = require('./util/funnycoments');
const pool = require("../index"); // tu conexión a Postgres

function parseDuration(duration) {
    if(!duration || typeof duration !== string){
        throw new Error('Duración invalida o no especificada');
    }
    const match = input.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Formato de duración inválido');

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

module.exports = {
    name: "mute",
    description: "Silencia a un miembro por la duración indicada.",
    async execute(message, args) {
        const targetMember = message.mentions.members.first();
        if (!targetMember) {
            return message.reply("❌ Por favor menciona un miembro para mutear.");
        }

        const durationArg = args[1];
        const durationMs = parseDuration(durationArg);

        if (!durationMs) {
            return message.reply("❌ Debes indicar una duración válida (ejemplo: `10m`, `2h`, `1d`).");
        }

        if (message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
            try {
                await targetMember.timeout(durationMs, `Muteado por ${message.author.tag}`);

                const muteEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle("🔇 Usuario muteado")
                    .addFields(
                        { name: "👤 Usuario", value: `${targetMember.user.tag}`, inline: true },
                        { name: "🔨 Moderador", value: `${message.author.tag}`, inline: true },
                        { name: "⏰ Duración", value: durationArg }
                    )
                    .setTimestamp();

                // Enviar embed al canal actual
                await message.channel.send({ embeds: [muteEmbed] });

                // Buscar canal de logs en la base de datos
                const res = await pool.query(
                    `SELECT logChannelId FROM moderation_settings WHERE guildId = $1`,
                    [message.guild.id]
                );

                if (res.rowCount > 0) {
                    const logChannelId = res.rows[0].logchannelid;
                    const logChannel = message.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [muteEmbed] });
                    }
                }

            } catch (error) {
                console.error(error);
                return message.reply("❌ No pude mutear a ese miembro, revisa mis permisos.");
            }
        } else {
            return message.channel.send(
                getFunnyComment("mute", message.author.username, targetMember.user.username)
            );
        }
    },
};
