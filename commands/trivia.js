const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const pool = require("../index");

// Importar sets de preguntas
// Definir categorías y niveles
const categories = {
  cinema: {
    easy: require("./questions/questionsCinemaEasy"),
    medium: require("./questions/questionsCinemaMedium"),
    mediumHard: require("./questions/questionsCinemaMediumHard"),
    hard: require("./questions/questionsCinemaHard"),
  },
  astronomy: {
    easy: require("./questions/questionsAstronomyEasy"),
    medium: require("./questions/questionsAstronomyMedium"),
    mediumHard: require("./questions/questionsAstronomyMediumHard"),
    hard: require("./questions/questionsAstronomyHard"),
  },
  sports: {
    easy: require("./questions/questionsDeportEasy"),
    medium: require("./questions/questionsDeportMedium"),
    mediumHard: require("./questions/questionsDeportMediumHard"),
    hard: require("./questions/questionsDeportHard"),
  },
  gaming: {
    easy: require("./questions/questionsGamingEasy"),
    medium: require("./questions/questionsGamingMedium"),
    mediumHard: require("./questions/questionsGamingMediumHard"),
    hard: require("./questions/questionsGamingHard"),
  },
  geography: {
    easy: require("./questions/questionsGeographyEasy"),
    medium: require("./questions/questionsGeographyMedium"),
    mediumHard: require("./questions/questionsGeographyMediumHard"),
    hard: require("./questions/questionsGeographyHard"),
  },
  history: {
    easy: require("./questions/questionsHistoryEasy"),
    medium: require("./questions/questionsHistoryMedium"),
    mediumHard: require("./questions/questionsHistoryMediumHard"),
    hard: require("./questions/questionsHistoryHard"),
  },
  logic: {
    easy: require("./questions/questionsLogicEasy"),
    medium: require("./questions/questionsLogicMedium"),
    mediumHard: require("./questions/questionsLogicMediumHard"),
    hard: require("./questions/questionsLogicHard"),
  },
  math: {
    easy: require("./questions/questionsMathematicalEasy"),
    medium: require("./questions/questionsMathematicalMedium"),
    mediumHard: require("./questions/questionsMathematicalMediumHard"),
    hard: require("./questions/questionsMathematicalHard"),
  },
  music: {
    easy: require("./questions/questionsMusicEasy"),
    medium: require("./questions/questionsMusicMedium"),
    mediumHard: require("./questions/questionsMusicMediumHard"),
    hard: require("./questions/questionsMusicHard"),
  }
};

// Generar arrays dinámicamente
const EasyQuestions = Object.values(categories).flatMap(cat => cat.easy);
const MediumQuestions = Object.values(categories).flatMap(cat => cat.medium);
const MediumHardQuestions = Object.values(categories).flatMap(cat => cat.mediumHard);
const HardQuestions = Object.values(categories).flatMap(cat => cat.hard);

// 🔀 Barajado de opciones
function shuffleOptions(Question) {
  let Options = Question.Options.map((opt, i) => ({ opt, i }));
  for (let j = Options.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [Options[j], Options[k]] = [Options[k], Options[j]];
  }
  const newAnswerIndex = Options.findIndex(o => o.i === Question.Answer);
  return {
    ...Question,
    Options: Options.map(o => o.opt),
    Answer: newAnswerIndex
  };
}

// 🚫 Bloqueo de trivia activa por usuario
const activeTriviaUsers = new Set();

// Definir niveles de dificultad con barras multicolor
const difficultyLevels = [
  { min: 0, max: 14, category: "Fácil", color: 0x2ecc71, points: 1, time: 20000, set: EasyQuestions, bar: "🟩🟩🟩⬜⬜⬜⬜⬜⬜⬜" },
  { min: 15, max: 29, category: "Medio", color: 0xf1c40f, points: 1, time: 20000, set: MediumQuestions, bar: "🟨🟨🟨🟩🟩🟩⬜⬜⬜⬜" },
  { min: 30, max: 44, category: "Medio Difícil", color: 0xe67e22, points: 2, time: 15000, set: MediumHardQuestions, bar: "🟧🟧🟧🟨🟨🟨🟩🟩🟩⬜" },
  { min: 45, max: Infinity, category: "Difícil", color: 0xe74c3c, points: 2, time: 10000, set: HardQuestions, bar: "🟥🟥🟥🟧🟧🟧🟨🟨🟨🟩" }
];

function getDifficulty(streak) {
  return difficultyLevels.find(level => streak >= level.min && streak <= level.max);
}

module.exports = {
  name: "trivia",
  description: "Pregunta de trivia aleatoria o por tema",
  async execute(message, args) {

    let chosenCategory = args && args[0] ? args[0].toLowerCase() : null;
    if (chosenCategory && !categories[chosenCategory]) {
      return message.reply(`⚠️ Tema no válido. Los temas disponibles son: ${Object.keys(categories).join(", ")}`);
    }
    
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

    // Determinar nivel
    // Determinar nivel
    const level = getDifficulty(streak);

    // Si el usuario eligió categoría, usar ese set; si no, usar el global
    let questionPool;
    if (chosenCategory) {
      questionPool = categories[chosenCategory][
        level.category.toLowerCase().includes("medio") 
          ? (level.category === "Medio Difícil" ? "mediumHard" : "medium") 
          : (level.category === "Fácil" ? "easy" : "hard")
      ];
    } else {
      questionPool = level.set;
    }

    let q = questionPool[Math.floor(Math.random() * questionPool.length)];
    q = shuffleOptions(q);

    // Tiempo dinámico según tipo de pregunta
    let timeLimit = level.time;

      const difficultTimeOverrides = {
        math: 30000,        // Matemáticas difíciles → 30s
        logic: 20000,       // Razonamiento difícil → 20s
        astronomía: 12000,  // Astronomía difícil → 12s
        sports: 10000,      // Deportes difíciles → 10s
        videojuegos: 10000, // Videojuegos difíciles → 10s
        geography: 15000,   // Geografía difícil → 15s
        history: 12000,     // Historia difícil → 12s
        algebra: 450000,    // Álgebra difícil → 7.5 min
        music: 10000        // Música difícil → 10s
      };

      if (level.Category === "Difícil" && difficultTimeOverrides[q.type.toLowerCase()]) {
        timeLimit = difficultTimeOverrides[q.type.toLowerCase()];
      }


    const embed = new EmbedBuilder()
      .setTitle(`🎲 Trivia - ${q.Category}`)
      .setDescription(`${q.Question}\n\n🔥 Racha actual: ${streak}\n⚡ Nivel: ${level.category}\n⏳ Tiempo límite: ${timeLimit/1000} segundos\n\n${level.bar}`)
      .setColor(level.color);

    const row = new ActionRowBuilder().addComponents(
      q.Options.map((opt, i) =>
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
        q.Options.map((opt, i) => {
          let style = ButtonStyle.Secondary;
          if (i === q.Answer) style = ButtonStyle.Success;
          if (i === choice && choice !== q.Answer) style = ButtonStyle.Danger;
          if (i === choice && choice === q.Answer) style = ButtonStyle.Success;

          return new ButtonBuilder()
            .setCustomId(`option_${i}`)
            .setLabel(opt)
            .setStyle(style)
            .setDisabled(true);
        })
      );

      if (choice === q.Answer) {
        // ✅ Correcto → sumar puntos y racha
        await pool.query(`
          INSERT INTO trivia_scores (guild_id, user_id, points, current_streak, max_streak)
          VALUES ($1, $2, $3, 1, 1)
          ON CONFLICT (guild_id, user_id)
          DO UPDATE SET 
            points = trivia_scores.points + $3,
            current_streak = trivia_scores.current_streak + 1,
            max_streak = GREATEST(trivia_scores.max_streak, trivia_scores.current_streak + 1)
        `, [message.guild.id, interaction.user.id, level.points]);

        const res = await pool.query(
          "SELECT points, current_streak FROM trivia_scores WHERE guild_id = $1 AND user_id = $2",
          [message.guild.id, interaction.user.id]
        );
        const { points, current_streak } = res.rows[0];

        await interaction.reply(`✅ ¡Correcto ${interaction.user.username}! Ganaste **${level.points} puntos**. Ahora tienes **${points} puntos** (racha: ${current_streak})`);

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

        await interaction.reply(`❌ Incorrecto ${interaction.user.username}. La respuesta era **${q.Options[q.Answer]}**. Ahora tienes **${points} puntos** (racha reiniciada)`);
      }

      await triviaMessage.edit({ components: [updatedRow] });
      collector.stop();
    });

    collector.on("end", async collected => {
      activeTriviaUsers.delete(message.author.id);

      if (collected.size === 0) {
        // Reiniciar racha y restar puntos por no responder
        await pool.query(`
          UPDATE trivia_scores
          SET points = GREATEST(points - 1, 0),
              current_streak = 0
          WHERE guild_id = $1 AND user_id = $2
        `, [message.guild.id, message.author.id]);

        const res = await pool.query(
          "SELECT points FROM trivia_scores WHERE guild_id = $1 AND user_id = $2",
          [message.guild.id, message.author.id]
        );
        const points = res.rows.length > 0 ? res.rows[0].points : 0;

        // Mostrar la respuesta correcta y actualizar botones
        const updatedRow = new ActionRowBuilder().addComponents(
          q.Options.map((opt, i) => {
            let style = ButtonStyle.Secondary;
            if (i === q.Answer) style = ButtonStyle.Success;

            return new ButtonBuilder()
              .setCustomId(`option_${i}`)
              .setLabel(opt)
              .setStyle(style)
              .setDisabled(true);
          })
        );

        await triviaMessage.edit({ components: [updatedRow] });
        await message.channel.send(
          `⏳ Se acabó el tiempo. La respuesta correcta era **${q.Options[q.Answer]}**. ` +
          `Ahora tienes **${points} puntos** (racha reiniciada)`
        );
      }
    });
  }
};