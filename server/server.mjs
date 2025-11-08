// server/server.mjs
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// ✅ FIX CORS
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

const rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Nuova connessione:", socket.id);

  socket.on("createRoom", ({ playerName, totalRounds, roomName }, callback) => {
    const code = roomName || Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[code] = {
      host: playerName,
      players: [{ id: socket.id, name: playerName }],
      totalRounds: totalRounds || 3,
    };
    socket.join(code);
    console.log(`🌀 Stanza creata: ${code} da ${playerName}`);
    if (callback) callback({ ok: true, room: rooms[code], roomCode: code, playerName });
  });

  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      if (callback) callback({ ok: false, error: "Stanza inesistente" });
      return;
    }
    room.players.push({ id: socket.id, name: playerName });
    socket.join(roomCode);
    console.log(`🎮 ${playerName} è entrato in ${roomCode}`);
    io.to(roomCode).emit("roomUpdate", { room, roomCode });
    if (callback) callback({ ok: true, room, roomCode, playerName });
  });

  socket.on("joinAsSpectator", ({ roomCode, name }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      if (callback) callback({ ok: false, error: "Stanza inesistente" });
      return;
    }
    socket.join(roomCode);
    console.log(`👀 ${name} è entrato come spettatore in ${roomCode}`);
    if (callback) callback({ ok: true, room, roomCode });
  });

  socket.on("startGame", ({ roomCode }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      if (callback) callback({ ok: false, error: "Stanza inesistente" });
      return;
    }
    io.to(roomCode).emit("gameStart", { room });
    if (callback) callback({ ok: true });
  });

  // 🔹 RICEVE AZIONI DI GIOCO (spin, consonante, vocale, soluzione, startGame)
  socket.on("action", ({ roomCode, type, payload }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      if (callback) callback({ ok: false, error: "Stanza inesistente" });
      return;
    }

    switch (type) {
      case "startGame":
        io.to(roomCode).emit("gameStart", { room });
        break;

      case "spin":
        io.to(roomCode).emit("gameState", {
          state: { lastAction: "spin", result: payload.result },
        });
        break;

      case "consonant":
        io.to(roomCode).emit("gameState", {
          state: { lastAction: "consonant", letter: payload.letter },
        });
        break;

      case "vowel":
        io.to(roomCode).emit("gameState", {
          state: { lastAction: "vowel", letter: payload.letter },
        });
        break;

      case "solve":
        io.to(roomCode).emit("gameState", {
          state: { lastAction: "solve", text: payload.text },
        });
        break;

      default:
        console.warn("⚠️ Tipo di azione non riconosciuto:", type);
    }

    if (callback) callback({ ok: true });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnessione:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server attivo sulla porta ${PORT}`);
  console.log("✅ CORS abilitato per https://fortuna-online.vercel.app");
});
