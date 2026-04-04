// Centralizamos frases graciosas para reusarlas en varios comandos
const funnyComments = {
ban: [
    (author, target) => `<:bonk:1490094960819573001> <@${target.id}>, <@${author.id}> intentó banearte... pero su martillo era de plástico.`,
    (author, target) => `<:bonk:1490094960819573001> <@${target.id}>, <@${author.id}> quiso banearte, pero falló más que un mago sin maná.`,
    (author, target) => `<:bonk:1490094960819573001> <@${target.id}>, <@${author.id}> trató de banearte... ¡pero no tiene poderes!`,
]
};

function getFunnyComment(type, author, target) {
    const comments = funnyComments[type];
    return comments[Math.floor(Math.random() * comments.length)](author, target);
}

module.exports = { getFunnyComment };
