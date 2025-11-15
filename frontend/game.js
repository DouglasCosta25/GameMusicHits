// GameMusicHits – game.js (versão JSON automática)
const wsUrl = "gamemusichits.up.railway.app";  // <-- TROQUE AQUI

let ws = null;
let local = { id:null, name:"", room:"", isHost:false, playlist:[], currentIndex:-1 };
const el = id => document.getElementById(id);

function logStatus(t){ el("status").textContent = "Status: " + t; }

async function loadSongs(){
  try{
    const data = await fetch("songs.json").then(r=>r.json());
    local.playlist = data.songs;
    logStatus("Playlist carregada ("+local.playlist.length+" músicas)");
  }catch(e){ logStatus("Erro ao carregar songs.json"); }
}
loadSongs();

function connectWS(){
  if(ws) ws.close();
  ws = new WebSocket(wsUrl);
  ws.onopen = ()=> logStatus("Conectado ao servidor GameMusicHits");
  ws.onmessage = msg => handleMessage(JSON.parse(msg.data));
  ws.onclose = ()=> logStatus("Desconectado do servidor");
}
function send(o){ if(ws && ws.readyState===1) ws.send(JSON.stringify(o)); }

function handleMessage(d){
  if(d.type==="room-created")
    el("roomInfo").textContent = "Sala: "+d.room+(d.host===local.id?" (você é host)":"");
  if(d.type==="players")
    renderPlayers(d.players);
  if(d.type==="start"){
    local.currentIndex = d.currentIndex;
    playSong(d.song);
  }
  if(d.type==="new-song"){
    local.currentIndex = d.index;
    playSong(d.song);
  }
}

function renderPlayers(list){
  const c = el("players"); c.innerHTML="";
  list.forEach(p=>{
    const div=document.createElement("div");
    div.className="playerItem";
    div.innerHTML=`<div>${p.name}</div><div>Pts:${p.score||0}</div>`;
    c.appendChild(div);
  });
}

el("create").addEventListener("click", ()=>{
  connectWS();
  local.name = el("name").value.trim() || "Player";
  local.id = "p_"+Math.random().toString(36).substr(2,8);
  local.room = el("room").value.trim() || Math.random().toString(36).substr(2,6).toUpperCase();
  local.isHost = true;
  send({type:"create-room", room:local.room, player:{id:local.id, name:local.name}});
  el("room").value = local.room;
});

el("join").addEventListener("click", ()=>{
  connectWS();
  local.name = el("name").value.trim() || "Player";
  local.id = "p_"+Math.random().toString(36).substr(2,8);
  local.room = el("room").value.trim();
  local.isHost = false;
  send({type:"join-room", room:local.room, player:{id:local.id, name:local.name}});
});

el("start").addEventListener("click", ()=>{
  if(!local.isHost) return alert("Apenas o host pode iniciar o GameMusicHits!");
  const duration = parseInt(el("duration").value || "10",10);
  send({ type:"start-game", room:local.room, duration, playlist:local.playlist });
});

function playSong(song){
  const w = el("playerWrap");
  if(!song){ w.innerHTML="Sem música"; return; }
  if(song.link.includes("watch?v=")){
    const vid = new URL(song.link).searchParams.get("v");
    w.innerHTML = `<iframe width="100%" height="160"
      src="https://www.youtube.com/embed/${vid}?autoplay=1&controls=0"></iframe>`;
  } else {
    w.innerHTML = `<a href="${song.link}" target="_blank">Abrir no YouTube</a>`;
  }
}
