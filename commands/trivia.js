const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const pool = require("../index");

// Importar todas las preguntas
const artQuestions = require("./questions/questionsart");
const chemistryQuestions = require("./questions/questionschemistry");
const cinemaQuestions = require("./questions/questionscinema");
const generalQuestions = require("./questions/questionsgeneral");
const historyQuestions = require("./questions/questionshistory");
const mathQuestions = require("./questions/questionsmath");
const musicQuestions = require("./questions/questionsmusic");
const physicsQuestions = require("./questions/questionsphysics");
const hardQuestions = require("./questions/questionshard");

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

// 🔀 Barajado de opciones
function shuffleOptions(question) {
  let options = question.options.map((opt, i) => ({ opt, i }));
  for (let j = options.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [options[j], options[k]] = [options[k], options[j]];
  }
  const newAnswerIndex = options.findIndex(o => o.i === question.answer);
  return {
    ...question,
    options: options.map(o => o.opt),
    answer: newAnswerIndex
  };
}

// 🚫 Bloqueo de trivia activa por usuario
const activeTriviaUsers = new Set();

module.exports = {
  name: "trivia",
  description: "Pregunta de trivia aleatoria",
  async execute(message) {
    // Bloqueo: si ya tiene trivia activa
    if (activeTriviaUsers.has(message.author.id)) {
      return message.reply("⚠️ Ya tienes una trivia activa. Responde o espera a que termine antes de iniciar otra.");
    }
    activeTriviaUsers.add(message.author.id);

    // Obtener racha actual
    const streakRes = await pool.query(
      "SELECT current_streak FROM trivia_scores WHERE guild_id = $1 AND user_id = $2",
      [message.guild.id, message.author.id]
    );
    let streak = streakRes.rows.length > 0 ? streakRes.rows[0].current_streak : 0;

    // Selección de pregunta según múltiplos de 5
    let q;
    let pointsValue = 1;
    let difficultyNote = "";
    let timeLimit = 20000; // 20 segundos normal

    if (streak > 0 && streak % 5 === 0) {
      q = hardQuestions[Math.floor(Math.random() * hardQuestions.length)];
      pointsValue = 2;
      difficultyNote = `⚡ Pregunta difícil — vale **${pointsValue} puntos**`;
      timeLimit = 10000; // 10 segundos difícil
    } else {
      q = allQuestions[Math.floor(Math.random() * allQuestions.length)];
    }
    q = shuffleOptions(q);

    let streakText = streak > 0 ? `🔥 Racha actual: ${streak}` : "";

    const embed = new EmbedBuilder()
      .setTitle(`🎲 Trivia - ${q.category}`)
      .setDescription(`${q.question}\n\n${streakText}\n${difficultyNote}\n⏳ Tiempo límite: ${timeLimit/1000} segundos`)
      .setColor(pointsValue === 2 ? 0xe74c3c : 0x3498db);

    const row = new ActionRowBuilder().addComponents(
      q.options.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`option_${i}`)
          .setLabel(opt)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const triviaMessage = await message.reply({ embeds: [embed], components: [row] });

    const collector = triviaMessage.createMessageComponentCollector({ time: timeLimit });

    collector.on("collect", async interaction => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply("⚠️ Solo quien lanzó la trivia puede responder.");
      }

      const choice = parseInt(interaction.customId.split("_")[1]);

      const updatedRow = new ActionRowBuilder().addComponents(
        q.options.map((opt, i) => {
          let style = ButtonStyle.Secondary;
          if (i === q.answer) style = ButtonStyle.Success;
          if (i === choice && choice !== q.answer) style = ButtonStyle.Danger;
          if (i === choice && choice === q.answer) style = ButtonStyle.Success;

          return new ButtonBuilder()
            .setCustomId(`option_${i}`)
            .setLabel(opt)
            .setStyle(style)
            .setDisabled(true);
        })
      );

      if (choice === q.answer) {
        // ✅ Correcto → sumar puntos y racha
        await pool.query(`
          INSERT INTO trivia_scores (guild_id, user_id, points, current_streak, max_streak, congratulated, last_medal)
          VALUES ($1, $2, $3, 1, 1, false, NULL)
          ON CONFLICT (guild_id, user_id)
          DO UPDATE SET 
            points = trivia_scores.points + $3,
            current_streak = trivia_scores.current_streak + 1,
            max_streak = GREATEST(trivia_scores.max_streak, trivia_scores.current_streak + 1)
        `, [message.guild.id, interaction.user.id, pointsValue]);

        const res = await pool.query(
          "SELECT points, current_streak, max_streak FROM trivia_scores WHERE guild_id = $1 AND user_id = $2",
          [message.guild.id, interaction.user.id]
        );
        const { points, current_streak, max_streak } = res.rows[0];

        await interaction.reply(`✅ ¡Correcto ${interaction.user.username}! Ganaste **${pointsValue} puntos**. Ahora tienes **${points} puntos** (racha: ${current_streak})`);

      } else {
        // ❌ Incorrecto → restar puntos y reiniciar racha
        await pool.query(`
          UPDATE trivia_scores
          SET points = GREATEST(points - 1, 0),
              current_streak = 0
          WHERE guild_id = $1 AND user_id = $2
        `, [message.guild.id, interaction.user.id]);

        const res = await pool.query(
          "SELECT points FROM trivia_scores WHERE guild_id = $1 AND user_id = $2",
          [message.guild.id, interaction.user.id]
        );
        const points = res.rows.length > 0 ? res.rows[0].points : 0;

        await interaction.reply(`❌ Incorrecto ${interaction.user.username}. La respuesta era **${q.options[q.answer]}**. Ahora tienes **${points} puntos** (racha reiniciada)`);
      }

      await triviaMessage.edit({ components: [updatedRow] });
      collector.stop();
    });

    collector.on("end", async collected => {
      // ✅ Liberar al usuario al terminar
      activeTriviaUsers.delete(message.author.id);

      if (collected.size === 0) {
        const updatedRow = new ActionRowBuilder().addComponents(
          q.options.map((opt, i) => {
            let style = ButtonStyle.Secondary;
            if (i === q.answer) style = ButtonStyle.Success;

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
