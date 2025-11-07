// server/server.mjs
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// ✅ Middleware CORS di base
app.use(
  cors({
    origin: [
      "https://fortuna-online.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
  })
);

// ✅ Header CORS forzati per ogni richiesta
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

// ✅ Rotta test
app.get("/", (req, res) => {
  res.send("Fortuna Online Server attivo ✅");
});

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// ✅ SOCKET.IO con CORS forzato
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 🔥 PATCH DIRETTA sugli header HTTP di polling
io.engine.on("headers", (headers, req) => {
  headers["Access-Control-Allow-Origin"] = "*";
  headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] =
    "Origin, X-Requested-With, Content-Type, Accept";
});

// Archivio stanze in memoria
let rooms = {};

// 🔌 Gestione connessioni
io.on("connection", (socket) => {
  console.log("✅ Connessione:", socket.id);

  // CREA STANZA
  socket.on("createRoom", ({ playerName, totalRounds, roomName }, callback) => {
    const code =
      roomName?.trim().toUpperCase() ||
      Math.random().toString(36).substring(2, 6).toUpperCase();

    rooms[code] = {
      code,
      players: [{ id: socket.id, name: playerName || "GIOCATORE", score: 0 }],
      totalRounds: totalRounds || 3,
      spectators: [],
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

  // ENTRA COME GIOCATORE
  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    const code = (roomCode || "").trim().toUpperCase();
    const room = rooms[code];
    if (!room) {
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

  // 🟢 AVVIO PARTITA (FIX)
  socket.on("startGame", ({ roomCode }, callback) => {
    const code = (roomCode || "").trim().toUpperCase();
    const room = rooms[code];

    if (!room) {
      console.log("❌ startGame: stanza non trovata:", code);
      if (typeof callback === "function")
        callback({ ok: false, error: "Stanza non trovata" });
      return;
    }

    if (!room.players || room.players.length === 0) {
      console.log("❌ startGame: nessun giocatore nella stanza:", code);
      if (typeof callback === "function")
        callback({ ok: false, error: "Nessun giocatore" });
      return;
    }

    const state = {
      roomCode: code,
      players: room.players,
      totalRounds: room.totalRounds,
      currentRound: 1,
      currentPlayerIndex: 0,
      status: "IN_PROGRESS",
    };

    console.log(`🚀 Partita avviata nella stanza ${code}`);
    if (typeof callback === "function") callback({ ok: true });
    io.to(code).emit("gameState", { state });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnessione:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server attivo sulla porta ${PORT}`);
});
