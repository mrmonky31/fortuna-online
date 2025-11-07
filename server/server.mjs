// server/server.mjs
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// ✅ CORS fissato per Render e Vercel (include header forzati)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// ✅ Middleware cors esplicito
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://fortuna-online.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ✅ Rotta di test
app.get("/", (req, res) => {
  res.send("Fortuna Online Server attivo ✅");
});

// ✅ Porta dinamica (Render)
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// ✅ Socket.io con configurazione CORS robusta
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://fortuna-online.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true, // compatibilità piena con polling
});

// Archivio stanze in memoria
let rooms = {};

// 🔌 Connessione Socket
io.on("connection", (socket) => {
  console.log("✅ Nuova connessione:", socket.id);

  // CREA STANZA
  socket.on("createRoom", ({ playerName, totalRounds, roomName }, callback) => {
    const code =
      roomName?.trim().toUpperCase() ||
      Math.random().toString(36).substring(2, 6).toUpperCase();

    rooms[code] = {
      code,
      players: [{ id: socket.id, name: playerName || "GIOCATORE", score: 0 }],
      totalRounds: totalRounds || 3,
      spectators: [], // ✅ aggiunto per evitare undefined
    };

    socket.join(code);
    console.log(`🌀 Stanza creata: ${code} da ${playerName}`);

    const payload = {
      ok: true,
      room: rooms[code],
      roomCode: code,
      playerName: playerName || "GIOCATORE",
    };

    if (typeof callback === "function") callback(payload);
    io.to(code).emit("roomUpdate", { room: rooms[code], roomCode: code });
  });

  // ENTRA STANZA
  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    const code = (roomCode || "").trim().toUpperCase();
    const room = rooms[code];

    if (!room) {
      console.log("❌ Stanza non trovata:", code);
      if (typeof callback === "function")
        callback({ ok: false, error: "Stanza non trovata" });
      return;
    }

    room.players.push({
      id: socket.id,
      name: playerName || "GIOCATORE",
      score: 0,
    });

    socket.join(code);
    console.log(`🎮 ${playerName} si è unito alla stanza ${code}`);

    if (typeof callback === "function")
      callback({ ok: true, room, playerName });

    io.to(code).emit("roomUpdate", { room, roomCode: code });
  });

  // DISCONNESSIONE
  socket.on("disconnect", () => {
    console.log("❌ Disconnessione:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Fortuna Online Server attivo sulla porta ${PORT}`);
});
