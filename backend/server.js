// =============================
// GameMusicHits - WebSocket Server
// =============================

const WebSocket = require("ws");
const PORT = process.env.PORT || 8080;

console.log("Iniciando servidor GameMusicHits...");

// =============================
// VARIÁVEIS DE ESTADO
// =============================

const rooms = {};  
// Estrutura:
// rooms[roomCode] = {
//    players: [],
//    playlist: [],
// }

// =============================
// SERVIDOR WS
// =============================

const wss = new WebSocket.Server({ port: PORT }, () => {
    console.log(`Servidor GameMusicHits WS rodando na porta ${PORT}`);
});

wss.on("connection", (ws) => {
    console.log("Cliente conectado!");

    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data);
            handle(ws, msg);
        } catch (err) {
            console.error("Erro ao processar mensagem:", err);
            ws.send(JSON.stringify({ error: "INVALID_JSON" }));
        }
    });

    ws.on("close", () => {
        console.log("Cliente desconectado");
    });
});

// =============================
// FUNÇÃO PRINCIPAL
// =============================

function handle(ws, msg) {
    const { action, room, name, playlist } = msg;

    console.log("Recebido:", msg);

    // =============================
    // VALIDAR NOME DA SALA
    // =============================
    if (!room || typeof room !== "string") {
        if (action !== "createRoom") {
            ws.send(JSON.stringify({
                error: "ROOM_NOT_PROVIDED",
                message: "Nenhuma sala foi informada."
            }));
            return;
        }
    }

    // =============================
    // CRIAR SALA
    // =============================
    if (action === "createRoom") {
        if (!rooms[room]) {
            rooms[room] = { players: [], playlist: [] };
            console.log("Sala criada:", room);
        }
        ws.send(JSON.stringify({ action: "roomCreated", room }));
        return;
    }

    // =============================
    // TENTAR ACESSAR SALA
    // =============================

    if (!rooms[room]) {
        ws.send(JSON.stringify({
            error: "ROOM_NOT_FOUND",
            room,
            message: `A sala '${room}' não existe no servidor.`
        }));
        console.log("Tentativa de acessar sala inexistente:", room);
        return;
    }

    // =============================
    // ENTRAR NA SALA
    // =============================
    if (action === "join") {
        if (!name) {
            ws.send(JSON.stringify({
                error: "NAME_REQUIRED",
                message: "É necessário informar um nome para entrar na sala."
            }));
            return;
        }

        rooms[room].players.push(name);

        broadcast(room, {
            action: "playerJoined",
            room,
            players: rooms[room].players
        });

        ws.send(JSON.stringify({
            action: "joined",
            room,
            players: rooms[room].players
        }));

        console.log(`Jogador ${name} entrou na sala ${room}`);
        return;
    }

    // =============================
    // ATUALIZAR PLAYLIST
    // =============================
    if (action === "setPlaylist") {
        rooms[room].playlist = playlist || [];

        console.log("Playlist atualizada na sala:", room);

        broadcast(room, {
            action: "playlistUpdated",
            room,
            playlist: rooms[room].playlist
        });

        return;
    }

    // =============================
    // AÇÃO DESCONHECIDA
    // =============================
    ws.send(JSON.stringify({
        error: "UNKNOWN_ACTION",
        message: `Ação '${action}' não reconhecida pelo servidor.`
    }));
}

// =============================
// FUNÇÃO DE BROADCAST
// =============================

function broadcast(room, message) {
    const str = JSON.stringify(message);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(str);
        }
    });
}
