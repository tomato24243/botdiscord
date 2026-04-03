const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const pool = require("../index"); // tu conexión a Postgres

const artQuestions = require("./questions/questionsart");
const chemistryQuestions = require("./questions/questionschemistry");
const cinemaQuestions = require("./questions/questionscinema");
const generalQuestions = require("./questions/questionsgeneral");
const historyQuestions = require("./questions/questionshistory");
const mathQuestions = require("./questions/questionsmath");
const musicQuestions = require("./questions/questionsmusic");
const physicsQuestions = require("./questions/questionsphysics");

const allQuestions = [
  ...artQuestions,
  ...chemistryQuestions,
  ...cinemaQuestions,
  ...generalQuestions,
  ...historyQuestions,
  ...mathQuestions,
  ...musicQuestions,
  ...physicsQuestions
];

module.exports = {
  name: "trivia",
  description: "Pregunta de trivia aleatoria",
  async execute(message) {
    const q = allQuestions[Math.floor(Math.random() * allQuestions.length)];

    const embed = new EmbedBuilder()
      .setTitle(`🎲 Trivia - ${q.category}`)
      .setDescription(q.question)
      .setColor(0x3498db);

    const row = new ActionRowBuilder().addComponents(
      q.options.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`option_${i}`)
          .setLabel(opt)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const triviaMessage = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = triviaMessage.createMessageComponentCollector({ time: 20000 });

    collector.on("collect", async interaction => {
      // 🔒 Solo permite al autor del comando responder
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: "⚠️ Solo quien lanzó la trivia puede responder.", ephemeral: true });
      }

      const choice = parseInt(interaction.customId.split("_")[1]);

      // deshabilitar botones y colorear según resultado
      const updatedRow = new ActionRowBuilder().addComponents(
        q.options.map((opt, i) => {
          let style = ButtonStyle.Secondary; // gris por defecto
          if (i === q.answer) style = ButtonStyle.Success; // verde la correcta
          if (i === choice && choice !== q.answer) style = ButtonStyle.Danger; // rojo si falló
          if (i === choice && choice === q.answer) style = ButtonStyle.Success; // verde si acertó

          return new ButtonBuilder()
            .setCustomId(`option_${i}`)
            .setLabel(opt)
            .setStyle(style)
            .setDisabled(true);
        })
      );

      if (choice === q.answer) {
        // Guardar puntuación en Postgres
        await pool.query(`
          INSERT INTO trivia_scores (guild_id, user_id, points)
          VALUES ($1, $2, 1)
          ON CONFLICT (guild_id, user_id)
          DO UPDATE SET points = trivia_scores.points + 1
        `, [message.guild.id, interaction.user.id]);

        const res = await pool.query(
          "SELECT points FROM trivia_scores WHERE guild_id = $1 AND user_id = $2",
          [message.guild.id, interaction.user.id]
        );
        const points = res.rows[0].points;

        await interaction.reply(`✅ ¡Correcto ${interaction.user.username}! Ahora tienes **${points} puntos**`);
      } else {
        await interaction.reply(`❌ Incorrecto ${interaction.user.username}. La respuesta era **${q.options[q.answer]}**`);
      }

      await triviaMessage.edit({ components: [updatedRow] });
      collector.stop();
    });

    collector.on("end", async collected => {
      if (collected.size === 0) {
        // Nadie respondió → mostrar la respuesta correcta
        const updatedRow = new ActionRowBuilder().addComponents(
          q.options.map((opt, i) => {
            let style = ButtonStyle.Secondary;
            if (i === q.answer) style = ButtonStyle.Success; // marcar la correcta en verde

            return new ButtonBuilder()
              .setCustomId(`option_${i}`)
              .setLabel(opt)
              .setStyle(style)
              .setDisabled(true);
          })
        );

        await triviaMessage.edit({ components: [updatedRow] });
        await message.channel.send(`⏳ Se acabó el tiempo. La respuesta correcta era **${q.options[q.answer]}**`);
      }
    });
  }
};