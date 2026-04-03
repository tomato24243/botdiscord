// questions/general.js
const generalQuestions = [
  {
    category: "Cultura General",
    question: "¿Cuál es el país más grande del mundo en extensión territorial?",
    options: ["China", "Estados Unidos", "Rusia", "Canadá"],
    answer: 2
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el río más largo del mundo?",
    options: ["Amazonas", "Nilo", "Yangtsé", "Misisipi"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el océano más grande del planeta?",
    options: ["Atlántico", "Índico", "Pacífico", "Ártico"],
    answer: 2
  },
  {
    category: "Cultura General",
    question: "¿Cuál es la capital de Australia?",
    options: ["Sídney", "Melbourne", "Canberra", "Brisbane"],
    answer: 2
  },
  {
    category: "Cultura General",
    question: "¿Qué planeta es conocido como el planeta rojo?",
    options: ["Venus", "Marte", "Júpiter", "Saturno"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el idioma más hablado en el mundo?",
    options: ["Inglés", "Español", "Mandarín", "Hindi"],
    answer: 2
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el animal terrestre más rápido?",
    options: ["León", "Tigre", "Guepardo", "Caballo"],
    answer: 2
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el metal más ligero?",
    options: ["Aluminio", "Litio", "Magnesio", "Titanio"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Qué país tiene forma de bota?",
    options: ["España", "Italia", "Grecia", "Portugal"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el continente con más países?",
    options: ["Asia", "África", "Europa", "América"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el desierto más grande del mundo?",
    options: ["Sahara", "Gobi", "Kalahari", "Antártico"],
    answer: 3
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país con mayor población?",
    options: ["India", "China", "Estados Unidos", "Indonesia"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el ave más grande del mundo?",
    options: ["Cóndor", "Avestruz", "Águila", "Pelícano"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se originaron los Juegos Olímpicos?",
    options: ["Italia", "Grecia", "Egipto", "Francia"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país con más volcanes activos?",
    options: ["Japón", "México", "Indonesia", "Chile"],
    answer: 2
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el continente más pequeño?",
    options: ["Oceanía", "Europa", "Antártida", "África"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra la Torre Eiffel?",
    options: ["Italia", "Francia", "España", "Alemania"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país con más islas?",
    options: ["Filipinas", "Indonesia", "Suecia", "Japón"],
    answer: 2
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el mamífero más grande del mundo?",
    options: ["Elefante africano", "Ballena azul", "Hipopótamo", "Orca"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se inventó la pizza?",
    options: ["España", "Italia", "Francia", "Grecia"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Taj Mahal?",
    options: ["India", "Pakistán", "Nepal", "Bangladesh"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país con más premios Nobel?",
    options: ["Estados Unidos", "Reino Unido", "Alemania", "Francia"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Machu Picchu?",
    options: ["México", "Perú", "Chile", "Bolivia"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se inventó el sushi?",
    options: ["China", "Japón", "Corea del Sur", "Vietnam"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra la Estatua de la Libertad?",
    options: ["Francia", "Estados Unidos", "Reino Unido", "Canadá"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es la capital de Canadá?",
    options: ["Toronto", "Ottawa", "Montreal", "Vancouver"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país más pequeño del mundo?",
    options: ["Mónaco", "San Marino", "Ciudad del Vaticano", "Liechtenstein"],
    answer: 2
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el idioma oficial de Brasil?",
    options: ["Español", "Portugués", "Francés", "Italiano"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el continente donde se encuentra Egipto?",
    options: ["Asia", "África", "Europa", "Oceanía"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país con más habitantes de habla hispana?",
    options: ["México", "España", "Argentina", "Colombia"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra la Gran Muralla?",
    options: ["Japón", "China", "Corea del Sur", "India"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Coliseo?",
    options: ["Grecia", "Italia", "Francia", "España"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el continente donde se encuentra Australia?",
    options: ["Oceanía", "Asia", "Europa", "África"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Kremlin?",
    options: ["Alemania", "Rusia", "Polonia", "Hungría"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra la Torre de Pisa?",
    options: ["Francia", "Italia", "España", "Portugal"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Big Ben?",
    options: ["Francia", "Reino Unido", "Irlanda", "Escocia"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Monte Fuji?",
    options: ["China", "Japón", "Corea del Sur", "Vietnam"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra la Estatua del Cristo Redentor?",
    options: ["Argentina", "Brasil", "Chile", "Uruguay"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Taj Mahal?",
    options: ["India", "Pakistán", "Nepal", "Bangladesh"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Machu Picchu?",
    options: ["México", "Perú", "Chile", "Bolivia"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra la Ópera de Sídney?",
    options: ["Australia", "Nueva Zelanda", "Canadá", "Sudáfrica"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra la Estatua de la Libertad?",
    options: ["Francia", "Estados Unidos", "Reino Unido", "Canadá"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Monte Kilimanjaro?",
    options: ["Kenia", "Tanzania", "Uganda", "Sudáfrica"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el río Amazonas?",
    options: ["Brasil", "Colombia", "Perú", "Todos los anteriores"],
    answer: 3
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el desierto del Sahara?",
    options: ["Egipto", "Marruecos", "Argelia", "Todos los anteriores"],
    answer: 3
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Monte Everest?",
    options: ["India", "Nepal", "China", "Bután"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el río Nilo?",
    options: ["Egipto", "Sudán", "Etiopía", "Todos los anteriores"],
    answer: 3
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra la Acrópolis?",
    options: ["Italia", "Grecia", "Turquía", "Egipto"],
    answer: 1
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el Monte Olimpo?",
    options: ["Grecia", "Italia", "Turquía", "Chipre"],
    answer: 0
  },
  {
    category: "Cultura General",
    question: "¿Cuál es el país donde se encuentra el río Misisipi?",
    options: ["Canadá", "Estados Unidos", "México", "Brasil"],
    answer: 1
  }
];

module.exports = generalQuestions;
