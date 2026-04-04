// commands/mute.js
module.exports = {
  name: "mute",
  description: "Silencia a un usuario por un tiempo determinado",
  async execute(message, args) {
    const author = message.member;
    const target = message.mentions.members.first();

    // Validar permisos
    if (!author.permissions.has("MUTE_MEMBERS")) {
      return message.channel.send(
        `<:bonk:1490094960819573001> <@${author.id}> intentó mutear... ¡pero no tiene permisos! 🤭`
      );
    }

    if (!target) {
      return message.channel.send(
        `<:bonk:1490094960819573001> <@${author.id}> intentó mutear... pero no mencionó a nadie 🙃`
      );
    }

    // Función para parsear duración
    function parseDuration(duration) {
      if (!duration || typeof duration !== "string") return null;
      const match = duration.match(/(\d+)([smhd])/);
      if (!match) return null;

      const value = parseInt(match[1]);
      const unit = match[2];
      const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      return value * multipliers[unit];
    }

    const duration = parseDuration(args[1]);

    // Si no hay duración válida → mensaje gracioso
    if (!duration) {
      return message.channel.send(
        `<:bonk:1490094960819573001> <@${target.id}>, <@${author.id}> intentó mutearte... pero olvidó poner la duración 😅`
      );
    }

    try {
      // Aplicar mute (ejemplo con timeout)
      await target.timeout(duration, `Muteado por ${author.user.tag}`);

      return message.channel.send(
        `<:bonk:1490094960819573001> <@${target.id}> fue muteado por <@${author.id}> durante ${args[1]} 🎤`
      );
    } catch (err) {
      console.error(err);
      return message.channel.send(
        `<:bonk:1490094960819573001> Ocurrió un error al intentar mutear a <@${target.id}> 🙃`
      );
    }
  },
};