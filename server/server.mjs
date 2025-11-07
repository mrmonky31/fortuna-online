// server/server.mjs
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

// Rotta di prova per vedere se il server risponde
app.get("/", (req, res) => {
  res.send("Fortuna Online Server attivo ✅");
});

// Render usa una PORT dinamica
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Archivio stanze in memoria
let rooms = {};

// 🔌 CONNECTION PRINCIPALE
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
    };

    socket.join(code);
    console.log(`🌀 Stanza creata: ${code} da ${playerName}`);

    // Risposta al frontend
    const payload = {
      ok: true,
      room: rooms[code],
      roomCode: code,
      playerName: playerName || "GIOCATORE",
    };

    if (typeof callback === "function") {
      callback(payload);
    }

    io.to(code).emit("roomUpdate", { room: rooms[code], roomCode: code });
  });

  // ENTRA COME GIOCATORE
  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    const code = (roomCode || "").trim().toUpperCase();
    const room = rooms[code];

    if (!room) {
      console.log("❌ Stanza non trovata:", code);
      if (typeof callback === "function") {
        callback({ ok: false, error: "Stanza non trovata" });
      }
      return;
    }

    room.players.push({
      id: socket.id,
      name: playerName || "GIOCATORE",
      score: 0,
    });

    socket.join(code);
    console.log(`🎮 ${playerName} si è unito alla stanza ${code}`);

    if (typeof callback === "function") {
      callback({ ok: true, room, playerName });
    }

    io.to(code).emit("roomUpdate", { room, roomCode: code });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnessione:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Fortuna Online Server attivo sulla porta ${PORT}`);
});
