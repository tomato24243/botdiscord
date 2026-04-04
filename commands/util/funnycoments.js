// Centralizamos frases graciosas para reusarlas en varios comandos
const funnyComments = {
    ban: [
        (author, target) => `😂 @${target}, ${author} intentó banearte... pero su martillo era de plástico.`,
        (author, target) => `🤣 @${target}, ${author} quiso banearte, pero falló más que un mago sin maná.`,
        (author, target) => `🤭 @${target}, ${author} trató de banearte... ¡pero no tiene poderes!`,
    ],
    mute: [
        (author, target) => `😅 @${target}, ${author} intentó silenciarte... pero su micrófono estaba apagado.`,
        (author, target) => `🎤 @${target}, ${author} quiso mutearte, pero terminó muteándose a sí mismo.`,
        (author, target) => `🙃 @${target}, ${author} trató de callarte... pero solo logró hacer ruido.`,
    ]
};

function getFunnyComment(type, author, target) {
    const comments = funnyComments[type];
    return comments[Math.floor(Math.random() * comments.length)](author, target);
}

module.exports = { getFunnyComment };
