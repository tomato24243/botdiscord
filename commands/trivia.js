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
  },
  laws: {
    easy: require("./questions/questionsLawsEasy"),
    medium: require("./questions/questionsLawsMedium"),
    mediumHard: require("./questions/questionsLawsMediumHard"),
    hard: require("./questions/questionsLawsHard"),
  },
  gast: {
    easy: require("./questions/questionsGastronomyEasy"),
    medium: require("./questions/questionsGastronomyMedium"),
    mediumHard: require("./questions/questionsGastronomyMediumHard"),
    hard: require("./questions/questionsGastronomyHard"), 
  }
};

const categoryAliases = {
  gas: "gast",
  gam: "gaming",
  mat: "math",
  law: "laws",
  mus: "music",
  cin: "cinema",
  ast: "astronomy",
  spo: "sports",
  geo: "geography",
  his: "history",
  log: "logic"
};

const difficultyAliases = {
  f: "fácil",
  m: "medio",
  md: "medio difícil",
  d: "difícil"
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
const difficultyLevel = [
  { min: 0, max: 14, category: "Fácil", color: 0x2ecc71, points: 1, time: 20000, set: EasyQuestions, bar: "🟩🟩🟩⬜⬜⬜⬜⬜⬜⬜" },
  { min: 15, max: 29, category: "Medio", color: 0xf1c40f, points: 1, time: 20000, set: MediumQuestions, bar: "🟨🟨🟨🟩🟩🟩⬜⬜⬜⬜" },
  { min: 30, max: 44, category: "Medio Difícil", color: 0xe67e22, points: 2, time: 15000, set: MediumHardQuestions, bar: "🟧🟧🟧🟨🟨🟨🟩🟩🟩⬜" },
  { min: 45, max: Infinity, category: "Difícil", color: 0xe74c3c, points: 2, time: 10000, set: HardQuestions, bar: "🟥🟥🟥🟧🟧🟧🟨🟨🟨🟩" }
];

function getDifficulty(streak) {
  return difficultyLevel.find(level => streak >= level.min && streak <= level.max);
}

module.exports = {
  name: "trivia",
  description: "Pregunta de trivia aleatoria o por tema",
  async execute(message, args) {

    if (args[0] && args[0].toLowerCase() === "help") {
      const helpEmbed = new EmbedBuilder()
        .setTitle("📘 Ayuda - Trivia")
        .setDescription(
          "**Uso:** `!trivia [tema] [dificultad]`\n\n" +
          "• **Temas disponibles:** " + Object.keys(categories).join(", ") + "\n" +
          "• **Dificultades:** fácil, medio, medio difícil, difícil\n\n" +
          "**Ejemplos:**\n" +
          "`?trivia cine medio`\n" +
          "`?trivia historia`\n" +
          "`?trivia difícil`"
        )
        .setColor(0x3498db);

      return message.reply({ embeds: [helpEmbed] });
    }


     let chosenCategory = args[0] ? args[0].toLowerCase() : null;
     let chosenDifficulty = args[1] ? args[1].toLowerCase() : null;

       if (chosenCategory && categoryAliases[chosenCategory]) {
          chosenCategory = categoryAliases[chosenCategory];
        }

          if (chosenDifficulty && difficultyAliases[chosenDifficulty]) {
          chosenDifficulty = difficultyAliases[chosenDifficulty];
        }


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
    const finallevelByStreak = getDifficulty(streak);
    let finallevel = finallevelByStreak;

     if (chosenDifficulty) {
    const requestedfinallevel = difficultyLevel.find(l =>
      l.category.toLowerCase().includes(chosenDifficulty)
    );

    if (!requestedfinallevel) {
      return message.reply(`⚠️ Dificultad no válida. Las opciones son: ${difficultyLevel.map(l => l.category).join(", ")}`);
    }

    if (requestedfinallevel.min < finallevelByStreak.min) {
      // No se permite bajar
      message.reply(`⚠️ No puedes elegir una dificultad menor a tu racha actual. Se usará **${finallevelByStreak.category}**.`);
      finallevel = finallevelByStreak;
    } else {
      finallevel = requestedfinallevel;
    }
  }

    // Si el usuario eligió categoría, usar ese set; si no, usar el global
      let questionPool;
      if (chosenCategory) {
        questionPool = categories[chosenCategory][
          finallevel.category.toLowerCase().includes("medio")
            ? (finallevel.category === "Medio Difícil" ? "mediumHard" : "medium")
            : (finallevel.category === "Fácil" ? "easy" : "hard")
        ];
      } else {
        questionPool = finallevel.set;
      }

    let q = questionPool[Math.floor(Math.random() * questionPool.length)];
    q = shuffleOptions(q);

    // Tiempo dinámico según tipo de pregunta
    let timeLimit = finallevel.time;

      const difficultTimeOverrides = {
        math: 30000,        // Matemáticas difíciles → 30s
        logic: 20000,       // Razonamiento difícil → 20s
        astronomía: 12000,  // Astronomía difícil → 12s
        sports: 10000,      // Deportes difíciles → 10s
        videojuegos: 10000, // Videojuegos difíciles → 10s
        geography: 15000,   // Geografía difícil → 15s
        history: 12000,     // Historia difícil → 12s
        algebra: 450000,    // Álgebra difícil → 7.5 min
        music: 10000,   // Música difícil → 10s
        gastronomía: 10000,   // Gastronomía difícil → 10s
        leyes: 10000 // Leyes difícil → 10s
      };

      if (finallevel.category === "Difícil" && difficultTimeOverrides[q.type.toLowerCase()]) {
        timeLimit = difficultTimeOverrides[q.type.toLowerCase()];
      }


    const embed = new EmbedBuilder()
      .setTitle(`🎲 Trivia - ${q.Category}`)
      .setDescription(`${q.Question}\n\n🔥 Racha actual: ${streak}\n⚡ Nivel: ${finallevel.category}\n⏳ Tiempo límite: ${timeLimit/1000} segundos\n\n${finallevel.bar}`)
      .setColor(finallevel.color);

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
        `, [message.guild.id, interaction.user.id, finallevel.points]);

        const res = await pool.query(
          "SELECT points, current_streak FROM trivia_scores WHERE guild_id = $1 AND user_id = $2",
          [message.guild.id, interaction.user.id]
        );
        const { points, current_streak } = res.rows[0];

        await interaction.reply(`✅ ¡Correcto ${interaction.user.username}! Ganaste **${finallevel.points} puntos**. Ahora tienes **${points} puntos** (racha: ${current_streak})`);

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