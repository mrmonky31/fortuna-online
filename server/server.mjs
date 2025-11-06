// server/server.mjs

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  createInitialGameState,
  startRound,
  applyWheelSpin,
  applyWheelOutcome,
  playConsonant,
  buyVowel,
  trySolve
} from "./game/GameLogic.js";

import { buildBoard } from "./game/GameEngine.js";
import { testPhrases as defaultPhrases } from "./game/phrases.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// rooms[roomCode] = { hostSocketId, totalRounds, players, spectators, gameState, customPhrases, phraseIndex, roomName }
const rooms = new Map();

function generateRoomCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

async function loadPhrasesForRoom(roomName) {
  const key = normalizeKey(roomName);
  if (!key) return { phrases: [], sequential: false };

  const filePath = path.join(__dirname, "game", `phrases_${key}.js`);
  if (!fs.existsSync(filePath)) {
    console.log(`📄 Nessun file personalizzato per stanza '${roomName}', uso default`);
    return { phrases: [], sequential: false };
  }

  try {
    const mod = await import(filePath);
    const phrases = mod.testPhrases || [];
    console.log(`✅ Caricate frasi personalizzate SEQUENZIALI per stanza '${roomName}'`);
    return { phrases, sequential: true };
  } catch (err) {
    console.error("Errore caricamento frasi personalizzate:", err);
    return { phrases: [], sequential: false };
  }
}

function serializeRoom(roomCode, room) {
  return {
    roomCode,
    roomName: room.roomName,
    totalRounds: room.totalRounds,
    players: room.players.map((p) => ({ name: p.name })),
    spectators: room.spectators.map((s) => ({ name: s.name })),
    gameStarted: !!room.gameState
  };
}

function getRoomAndIndex(roomCode, socketId) {
  const code = String(roomCode || "").toUpperCase();
  const room = rooms.get(code);
  if (!room) return { room: null, playerIndex: -1 };
  const idx = room.players.findIndex((p) => p.socketId === socketId);
  return { room, playerIndex: idx };
}

function isPlayerTurn(room, playerIndex) {
  if (!room.gameState) return false;
  return room.gameState.currentPlayerIndex === playerIndex;
}

function broadcastState(roomCode, room) {
  io.to(roomCode).emit("gameState", {
    roomCode,
    state: room.gameState
  });
}

// SOCKET.IO
io.on("connection", (socket) => {
  console.log("Nuovo client:", socket.id);

  socket.on("createRoom", async ({ playerName, totalRounds, roomName }, callback) => {
    const name = (playerName || "Giocatore").trim();
    const rounds = Number(totalRounds) || 3;

    const code = generateRoomCode();
    const cleanRoomName = (roomName || code).trim();
    const roomCode = code;

    const room = {
      hostSocketId: socket.id,
      totalRounds: rounds,
      players: [{ socketId: socket.id, name }],
      spectators: [],
      gameState: null,
      roomName: cleanRoomName,
      customPhrases: [],
      sequential: false,
      phraseIndex: 0
    };

    const { phrases, sequential } = await loadPhrasesForRoom(cleanRoomName);
    room.customPhrases = phrases;
    room.sequential = sequential;

    rooms.set(roomCode, room);
    socket.join(roomCode);

    console.log(`Stanza ${roomCode} ('${cleanRoomName}') creata da ${name}`);

    callback?.({
      ok: true,
      roomCode,
      roomName: cleanRoomName,
      isHost: true,
      playerName: name,
      room: serializeRoom(roomCode, room)
    });

    io.to(roomCode).emit("roomUpdate", { roomCode, room: serializeRoom(roomCode, room) });
  });

  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    const code = String(roomCode || "").toUpperCase();
    const name = (playerName || "Giocatore").trim();
    const room = rooms.get(code);

    if (!room) return callback?.({ ok: false, error: "Stanza inesistente" });
    if (room.players.length >= 4)
      return callback?.({ ok: false, error: "Stanza piena (max 4 giocatori)" });

    room.players.push({ socketId: socket.id, name });
    socket.join(code);

    console.log(`${name} è entrato nella stanza ${code} come giocatore`);

    callback?.({
      ok: true,
      roomCode: code,
      roomName: room.roomName,
      isHost: socket.id === room.hostSocketId,
      playerName: name,
      room: serializeRoom(code, room)
    });

    io.to(code).emit("roomUpdate", { roomCode: code, room: serializeRoom(code, room) });
  });

  socket.on("joinAsSpectator", ({ roomCode, name }, callback) => {
    const code = String(roomCode || "").toUpperCase();
    const cleanName = (name || "Spettatore").trim();
    const room = rooms.get(code);

    if (!room) return callback?.({ ok: false, error: "Stanza inesistente" });
    if (room.spectators.length >= 10)
      return callback?.({ ok: false, error: "Limite spettatori (10) raggiunto" });

    room.spectators.push({ socketId: socket.id, name: cleanName });
    socket.join(code);

    console.log(`${cleanName} è entrato nella stanza ${code} come spettatore`);

    callback?.({
      ok: true,
      role: "spectator",
      roomCode: code,
      roomName: room.roomName,
      room: serializeRoom(code, room)
    });

    if (room.gameState) {
      socket.emit("gameState", {
        roomCode: code,
        state: room.gameState
      });
    }

    io.to(code).emit("roomUpdate", { roomCode: code, room: serializeRoom(code, room) });
  });

  socket.on("startGame", ({ roomCode }, callback) => {
    const code = String(roomCode || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return callback?.({ ok: false, error: "Stanza inesistente" });
    if (socket.id !== room.hostSocketId)
      return callback?.({ ok: false, error: "Solo l'host può avviare" });
    if (room.players.length < 1)
      return callback?.({ ok: false, error: "Nessun giocatore" });

    const phrases = room.customPhrases.length > 0 ? room.customPhrases : defaultPhrases;

    const pickPhrase = () => {
      if (room.customPhrases.length > 0 && room.sequential) {
        const idx = room.phraseIndex % phrases.length;
        const phrase = phrases[idx];
        room.phraseIndex = (room.phraseIndex + 1) % phrases.length;
        return phrase;
      }
      const idx = Math.floor(Math.random() * phrases.length);
      return phrases[idx];
    };

    const first = pickPhrase();
    const base = createInitialGameState(
      room.players.map((p) => ({ name: p.name })),
      room.totalRounds,
      {
        vowelCost: 500,
        getNextRoundData: () => {
          const phrase = pickPhrase();
          const rows = buildBoard(phrase.text, 14, 4);
          return { phrase: phrase.text, rows, category: phrase.category };
        }
      }
    );

    const rows = buildBoard(first.text, 14, 4);
    const started = startRound(base, first.text, rows, first.category);

    room.gameState = started;

    io.to(code).emit("gameState", { roomCode: code, state: started });
    callback?.({ ok: true });
  });

  // ACTIONS
  socket.on("spin", ({ roomCode }) => {
    const { room, playerIndex } = getRoomAndIndex(roomCode, socket.id);
    if (!room || !isPlayerTurn(room, playerIndex)) return;
    room.gameState = applyWheelSpin(room.gameState, 500);
    broadcastState(roomCode, room);
  });

  socket.on("wheelOutcome", ({ roomCode, outcome }) => {
    const { room, playerIndex } = getRoomAndIndex(roomCode, socket.id);
    if (!room || !isPlayerTurn(room, playerIndex)) return;
    room.gameState = applyWheelOutcome(room.gameState, outcome);
    broadcastState(roomCode, room);
  });

  socket.on("playConsonant", ({ roomCode, letter }) => {
    const { room, playerIndex } = getRoomAndIndex(roomCode, socket.id);
    if (!room || !isPlayerTurn(room, playerIndex)) return;
    room.gameState = playConsonant(room.gameState, letter);
    broadcastState(roomCode, room);
  });

  socket.on("buyVowel", ({ roomCode, letter }) => {
    const { room, playerIndex } = getRoomAndIndex(roomCode, socket.id);
    if (!room || !isPlayerTurn(room, playerIndex)) return;
    room.gameState = buyVowel(room.gameState, letter);
    broadcastState(roomCode, room);
  });

  socket.on("solve", ({ roomCode, text }) => {
    const { room, playerIndex } = getRoomAndIndex(roomCode, socket.id);
    if (!room || !isPlayerTurn(room, playerIndex)) return;
    room.gameState = trySolve(room.gameState, text);
    broadcastState(roomCode, room);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnesso:", socket.id);
    for (const [code, room] of rooms.entries()) {
      let changed = false;

      const pIdx = room.players.findIndex((p) => p.socketId === socket.id);
      if (pIdx !== -1) {
        room.players.splice(pIdx, 1);
        changed = true;
      }

      const sIdx = room.spectators.findIndex((s) => s.socketId === socket.id);
      if (sIdx !== -1) {
        room.spectators.splice(sIdx, 1);
        changed = true;
      }

      if (changed) {
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(code);
          console.log(`Stanza ${code} eliminata`);
        } else {
          io.to(code).emit("roomUpdate", {
            roomCode: code,
            room: serializeRoom(code, room)
          });
        }
      }
    }
  });
});

app.get("/", (req, res) => res.send("Fortuna server attivo"));
server.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});
