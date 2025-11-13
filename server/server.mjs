// server.mjs - 🎯 VERSIONE FINALE COMPLETA
// ✅ RADDOPPIA corretto (moltiplica DOPO aver trovato la lettera)
// ✅ Supporto 3 versiioni ruota
// ✅ Cambio frase funzionante
// ✅ Pulsante consonante gestito

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: ["https://fortuna-online.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://fortuna-online.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 10000;

// ==================== LOGICA DI GIOCO ====================

const SPIN_PATTERNS = [
  [100, 200, 300, 400, 500, 600, 700, "PASSA", 800, 1000, "BANCAROTTA", 200, 400, "RADDOPPIA", 500, 300, "PASSA/BANCAROTTA", 700, 800, 1000],
  [200, 400, 600, "PASSA", 800, 1000, 1000, 700, "RADDOPPIA", 500, "BANCAROTTA", 300, 400, "PASSA/BANCAROTTA", 800, 700, 600, 500, 300, "BANCAROTTA/RADDOPPIA"],
  [100, "PASSA", 5000, "BANCAROTTA", 800, 1000, 400, "PASSA/BANCAROTTA", 300, 700, "RADDOPPIA", 1000, 600, "BANCAROTTA/RADDOPPIA", 200, 400, 500, 300, 700, 800],
  [100, 200, 300, "PASSA", 400, 500, 600, "PASSA/BANCAROTTA", 300, 400, "RADDOPPIA", 500, 600, 700, "BANCAROTTA", 200, 300, 400, 500, "BANCAROTTA/RADDOPPIA"],
];

function normalizeText(str = "") {
  return String(str)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['´`']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBoard(text, maxCols = 14, maxRows = 4) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const rows = [];
  let cur = "";

  const flush = () => {
    rows.push(cur);
    cur = "";
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (cur.length === 0) {
      if (w.length <= maxCols) {
        cur = w;
      } else {
        cur = w.slice(0, maxCols);
        flush();
        let rest = w.slice(maxCols);
        while (rest.length > 0) {
          cur = rest.slice(0, maxCols);
          flush();
          rest = rest.slice(maxCols);
          if (rows.length >= maxRows) break;
        }
        cur = "";
      }
    } else {
      if (cur.length + 1 + w.length <= maxCols) {
        cur += " " + w;
      } else {
        flush();
        i--;
      }
    }
    if (rows.length >= maxRows) break;
  }
  if (rows.length < maxRows && cur.length > 0) flush();
  return rows.slice(0, maxRows);
}

function generateWheel() {
  const idx = Math.floor(Math.random() * SPIN_PATTERNS.length);
  return SPIN_PATTERNS[idx];
}

function nextRound(roomCode, room) {
  const gs = room.gameState;

  gs.currentRound += 1;

  if (gs.currentRound > gs.totalRounds) {
    gs.gameOver = true;
    gs.gameMessage = { type: "success", text: "🎉 Partita terminata!" };
    io.to(roomCode).emit("gameStateUpdate", { gameState: gs });
    return;
  }

  const phrases = [
    { category: "CINEMA", text: "IL SIGNORE DEGLI ANELLI" },
    { category: "MUSICA", text: "VIVA LA VIDA" },
    { category: "SPORT", text: "CALCIO DI RIGORE" },
    { category: "NATURA", text: "ALBERI SECOLARI" },
    { category: "STORIA", text: "IMPERO ROMANO" },
    { category: "GEOGRAFIA", text: "TORRE DI PISA" },
    { category: "CIBO", text: "PIZZA MARGHERITA" },
    { category: "ANIMALI", text: "LEONE DELLA SAVANA" },
  ];
  const random = phrases[Math.floor(Math.random() * phrases.length)];

  gs.players.forEach(p => { p.roundScore = 0; });

  gs.phrase = random.text;
  gs.rows = buildBoard(random.text, 14, 4);
  gs.category = random.category;

  gs.revealedLetters = [];
  gs.usedLetters = [];

  gs.wheel = generateWheel();
  gs.mustSpin = true;
  gs.awaitingConsonant = false;
  gs.pendingDouble = false;
  gs.lastSpinTarget = 0;
  gs.spinning = false;

  gs.gameMessage = { type: "info", text: `🎬 Round ${gs.currentRound}/${gs.totalRounds}` };

  io.to(roomCode).emit("gameStateUpdate", { gameState: gs });
}

function initGameState(players, totalRounds, phrase, category) {
  return {
    players: players.map(p => ({ name: p.name, id: p.id, totalScore: 0, roundScore: 0 })),
    totalRounds,
    currentRound: 1,
    currentPlayerIndex: 0,
    currentPlayerId: players[0].id,

    phrase,
    rows: buildBoard(phrase, 14, 4),
    category,

    revealedLetters: [],
    usedLetters: [],

    wheel: generateWheel(),
    spinning: false,
    mustSpin: true,
    awaitingConsonant: false,
    pendingDouble: false,
    lastSpinTarget: 0,

    gameMessage: { type: "info", text: "🎬 Nuovo round!" },
    gameOver: false,
  };
}

// ==================== STANZE ====================

const rooms = {};
const disconnectionTimeouts = {};

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

function handleTemporaryDisconnect(socketId, code, room) {
  console.log(`⏳ Timeout disconnessione per ${socketId} in ${code}`);
  
  const player = room.players?.find(p => p.id === socketId);
  if (!player) return;

  io.to(code).emit("playerDisconnected", {
    playerName: player.name,
    timeout: 30
  });

  disconnectionTimeouts[socketId] = setTimeout(() => {
    console.log(`❌ Timeout scaduto per ${socketId}, rimozione permanente`);
    
    const idx = room.players.findIndex((p) => p.id === socketId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      
      if (room.gameState && room.gameState.currentPlayerId === socketId) {
        room.gameState.currentPlayerIndex = (room.gameState.currentPlayerIndex + 1) % room.players.length;
        if (room.players.length > 0) {
          room.gameState.currentPlayerId = room.players[room.gameState.currentPlayerIndex].id;
        }
        io.to(code).emit("gameStateUpdate", { gameState: room.gameState });
      }
      
      io.to(code).emit("roomUpdate", { room, roomCode: code });
      
      if (room.players.length === 0) {
        console.log(`🗑️ Stanza ${code} eliminata (nessun giocatore)`);
        delete rooms[code];
      }
    }
  }, 30000);
}

// ==================== SOCKET.IO ====================

io.on("connection", (socket) => {
  console.log("🔌 Connessione:", socket.id);

  if (disconnectionTimeouts[socket.id]) {
    clearTimeout(disconnectionTimeouts[socket.id]);
    delete disconnectionTimeouts[socket.id];
    console.log("✅ Giocatore riconnesso:", socket.id);
  }

  // CREA STANZA
  socket.on("createRoom", ({ playerName, totalRounds, roomName }, callback) => {
    try {
      const rawName = roomName && String(roomName).trim();
      const code = rawName && rawName.length > 0
        ? String(rawName).toUpperCase().slice(0, 10)
        : Math.random().toString(36).slice(2, 8).toUpperCase();

      if (rooms[code]) {
        if (callback) callback({ ok: false, error: "Stanza già esistente, riprova" });
        return;
      }

      const name = String(playerName || "").trim() || "Giocatore";

      rooms[code] = {
        host: name,
        players: [{ name, id: socket.id, isHost: true }],
        spectators: [],
        totalRounds: Number(totalRounds) || 3,
        gameState: null,
      };

      socket.join(code);
      console.log(`✅ Stanza creata: ${code} da ${name}`);

      if (callback) callback({
        ok: true,
        roomCode: code,
        roomName: code,
        room: rooms[code],
        playerName: name,
      });
    } catch (err) {
      console.error("Errore createRoom:", err);
      if (callback) callback({ ok: false, error: "Errore server" });
    }
  });

  // UNISCITI A STANZA
  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      const name = String(playerName || "").trim() || "Giocatore";

      if (room.players.some((p) => p.id === socket.id)) {
        if (callback) callback({ ok: false, error: "Sei già nella stanza" });
        return;
      }

      room.players.push({ name, id: socket.id, isHost: false });
      socket.join(code);

      console.log(`✅ ${name} entra in ${code}`);

      io.to(code).emit("roomUpdate", { room, roomCode: code });

      if (callback) callback({
        ok: true,
        roomCode: code,
        room,
        playerName: name,
      });
    } catch (err) {
      console.error("Errore joinRoom:", err);
      if (callback) callback({ ok: false, error: "Errore ingresso" });
    }
  });

  // ENTRA COME SPETTATORE
  socket.on("joinAsSpectator", ({ roomCode, name }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      const spectatorName = String(name || "").trim() || "Spettatore";

      if (!room.spectators) room.spectators = [];
      room.spectators.push({ name: spectatorName, id: socket.id });

      socket.join(code);
      console.log(`👁️ ${spectatorName} entra come spettatore in ${code}`);

      io.to(code).emit("roomUpdate", { room, roomCode: code });

      if (callback) callback({
        ok: true,
        roomCode: code,
        room,
        playerName: spectatorName,
      });
    } catch (err) {
      console.error("Errore joinAsSpectator:", err);
      if (callback) callback({ ok: false, error: "Errore spettatore" });
    }
  });

  // ESCI DA STANZA
  socket.on("leaveRoom", ({ roomCode }) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) return;

      socket.leave(code);

      const pIdx = room.players?.findIndex((p) => p.id === socket.id);
      if (pIdx !== -1) {
        room.players.splice(pIdx, 1);
        console.log(`👋 Giocatore uscito: ${code}`);
      }

      const sIdx = room.spectators?.findIndex((s) => s.id === socket.id);
      if (sIdx !== -1) {
        room.spectators.splice(sIdx, 1);
        console.log(`👋 Spettatore uscito: ${code}`);
      }

      if (room.players.length === 0) {
        console.log(`🗑️ Stanza ${code} eliminata`);
        delete rooms[code];
      } else {
        io.to(code).emit("roomUpdate", { room, roomCode: code });
      }
    } catch (err) {
      console.error("Errore leaveRoom:", err);
    }
  });

  // INIZIA PARTITA
  socket.on("startGame", ({ roomCode }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      const hostPlayer = room.players.find((p) => p.isHost);
      if (!hostPlayer || hostPlayer.id !== socket.id) {
        if (callback) callback({ ok: false, error: "Solo l'host può avviare" });
        return;
      }

      if (room.players.length < 1) {
        if (callback) callback({ ok: false, error: "Servono almeno 1 giocatore" });
        return;
      }

      const phrases = [
        { category: "CINEMA", text: "IL SIGNORE DEGLI ANELLI" },
        { category: "MUSICA", text: "VIVA LA VIDA" },
        { category: "SPORT", text: "CALCIO DI RIGORE" },
        { category: "NATURA", text: "ALBERI SECOLARI" },
      ];
      const random = phrases[Math.floor(Math.random() * phrases.length)];

      room.gameState = initGameState(room.players, room.totalRounds, random.text, random.category);

      console.log("🚀 START GAME:", code);

      io.to(code).emit("gameStart", {
        room,
        roomCode: code,
        gameState: room.gameState,
      });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore startGame:", err);
      if (callback) callback({ ok: false, error: "Errore avvio" });
    }
  });

  // ✅ CAMBIA FRASE
  socket.on("changePhrase", ({ roomCode }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      const hostPlayer = room.players.find((p) => p.isHost);
      if (!hostPlayer || hostPlayer.id !== socket.id) {
        if (callback) callback({ ok: false, error: "Solo l'host può cambiare la frase" });
        return;
      }

      const phrases = [
        { category: "CINEMA", text: "IL SIGNORE DEGLI ANELLI" },
        { category: "MUSICA", text: "VIVA LA VIDA" },
        { category: "SPORT", text: "CALCIO DI RIGORE" },
        { category: "NATURA", text: "ALBERI SECOLARI" },
        { category: "STORIA", text: "IMPERO ROMANO" },
        { category: "GEOGRAFIA", text: "TORRE DI PISA" },
        { category: "CIBO", text: "PIZZA MARGHERITA" },
        { category: "ANIMALI", text: "LEONE DELLA SAVANA" },
      ];
      const random = phrases[Math.floor(Math.random() * phrases.length)];

      const gs = room.gameState;
      gs.phrase = random.text;
      gs.rows = buildBoard(random.text, 14, 4);
      gs.category = random.category;
      gs.revealedLetters = [];
      gs.usedLetters = [];
      gs.mustSpin = true;
      gs.awaitingConsonant = false;
      gs.gameMessage = { type: "info", text: "📝 Nuova frase caricata!" };

      io.to(code).emit("gameStateUpdate", { gameState: gs });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore changePhrase:", err);
      if (callback) callback({ ok: false, error: "Errore cambio frase" });
    }
  });

  // GIRA RUOTA
  socket.on("spinWheel", ({ roomCode }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      const gs = room.gameState;

      if (gs.currentPlayerId !== socket.id) {
        if (callback) callback({ ok: false, error: "Non è il tuo turno" });
        return;
      }

      if (!gs.mustSpin) {
        if (callback) callback({ ok: false, error: "Devi prima giocare una lettera" });
        return;
      }

      gs.spinning = true;
      
      // ✅ Genera seed per sincronizzazione
      const spinSeed = Date.now();
      
      io.to(code).emit("wheelSpinStart", { 
        spinning: true,
        spinSeed: spinSeed
      });

      // ✅ NON calcolare outcome qui - lo fa Wheel.jsx client-side
      // Il server aspetta solo che il client invii l'outcome

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore spinWheel:", err);
      if (callback) callback({ ok: false, error: "Errore spin" });
    }
  });

  // ✅ RICEVI RISULTATO RUOTA DAL CLIENT
  socket.on("wheelResult", ({ roomCode, outcome }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      const gs = room.gameState;
      gs.spinning = false;

      if (outcome.type === "points") {
        gs.lastSpinTarget = outcome.value;
        gs.mustSpin = false;
        gs.awaitingConsonant = true;
        gs.gameMessage = { type: "info", text: `Valore: ${outcome.value} pt. Inserisci una consonante.` };
      } else if (outcome.type === "double") {
        gs.pendingDouble = true;
        gs.mustSpin = false;
        gs.awaitingConsonant = true;
        gs.lastSpinTarget = 0;
        gs.gameMessage = { type: "info", text: "🎯 RADDOPPIA: gioca una consonante!" };
      } else if (outcome.type === "pass") {
        gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
        gs.currentPlayerId = gs.players[gs.currentPlayerIndex].id;
        gs.mustSpin = true;
        gs.lastSpinTarget = 0;
        gs.gameMessage = { type: "warning", text: "PASSA: turno al prossimo." };
      } else if (outcome.type === "bankrupt") {
        const i = gs.currentPlayerIndex;
        gs.players[i].roundScore = 0;
        gs.players[i].totalScore = 0;
        gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
        gs.currentPlayerId = gs.players[gs.currentPlayerIndex].id;
        gs.mustSpin = true;
        gs.lastSpinTarget = 0;
        gs.gameMessage = { type: "error", text: "BANCAROTTA: punteggi azzerati!" };
      }

      io.to(code).emit("gameStateUpdate", { gameState: gs });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore wheelResult:", err);
      if (callback) callback({ ok: false, error: "Errore risultato" });
    }
  });

  // ✅ GIOCA CONSONANTE - RADDOPPIA CORRETTO
  socket.on("playConsonant", ({ roomCode, letter }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      const gs = room.gameState;

      if (gs.currentPlayerId !== socket.id) {
        if (callback) callback({ ok: false, error: "Non è il tuo turno" });
        return;
      }

      const upper = normalizeText(letter).charAt(0);
      const isVowel = "AEIOU".includes(upper);

      if (isVowel || !/^[A-Z]$/.test(upper)) {
        if (callback) callback({ ok: false, error: "Inserisci una CONSONANTE" });
        return;
      }

      if (gs.usedLetters.includes(upper)) {
        if (callback) callback({ ok: false, error: "Lettera già usata" });
        return;
      }

      gs.usedLetters.push(upper);

      const phrase = normalizeText(gs.phrase);
      const hits = [...phrase].filter(ch => normalizeText(ch) === upper && !/[AEIOU]/.test(ch)).length;

      if (hits > 0) {
        const i = gs.currentPlayerIndex;
        
        // ✅ RADDOPPIA CORRETTO
        let gained = gs.lastSpinTarget * hits;
        
        if (gs.pendingDouble) {
          // ✅ Se roundScore è 0, RADDOPPIA vale 100 punti base
          if (gs.players[i].roundScore === 0) {
            gained = 100;
          } else {
            gained *= 2;
          }
          gs.pendingDouble = false;
        }
        
        gs.players[i].roundScore += gained;
        
        gs.revealedLetters.push(upper);
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        
        const message = gs.pendingDouble && gs.players[i].roundScore === 0
          ? `Trovate ${hits} ${upper}! +100 pt (RADDOPPIA da 0!)`
          : gs.pendingDouble 
          ? `Trovate ${hits} ${upper}! +${gained} pt (RADDOPPIATI!)`
          : `Trovate ${hits} ${upper}! +${gained} pt`;
        
        gs.gameMessage = { type: "success", text: message };
      } else {
        gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
        gs.currentPlayerId = gs.players[gs.currentPlayerIndex].id;
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.pendingDouble = false;
        gs.lastSpinTarget = 0;
        gs.gameMessage = { type: "error", text: `Nessuna ${upper}. Turno al prossimo.` };
      }

      io.to(code).emit("gameStateUpdate", { gameState: gs });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore playConsonant:", err);
      if (callback) callback({ ok: false, error: "Errore consonante" });
    }
  });

  // COMPRA VOCALE
  socket.on("playVowel", ({ roomCode, letter }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      const gs = room.gameState;

      if (gs.currentPlayerId !== socket.id) {
        if (callback) callback({ ok: false, error: "Non è il tuo turno" });
        return;
      }

      const upper = normalizeText(letter).charAt(0);
      const isVowel = "AEIOU".includes(upper);

      if (!isVowel || !/^[A-Z]$/.test(upper)) {
        if (callback) callback({ ok: false, error: "Inserisci una VOCALE (A,E,I,O,U)" });
        return;
      }

      if (gs.usedLetters.includes(upper)) {
        if (callback) callback({ ok: false, error: "Vocale già usata" });
        return;
      }

      const cost = 500;
      const i = gs.currentPlayerIndex;

      if (gs.players[i].roundScore < cost) {
        if (callback) callback({ ok: false, error: `Servono almeno ${cost} punti per comprare una vocale` });
        return;
      }

      gs.players[i].roundScore -= cost;
      gs.usedLetters.push(upper);

      const phrase = normalizeText(gs.phrase);
      const hits = [...phrase].filter(ch => normalizeText(ch) === upper && "AEIOU".includes(ch)).length;

      if (hits > 0) {
        gs.revealedLetters.push(upper);
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.gameMessage = { type: "success", text: `Rivelate ${hits} ${upper}! (-${cost} pt)` };
      } else {
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.gameMessage = { type: "error", text: `Nessuna ${upper}. (-${cost} pt)` };
      }

      io.to(code).emit("gameStateUpdate", { gameState: gs });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore playVowel:", err);
      if (callback) callback({ ok: false, error: "Errore vocale" });
    }
  });

  // RISOLVI FRASE
  socket.on("trySolution", ({ roomCode, text }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      const gs = room.gameState;

      if (gs.currentPlayerId !== socket.id) {
        if (callback) callback({ ok: false, error: "Non è il tuo turno" });
        return;
      }

      const guess = normalizeText(text);
      const target = normalizeText(gs.phrase);

      if (!guess) {
        if (callback) callback({ ok: false, error: "Scrivi una soluzione" });
        return;
      }

      if (guess === target) {
        const i = gs.currentPlayerIndex;
        const winnerName = gs.players[i].name;
        
        gs.players[i].totalScore += gs.players[i].roundScore;
        const bonus = 1000;
        gs.players[i].totalScore += bonus;

        const allLetters = [...normalizeText(gs.phrase)].filter(ch => /[A-Z]/.test(ch));
        gs.revealedLetters = [...new Set(allLetters)];

        gs.gameMessage = { type: "success", text: `✅ ${winnerName} ha indovinato! +${bonus} BONUS!` };
        gs.mustSpin = false;
        gs.awaitingConsonant = false;
        gs.pendingDouble = false;

        io.to(code).emit("roundWon", {
          winnerName,
          countdown: 7
        });

        io.to(code).emit("gameStateUpdate", { gameState: gs });

        setTimeout(() => {
          nextRound(code, room);
        }, 7000);

      } else {
        gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
        gs.currentPlayerId = gs.players[gs.currentPlayerIndex].id;
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.pendingDouble = false;
        gs.gameMessage = { type: "error", text: "Soluzione non corretta. Turno al prossimo." };

        io.to(code).emit("gameStateUpdate", { gameState: gs });
      }

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore trySolution:", err);
      if (callback) callback({ ok: false, error: "Errore soluzione" });
    }
  });

  // PASSA TURNO
  socket.on("passTurn", ({ roomCode }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      const gs = room.gameState;

      if (gs.currentPlayerId !== socket.id) {
        if (callback) callback({ ok: false, error: "Non è il tuo turno" });
        return;
      }

      gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
      gs.currentPlayerId = gs.players[gs.currentPlayerIndex].id;
      gs.mustSpin = true;
      gs.awaitingConsonant = false;
      gs.pendingDouble = false;
      gs.gameMessage = { type: "info", text: "⏩ Turno passato al prossimo giocatore." };

      io.to(code).emit("gameStateUpdate", { gameState: gs });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore passTurn:", err);
      if (callback) callback({ ok: false, error: "Errore passa turno" });
    }
  });

  // DISCONNESSIONE
  socket.on("disconnect", () => {
    const info = findRoomBySocketId(socket.id);
    if (!info) {
      console.log("❌ Disconnessione:", socket.id);
      return;
    }

    const { code, room, role } = info;

    try {
      if (role === "player") {
        handleTemporaryDisconnect(socket.id, code, room);
      }

      if (role === "spectator") {
        const idx = room.spectators?.findIndex((s) => s.id === socket.id);
        if (idx !== -1) {
          room.spectators.splice(idx, 1);
          console.log(`👋 Spettatore uscito: ${code}`);
          io.to(code).emit("roomUpdate", { room, roomCode: code });
        }
      }
    } catch (err) {
      console.error("Errore disconnect:", err);
    }

    console.log("❌ Disconnessione:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server su porta ${PORT}`);
  console.log("✅ CORS abilitato per localhost e Vercel");
});
