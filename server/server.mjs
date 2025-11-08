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

// Mappa delle stanze: { [roomCode]: { host, players, spectators, totalRounds, ... } }
const rooms = {};

// Trova la stanza di un certo socket
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

  // Crea stanza
  socket.on("createRoom", ({ playerName, totalRounds, roomName }, callback) => {
    try {
      const code =
        roomName || Math.random().toString(36).substring(2, 7).toUpperCase();

      rooms[code] = {
        host: playerName,
        hostId: socket.id,
        players: [{ id: socket.id, name: playerName }],
        spectators: [],
        totalRounds: totalRounds || 3,
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

  // Unisciti come giocatore
  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    try {
      const room = rooms[roomCode];
      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza inesistente" });
        return;
      }

      if (!room.players) room.players = [];
      room.players.push({ id: socket.id, name: playerName });

      socket.join(roomCode);
      console.log(`🎮 ${playerName} è entrato in ${roomCode}`);

      io.to(roomCode).emit("roomUpdate", { room, roomCode });

      if (callback) {
        callback({
          ok: true,
          room,
          roomCode,
          playerName,
        });
      }
    } catch (err) {
      console.error("Errore joinRoom:", err);
      if (callback) callback({ ok: false, error: "Errore ingresso stanza" });
    }
  });

  // Unisciti come spettatore
  socket.on("joinAsSpectator", ({ roomCode, name }, callback) => {
    try {
      const room = rooms[roomCode];
      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza inesistente" });
        return;
      }

      if (!room.spectators) room.spectators = [];
      room.spectators.push({ id: socket.id, name: name || "Spettatore" });

      socket.join(roomCode);
      console.log(`👀 ${name} è entrato come spettatore in ${roomCode}`);

      io.to(roomCode).emit("roomUpdate", { room, roomCode });

      if (callback) callback({ ok: true, room, roomCode });
    } catch (err) {
      console.error("Errore joinAsSpectator:", err);
      if (callback) callback({ ok: false, error: "Errore ingresso spettatore" });
    }
  });

  // Avvio partita (host)
  socket.on("startGame", ({ roomCode }, callback) => {
    try {
      const room = rooms[roomCode];
      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza inesistente" });
        return;
      }

      console.log(`🚀 startGame richiesto per stanza ${roomCode}`);
      // Per ora il server non calcola il gameState: delega al client.
      io.to(roomCode).emit("gameStart", { room });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore startGame:", err);
      if (callback) callback({ ok: false, error: "Errore avvio partita" });
    }
  });

  // 🔹 RICEVE AZIONI DI GIOCO (spin, consonante, vocale, soluzione, startGame)
  socket.on("action", ({ roomCode, type, payload }, callback) => {
    try {
      const room = rooms[roomCode];
      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza inesistente" });
        return;
      }

      switch (type) {
        case "startGame":
          console.log(`🚀 action:startGame su ${roomCode}`);
          io.to(roomCode).emit("gameStart", { room });
          break;

        case "spin":
          console.log(`🎯 action:spin su ${roomCode}`, payload);
          io.to(roomCode).emit("gameState", {
            state: { lastAction: "spin", result: payload?.result },
          });
          break;

        case "consonant":
          console.log(`🔤 action:consonant su ${roomCode}`, payload);
          io.to(roomCode).emit("gameState", {
            state: { lastAction: "consonant", letter: payload?.letter },
          });
          break;

        case "vowel":
          console.log(`🟢 action:vowel su ${roomCode}`, payload);
          io.to(roomCode).emit("gameState", {
            state: { lastAction: "vowel", letter: payload?.letter },
          });
          break;

        case "solve":
          console.log(`✅ action:solve su ${roomCode}`, payload);
          io.to(roomCode).emit("gameState", {
            state: { lastAction: "solve", text: payload?.text },
          });
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

  // Disconnessione: rimuovi player/spettatore dalla stanza e aggiorna
  socket.on("disconnect", () => {
    const info = findRoomBySocketId(socket.id);
    if (!info) {
      console.log("❌ Disconnessione (nessuna stanza):", socket.id);
      return;
    }

    const { code, room, role } = info;

    try {
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

      // Se stanza vuota, cancellala
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
