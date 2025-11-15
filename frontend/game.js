// ===========================
// GameMusicHits - Frontend
// ===========================

// ---- CONFIG ----
const wsUrl = "wss://gamemusichits.up.railway.app";  // <-- coloque sua URL Final

let ws;
let local = {
    name: "",
    room: "",
    isHost: false,
    playlist: [],
    players: []
};

// ===========================
// ELEMENTOS
// ===========================

function el(id) {
    return document.getElementById(id);
}

const statusBox = el("status");
const playerList = el("players");
const roomBox = el("roomBox");
const playlistBox = el("playlistBox");

// ===========================
// CONECTAR AO SERVIDOR WS
// ===========================

function connectWS() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        statusBox.textContent = "Status: Conectado ao Servidor";
        statusBox.style.color = "green";
        console.log("WS conectado");
    };

    ws.onclose = () => {
        statusBox.textContent = "Status: Desconectado do Servidor";
        statusBox.style.color = "red";

        console.warn("WS desconectado. Tentando reconectar em 3s...");
        setTimeout(connectWS, 3000); 
    };

    ws.onerror = (err) => {
        console.error("Erro no WS:", err);
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log("Recebido do servidor:", msg);
        handleMessage(msg);
    };
}

connectWS();

// ===========================
// ENVIAR PARA SERVIDOR
// ===========================

function send(msg) {
    ws.send(JSON.stringify(msg));
}

// ===========================
// HANDLERS DE EVENTOS DO SERVIDOR
// ===========================

function handleMessage(msg) {

    // Sala criada
    if (msg.action === "roomCreated") {
        roomBox.textContent = msg.room;
        local.room = msg.room;
        local.isHost = true;
        alert("Sala criada: " + msg.room);
        return;
    }

    // Entrou
    if (msg.action === "joined") {
        local.players = msg.players || [];
        renderPlayers();
        return;
    }

    // Novo jogador
    if (msg.action === "playerJoined") {
        local.players = msg.players || [];
        renderPlayers();
        return;
    }

    // Playlist atualizada
    if (msg.action === "playlistUpdated") {
        local.playlist = msg.playlist || [];
        renderPlaylist();
        alert("Playlist carregada!");
        return;
    }

    // Erro
    if (msg.error) {
        alert("Erro: " + msg.message);
        return;
    }
}

// ===========================
// RENDERIZAÇÃO NA TELA
// ===========================

function renderPlayers() {
    playerList.innerHTML = "";

    local.players.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p;
        playerList.appendChild(li);
    });
}

function renderPlaylist() {
    playlistBox.innerHTML = "";
    local.playlist.forEach(m => {
        const div = document.createElement("div");
        div.className = "musicItem";
        div.innerHTML = `
            <b>${m.title}</b> (${m.year}) - ${m.artist}
            <br>
            <a href="${m.link}" target="_blank">Ouvir</a>
        `;
        playlistBox.appendChild(div);
    });
}

// ===========================
// BOTÕES
// ===========================

// Criar sala
el("create").onclick = () => {
    const name = el("name").value.trim();
    if (!name) return alert("Digite seu nome!");

    local.name = name;

    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    send({ action: "createRoom", room: roomCode });
};

// Entrar em sala
el("join").onclick = () => {
    const name = el("name").value.trim();
    const room = el("room").value.trim();

    if (!name) return alert("Digite seu nome!");
    if (!room) return alert("Digite o código da sala!");

    local.name = name;
    local.room = room;
    local.isHost = false;

    send({ action: "join", room, name });
};

// Iniciar (HOST)
el("start").onclick = async () => {
    if (!local.isHost) {
        return alert("Apenas o HOST pode iniciar a partida.");
    }

    try {
        const res = await fetch("songs.json");
        const data = await res.json();

        local.playlist = data;

        send({
            action: "setPlaylist",
            room: local.room,
            playlist: local.playlist
        });
    } catch (e) {
        alert("Erro ao carregar songs.json");
        console.error(e);
    }
};
