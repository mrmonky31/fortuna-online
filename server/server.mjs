// server/server.mjs
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// ✅ CORS SOLO PER VERCEL
app.use(
  cors({
    origin: ["https://fortuna-online.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://fortuna-online.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 10000;

// Mappa stanze
// rooms[code] = {
//   host, hostId,
//   players: [{id, name}],
//   spectators: [{id, name}],
//   totalRounds,
//   currentPhrase,
//   currentCategory,
//   gameState: {...}  // stato completo sincronizzato
// }
const rooms = {};

// Trova stanza da socket
function findRoomBySocketId(socketId) {
  for (const [code, room] of Object.entries(rooms)) {
    if (room.players?.some((p) => p.id === socketId)) {
      return { code, room, role: "player" };
    }
    if (room.spectators?.some((s) => s.id === socketId)) {
      return { code, room, role: "spectator" };
    }
  }
  return null;
}

io.on("connection", (socket) => {
  console.log("🔌 Nuova connessione:", socket.id);

  // CREA STANZA
  socket.on("createRoom", ({ playerName, totalRounds, roomName }, callback) => {
    try {
      const rawName = roomName && String(roomName).trim();
      const code =
        rawName && rawName.length > 0
          ? rawName.toUpperCase()
          : Math.random().toString(36).substring(2, 7).toUpperCase();

      rooms[code] = {
        host: playerName,
        hostId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        spectators: [],
        totalRounds: totalRounds || 3,
        currentPhrase: null,
        currentCategory: null,
        gameState: null,
      };

      socket.join(code);
      console.log(`🌀 Stanza creata: ${code} da ${playerName}`);

      if (callback) {
        callback({
          ok: true,
          room: rooms[code],
          roomCode: code,
          playerName,
        });
      }
    } catch (err) {
      console.error("Errore createRoom:", err);
      if (callback) callback({ ok: false, error: "Errore creazione stanza" });
    }
  });

  // JOIN COME GIOCATORE
  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza inesistente" });
        return;
      }

      if (!room.players) room.players = [];
      if (!room.spectators) room.spectators = [];
      room.players.push({ id: socket.id, name: playerName });

      socket.join(code);
      console.log(`🎮 ${playerName} è entrato in ${code}`);

      // aggiorna tutti sulla lobby
      io.to(code).emit("roomUpdate", { room, roomCode: code });

      // se esiste già uno stato di gioco, mandalo SUBITO a chi entra ora
      if (room.gameState) {
        console.log("📦 Invia gameState salvato al nuovo player");
        socket.emit("gameState", { state: room.gameState });
      }

      if (callback) {
        callback({
          ok: true,
          room,
          roomCode: code,
          playerName,
        });
      }
    } catch (err) {
      console.error("Errore joinRoom:", err);
      if (callback) callback({ ok: false, error: "Errore ingresso stanza" });
    }
  });

  // JOIN COME SPETTATORE
  socket.on("joinAsSpectator", ({ roomCode, name }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza inesistente" });
        return;
      }

      if (!room.spectators) room.spectators = [];
      if (!room.players) room.players = [];
      room.spectators.push({ id: socket.id, name: name || "Spettatore" });

      socket.join(code);
      console.log(`👀 ${name} è entrato come spettatore in ${code}`);

      io.to(code).emit("roomUpdate", { room, roomCode: code });

      if (room.gameState) {
        console.log("📦 Invia gameState salvato allo spettatore");
        socket.emit("gameState", { state: room.gameState });
      }

      if (callback) callback({ ok: true, room, roomCode: code });
    } catch (err) {
      console.error("Errore joinAsSpectator:", err);
      if (callback) callback({ ok: false, error: "Errore ingresso spettatore" });
    }
  });

  // AVVIO PARTITA (host) – sceglie solo la frase condivisa
  socket.on("startGame", ({ roomCode }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza inesistente" });
        return;
      }

      console.log(`🚀 startGame richiesto per stanza ${code}`);

      // Frasi di esempio (come seed comune – la logica completa resta client-side)
      const phrases = [
        { category: "CINEMA", text: "IL SIGNORE DEGLI ANELLI" },
        { category: "MUSICA", text: "VIVA LA VIDA" },
        { category: "SPORT", text: "CALCIO DI RIGORE" },
        { category: "NATURA", text: "ALBERI SECOLARI" },
        { category: "STORIA", text: "IMPERO ROMANO" },
      ];
      const random = phrases[Math.floor(Math.random() * phrases.length)];
      room.currentPhrase = random.text;
      room.currentCategory = random.category;
      // lo stato completo di gioco verrà salvato alla prima sync dal client
      room.gameState = null;

      io.to(code).emit("gameStart", {
        room,
        roomCode: code,
        phrase: random.text,
        category: random.category,
        totalRounds: room.totalRounds || 3,
      });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore startGame:", err);
      if (callback) callback({ ok: false, error: "Errore avvio partita" });
    }
  });

  // 🔹 RICEVE AZIONI DI GIOCO
  socket.on("action", ({ roomCode, type, payload }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza inesistente" });
        return;
      }

      switch (type) {
        // nuovo tipo: sincronizzazione COMPLETA dello stato
        case "syncState":
          room.gameState = payload?.state || null;
          console.log(
            `🧠 syncState ricevuto per ${code}, stato salvato:`,
            !!room.gameState
          );
          // manda lo stato completo a tutti i client nella stanza
          io.to(code).emit("gameState", { state: room.gameState });
          break;

        // altri tipi li lascio solo per debug / compatibilità
        case "startGame":
          console.log(`🚀 action:startGame su ${code}`);
          io.to(code).emit("gameStart", { room, roomCode: code });
          break;

        case "spin":
        case "consonant":
        case "vowel":
        case "solve":
          console.log(`🎯 action:${type} su ${code}`, payload);
          // la logica vera ormai vive lato client via syncState
          break;

        default:
          console.warn("⚠️ Tipo di azione non riconosciuto:", type);
      }

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore action:", err);
      if (callback) callback({ ok: false, error: "Errore azione di gioco" });
    }
  });

  // DISCONNESSIONE
  socket.on("disconnect", () => {
    const info = findRoomBySocketId(socket.id);
    if (!info) {
      console.log("❌ Disconnessione (nessuna stanza):", socket.id);
      return;
    }

    const { code, room, role } = info;

    try {
      if (!room.players) room.players = [];
      if (!room.spectators) room.spectators = [];

      if (role === "player" && Array.isArray(room.players)) {
        const idx = room.players.findIndex((p) => p.id === socket.id);
        if (idx !== -1) {
          const left = room.players[idx];
          room.players.splice(idx, 1);
          console.log(`⬅️ Player uscito da ${code}:`, left?.name);
        }
      }

      if (role === "spectator" && Array.isArray(room.spectators)) {
        const sIdx = room.spectators.findIndex((s) => s.id === socket.id);
        if (sIdx !== -1) {
          const left = room.spectators[sIdx];
          room.spectators.splice(sIdx, 1);
          console.log(`👋 Spettatore uscito da ${code}:`, left?.name);
        }
      }

      const hasPlayers = room.players && room.players.length > 0;
      const hasSpectators = room.spectators && room.spectators.length > 0;

      if (!hasPlayers && !hasSpectators) {
        console.log(`🗑️ Eliminazione stanza vuota: ${code}`);
        delete rooms[code];
      } else {
        io.to(code).emit("roomUpdate", { room, roomCode: code });
      }
    } catch (err) {
      console.error("Errore gestione disconnect:", err);
    }

    console.log("❌ Disconnessione:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server attivo sulla porta ${PORT}`);
  console.log("✅ CORS abilitato per https://fortuna-online.vercel.app");
});
