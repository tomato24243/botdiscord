require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
    {
        name: "reg",
        description: "Registrar tu perfil de Roblox",
        options: [
            { name: "usuario", type: 3, description: "Nombre de usuario Roblox", required: true },
            { name: "link", type: 3, description: "Link al perfil Roblox", required: true }
        ]
    },
    {
        name: "addrole",
        description: "Agregar roles a un subcomando",
        options: [
            { name: "subcomando", type: 3, description: "verify | verifya | verifyla", required: true },
            { name: "roles", type: 3, description: "Lista de roles separados por coma", required: true },
            { name: "roleseliminar", type: 3, description: "Lista de roles a eliminar separados por coma", required: false }
        ]
    },
    {
        name: "removerole",
        description: "Eliminar un rol de un subcomando",
        options: [
            { name: "subcomando", type: 3, description: "verify | verifya | verifyla", required: true },
            { name: "rol", type: 3, description: "Nombre del rol a eliminar", required: true }
        ]
    },
    {
        name: "clearroles",
        description: "Eliminar todos los roles de un subcomando",
        options: [
            { name: "subcomando", type: 3, description: "verify | verifya | verifyla", required: true }
        ]
    },
    {
        name: "sethelprole",
        description: "Configurar el rol para ?help",
        options: [
            { name: "rol", type: 8, description: "Selecciona un rol", required: true }
        ]
    }
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log("🔄 Actualizando slash commands...");
        await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
);
        console.log("✅ Slash commands actualizados correctamente.");
    } catch (error) {
        console.error(error);
    }
})();
