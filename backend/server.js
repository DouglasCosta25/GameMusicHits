// GameMusicHits — servidor WebSocket (playlist vem do frontend)
const WebSocket = require("ws");
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
console.log("Servidor GameMusicHits WS rodando na porta", PORT);

const rooms = {};

function broadcast(room, msg){
  if(!rooms[room]) return;
  const s = JSON.stringify(msg);
  Object.values(rooms[room].players).forEach(p=>{
    if(p.ws && p.ws.readyState===WebSocket.OPEN) p.ws.send(s);
  });
}

wss.on("connection", ws=>{
  ws.id = "p_"+Math.random().toString(36).slice(2,8);

  ws.on("message", msg=>{
    try{ handle(ws, JSON.parse(msg)); }catch(e){ console.error(e); }
  });

  ws.on("close", ()=>{
    for(const room in rooms){
      if(rooms[room].players[ws.id]){
        delete rooms[room].players[ws.id];
        updatePlayers(room);
      }
    }
  });
});

function handle(ws, d){
  if(d.type==="create-room"){
    rooms[d.room] = {
      players:{},
      hostId:d.player.id,
      playlist:[],
      state:"lobby",
      order:[],
      currentIndex:0
    };
    rooms[d.room].players[d.player.id] = {id:d.player.id, name:d.player.name, ws, score:0};
    broadcast(d.room,{type:"room-created", room:d.room, host:d.player.id});
    updatePlayers(d.room);
  }

  if(d.type==="join-room"){
    if(!rooms[d.room]) return ws.send(JSON.stringify({type:"error",message:"Sala não existe"}));
    rooms[d.room].players[d.player.id] = {id:d.player.id,name:d.player.name,ws,score:0};
    updatePlayers(d.room);
  }

  if(d.type==="start-game"){
    const room = d.room;
    rooms[room].playlist = d.playlist || [];
    rooms[room].order = shuffle([...Array(rooms[room].playlist.length).keys()]);
    rooms[room].currentIndex = 0;
    rooms[room].state = "playing";

    broadcast(room,{type:"start", currentIndex:0, song:rooms[room].playlist[rooms[room].order[0]]});

    const interval = (d.duration || 10) * 1000 + 2000;
    rooms[room].timer = setInterval(()=>{
      const r = rooms[room];
      r.currentIndex++;
      if(r.currentIndex >= r.order.length){
        clearInterval(r.timer);
        broadcast(room,{type:"game-ended"});
        return;
      }
      broadcast(room,{
        type:"new-song",
        index:r.currentIndex,
        song:r.playlist[r.order[r.currentIndex]]
      });
    }, interval);
  }
}

function updatePlayers(room){
  broadcast(room,{
    type:"players",
    players:Object.values(rooms[room].players).map(p=>({
      id:p.id, name:p.name, score:p.score
    }))
  });
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
