const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Importar todas las categorías
const historyQuestions = require("../questions/history");
const chemistryQuestions = require("../questions/chemistry");
const physicsQuestions = require("../questions/physics");
const mathQuestions = require("../questions/math");
const artQuestions = require("../questions/art");
const musicQuestions = require("../questions/music");
const cinemaQuestions = require("../questions/cinema");
const generalQuestions = require("../questions/general");

// Pool general
const allQuestions = [
  ...historyQuestions,
  ...chemistryQuestions,
  ...physicsQuestions,
  ...mathQuestions,
  ...artQuestions,
  ...musicQuestions,
  ...cinemaQuestions,
  ...generalQuestions
];

module.exports = {
  name: "trivia",
  description: "Responde preguntas de trivia",
  async execute(message, args) {
    // Seleccionar pregunta aleatoria
    const q = allQuestions[Math.floor(Math.random() * allQuestions.length)];

    // Embed con la pregunta
    const embed = new EmbedBuilder()
      .setTitle(`🎲 Trivia - ${q.category}`)
      .setDescription(q.question)
      .setColor(0x3498db);

    // Crear botones para cada opción
    const row = new ActionRowBuilder().addComponents(
      q.options.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`option_${i}`)
          .setLabel(opt)
          .setStyle(ButtonStyle.Primary)
      )
    );

    // Enviar embed con botones
    const triviaMessage = await message.channel.send({ embeds: [embed], components: [row] });

    // Colector de interacciones (20 segundos)
    const collector = triviaMessage.createMessageComponentCollector({ time: 20000 });

    collector.on("collect", async interaction => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: "❌ Solo quien inició la trivia puede responder.", ephemeral: true });
      }

      const choice = parseInt(interaction.customId.split("_")[1]);
      if (choice === q.answer) {
        await interaction.reply("✅ ¡Correcto!");
      } else {
        await interaction.reply(`❌ Incorrecto. La respuesta era **${q.options[q.answer]}**`);
      }
      collector.stop();
    });

    collector.on("end", async collected => {
      if (collected.size === 0) {
        await message.channel.send("⏳ Se acabó el tiempo, nadie respondió.");
      }
    });
  }
};