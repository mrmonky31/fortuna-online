// server.mjs - 🎯 VERSIONE FINALE COMPLETA
// ✅ RADDOPPIA corretto (moltiplica DOPO aver trovato la lettera)
// ✅ Supporto 3 versiioni ruota
// ✅ Cambio frase funzionante
// ✅ Pulsante consonante gestito
// ✅ Import dinamico phrases con set personalizzati

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Carica frasi base
import { testPhrases } from "./game/phrases.js";

const app = express();

app.use(
  cors({
    origin: ["https://fortuna-online.vercel.app", ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://fortuna-online.vercel.app", ],
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

// ✅ NUOVO: Funzione per passare al prossimo giocatore (salta il presentatore)
function nextPlayer(gs) {
  const startIndex = gs.currentPlayerIndex;
  let nextIndex = (startIndex + 1) % gs.players.length;
  
  // Salta giocatori che sono host (presentatore)
  let attempts = 0;
  while (gs.players[nextIndex]?.isHost && attempts < gs.players.length) {
    nextIndex = (nextIndex + 1) % gs.players.length;
    attempts++;
  }
  
  // Se tutti sono host (caso impossibile), rimani dove sei
  if (attempts >= gs.players.length) {
    nextIndex = startIndex;
  }
  
  gs.currentPlayerIndex = nextIndex;
  gs.currentPlayerId = gs.players[nextIndex].id;
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

  // ✅ Usa il set frasi della room
  const { phrases, mode } = room.phraseSet;
  
  let selectedPhrase;
  if (mode === "sequential") {
    // Frasi sequenziali (1-20)
    const index = room.currentPhraseIndex % Math.min(phrases.length, 20);
    selectedPhrase = phrases[index];
    room.currentPhraseIndex++;
  } else {
    // Frasi random
    selectedPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  }

  gs.players.forEach(p => { p.roundScore = 0; });

  gs.phrase = selectedPhrase.text;
  gs.rows = buildBoard(selectedPhrase.text, 14, 4);
  gs.category = selectedPhrase.category;

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
  // ✅ Trova il primo giocatore NON-presentatore
  const firstNonHostIndex = players.findIndex(p => !p.isHost);
  const startIndex = firstNonHostIndex !== -1 ? firstNonHostIndex : 0;
  
  return {
    players: players.map(p => ({ 
      name: p.name, 
      id: p.id, 
      totalScore: 0, 
      roundScore: 0,
      isHost: p.isHost || false // ✅ Copia flag host
    })),
    totalRounds,
    currentRound: 1,
    currentPlayerIndex: startIndex, // ✅ Inizia dal primo NON-presentatore
    currentPlayerId: players[startIndex].id,

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

// ✅ Funzione per caricare frasi (personalizzate o random)
async function loadPhrases(roomName) {
  const normalized = String(roomName || "").toLowerCase().trim();
  
  if (!normalized) {
    return { phrases: testPhrases, mode: "random", customName: null };
  }
  
  const customPath = join(__dirname, "game", `phrases-${normalized}.js`);
  
  if (existsSync(customPath)) {
    try {
  const module = await import(customPath);

  const customPhrases = module.testPhrases;
  const mode = module.phraseMode === "sequential" ? "sequential" : "random";

  console.log(`✅ Set personalizzato caricato: phrases-${normalized}.js [${mode}]`);

  return {
    phrases: customPhrases,
    mode,
    customName: normalized
  };
} catch (err) {
  console.error(`❌ Errore caricamento ${customPath}:`, err);
  return {
    phrases: testPhrases,
    mode: "random",
    customName: null};
  }
}

  
  return { phrases: testPhrases, mode: "random", customName: null };
}

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
        nextPlayer(room.gameState); // ✅ Salta presentatore
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
  socket.on("createRoom", async ({ playerName, totalRounds, roomName, gameMode }, callback) => {
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
      const mode = gameMode === "presenter" ? "presenter" : "classic"; // ✅ NUOVO
      
      // ✅ Carica set frasi (personalizzato o random)
      const phraseSet = await loadPhrases(rawName);

      rooms[code] = {
        host: name,
        players: [{ name, id: socket.id, isHost: true }],
        spectators: [],
        totalRounds: Number(totalRounds) || 3,
        gameMode: mode, // ✅ NUOVO: Salva modalità
        gameState: null,
        phraseSet: phraseSet, // ✅ Salva il set frasi nella room
        currentPhraseIndex: 0, // ✅ Per modalità sequenziale
      };

      socket.join(code);
      console.log(`✅ Stanza creata: ${code} da ${name} [${mode.toUpperCase()}] [${phraseSet.mode === "sequential" ? `SET: ${phraseSet.customName}` : "RANDOM"}]`);

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

      // ✅ Controlla se esiste già un giocatore con questo NOME
      const existingPlayerByName = room.players.find(p => p.name === name);

      // ✅ Se partita iniziata, chiedi approvazione a TUTTI
      if (room.gameState && !room.gameState.gameOver) {
        console.log(`🔔 ${name} chiede di entrare a partita iniziata in ${code}`);
        
        // Manda richiesta a TUTTI i giocatori
        room.players.forEach(player => {
          io.to(player.id).emit("joinRequest", {
            playerName: name,
            playerId: socket.id,
            roomCode: code,
            type: "player",
            isReconnection: !!existingPlayerByName // ✅ Flag se è riconnessione
          });
        });
        
        if (callback) callback({ 
          ok: true, 
          pending: true,
          message: existingPlayerByName 
            ? "In attesa di approvazione per riprendere il tuo giocatore..." 
            : "In attesa di approvazione..." 
        });
        return;
      }

      // ✅ Se nome esiste MA partita NON iniziata, riprendi box direttamente
      if (existingPlayerByName) {
        existingPlayerByName.id = socket.id;
        socket.join(code);
        console.log(`✅ ${name} ha ripreso il suo box in ${code}`);
        
        io.to(code).emit("roomUpdate", { room, roomCode: code });
        
        if (callback) callback({
          ok: true,
          roomCode: code,
          room,
          playerName: name,
        });
        return;
      }

      // ✅ Partita non iniziata, entra normalmente
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

      // ✅ Se partita iniziata, chiedi approvazione a TUTTI
      if (room.gameState && !room.gameState.gameOver) {
        console.log(`🔔 ${spectatorName} chiede di entrare come spettatore a partita iniziata in ${code}`);
        
        room.players.forEach(player => {
          io.to(player.id).emit("joinRequest", {
            playerName: spectatorName,
            playerId: socket.id,
            roomCode: code,
            type: "spectator"
          });
        });
        
        if (callback) callback({ 
          ok: true, 
          pending: true,
          message: "In attesa di approvazione..." 
        });
        return;
      }

      // ✅ Partita non iniziata, entra direttamente
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

      // ✅ Usa il set frasi della room
      const { phrases, mode } = room.phraseSet;
      
      let selectedPhrase;
      if (mode === "sequential") {
        // Frasi sequenziali (1-20)
        const index = room.currentPhraseIndex % Math.min(phrases.length, 20);
        selectedPhrase = phrases[index];
        room.currentPhraseIndex++;
      } else {
        // Frasi random
        selectedPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      }

      room.gameState = initGameState(room.players, room.totalRounds, selectedPhrase.text, selectedPhrase.category);
      room.gameState.phraseMode = mode; // ✅ Salva la modalità nel gameState

      console.log("🚀 START GAME:", code, `[${selectedPhrase.category}]`, selectedPhrase.text);

      io.to(code).emit("gameStart", {
        room,
        roomCode: code,
        gameState: room.gameState,
      });
            // 🔥 FIX: dopo che la schermata di gioco è montata,
      // rimandiamo la stessa frase una volta sola con gameStateUpdate
      setTimeout(() => {
        const gs = room.gameState;
        if (!gs) return;

        // per sicurezza ricalcoliamo le righe dal testo
        gs.rows = buildBoard(gs.phrase, 14, 5);

        io.to(code).emit("gameStateUpdate", { gameState: gs });
      }, 200);


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

      // ✅ BLOCCA se modalità sequenziale
      if (room.gameState.phraseMode === "sequential") {
        if (callback) callback({ ok: false, error: "Cambio frase disabilitato in modalità sequenziale" });
        return;
      }

      const hostPlayer = room.players.find((p) => p.isHost);
      if (!hostPlayer || hostPlayer.id !== socket.id) {
        if (callback) callback({ ok: false, error: "Solo l'host può cambiare la frase" });
        return;
      }

      // ✅ Usa il set frasi della room
      const { phrases } = room.phraseSet;
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
      
      // ✅ Sceglie spicchio target
      const sliceIndex = Math.floor(Math.random() * gs.wheel.length);
      const targetSlice = gs.wheel[sliceIndex];
      
      // ✅ Gestione spicchi doppi: scegli metà sinistra o destra
      let halfOffset = 0; // Offset angolare per metà spicchio
      let chosen = targetSlice;
      
      if (typeof targetSlice === "string" && targetSlice.includes("/")) {
        const [a, b] = targetSlice.split("/");
        const isLeftHalf = Math.random() < 0.5;
        chosen = isLeftHalf ? a : b;
        
        // ✅ Calcola offset per centrare sulla metà corretta
        const SLICE_DEG = 360 / gs.wheel.length; // 18° per 20 spicchi
        halfOffset = isLeftHalf ? -SLICE_DEG / 4 : SLICE_DEG / 4; // ±4.5° per centrare su metà
      }
      
      // ✅ Calcola angolo finale preciso
      const SLICE_DEG = 360 / gs.wheel.length; // 18° per 20 spicchi
      const targetAngle = sliceIndex * SLICE_DEG + halfOffset;
      
      io.to(code).emit("wheelSpinStart", { 
        spinning: true,
        spinSeed: spinSeed,
        targetAngle: targetAngle, // ✅ Angolo preciso (con offset per mezzi spicchi)
        sliceIndex: sliceIndex
      });

      // ✅ Simula risultato dopo 5 secondi (durata max animazione 4.5s + rimbalzo 0.3s)
      setTimeout(() => {
        let outcome;
        
        if (typeof chosen === "string") {
          if (chosen === "PASSA") outcome = { type: "pass", label: "PASSA" };
          else if (chosen === "BANCAROTTA") outcome = { type: "bankrupt", label: "BANCAROTTA" };
          else if (chosen === "RADDOPPIA") outcome = { type: "double", label: "RADDOPPIA" };
          else if (!isNaN(Number(chosen))) outcome = { type: "points", value: Number(chosen), label: chosen };
          else outcome = { type: "custom", label: chosen };
        } else if (typeof chosen === "number") {
          outcome = { type: "points", value: chosen, label: chosen };
        } else {
          outcome = { type: "custom", label: String(chosen) };
        }

        gs.spinning = false;

        if (outcome.type === "points") {
          gs.lastSpinTarget = outcome.value;
          gs.mustSpin = false;
          gs.awaitingConsonant = true;
          gs.gameMessage = { type: "info", text: `Valore: ${outcome.value} pt. Inserisci una consonante.` };
          
          // ✅ MODALITÀ PRESENTATORE: Auto-attiva griglia consonanti
          if (room.gameMode === "presenter") {
            io.to(code).emit("buttonStateSync", { 
              type: "consonant", 
              playerId: gs.currentPlayerId 
            });
          }
        } else if (outcome.type === "double") {
  // 🎯 Lo spicchio RADDOPPIA NON assegna punti ora.
  // Attende una consonante per decidere se raddoppiare o no.
  gs.pendingDouble = true;
  gs.mustSpin = false;
  gs.awaitingConsonant = true;
  gs.lastSpinTarget = 100; // valore base se roundScore era 0
  gs.gameMessage = {
    type: "info",
    text: "🎯 RADDOPPIA: inserisci una consonante!"
  };
  
  // ✅ MODALITÀ PRESENTATORE: Auto-attiva griglia consonanti
  if (room.gameMode === "presenter") {
    io.to(code).emit("buttonStateSync", { 
      type: "consonant", 
      playerId: gs.currentPlayerId 
    });
  }
        } else if (outcome.type === "pass") {
          nextPlayer(gs); // ✅ Salta presentatore
          gs.mustSpin = true;
          gs.lastSpinTarget = 0;
          gs.gameMessage = { type: "warning", text: "PASSA: turno al prossimo." };
        } else if (outcome.type === "bankrupt") {
          const i = gs.currentPlayerIndex;
          gs.players[i].roundScore = 0;
          gs.players[i].totalScore = 0;
          nextPlayer(gs); // ✅ Salta presentatore
          gs.mustSpin = true;
          gs.lastSpinTarget = 0;
          gs.gameMessage = { type: "error", text: "BANCAROTTA: punteggi azzerati!" };
        }

        io.to(code).emit("gameStateUpdate", { gameState: gs });
      }, 5000);

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore spinWheel:", err);
      if (callback) callback({ ok: false, error: "Errore spin" });
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

      // ✅ MODALITÀ PRESENTATORE: Mostra griglia al presentatore
      if (room.gameMode === "presenter" && !letter) {
        const host = room.players.find(p => p.isHost);
        if (host) {
          // Invia a tutti per sincronizzare illuminazione pulsanti
          io.to(code).emit("buttonStateSync", { 
            type: "consonant", 
            playerId: socket.id 
          });
          if (callback) callback({ ok: true });
          return;
        }
      }

      if (gs.currentPlayerId !== socket.id && room.gameMode !== "presenter") {
        if (callback) callback({ ok: false, error: "Non è il tuo turno" });
        return;
      }

      const upper = normalizeText(letter).charAt(0);
      const isVowel = "AEIOU".includes(upper);

      if (isVowel || !/^[A-Z]$/.test(upper)) {
        if (callback) callback({ ok: false, error: "Inserisci una CONSONANTE" });
        return;
      }

      // ❌ Se la consonante è già usata → PASSA IL TURNO
if (gs.usedLetters.includes(upper)) {
  // annulla eventuale raddoppia
  gs.pendingDouble = false;
  gs.awaitingConsonant = false;
  gs.mustSpin = true;

  // passa al prossimo giocatore
  nextPlayer(gs); // ✅ Salta presentatore

  gs.gameMessage = {
    type: "error",
    text: `❌ ${upper} già usata. Turno al prossimo.`
  };

  io.to(code).emit("gameStateUpdate", { gameState: gs });
  if (callback) callback({ ok: true });
  return;
}


      gs.usedLetters.push(upper);

      const phrase = normalizeText(gs.phrase);
      const hits = [...phrase].filter(ch => normalizeText(ch) === upper && !/[AEIOU]/.test(ch)).length;

      if (hits > 0) {
        const i = gs.currentPlayerIndex;
        
        // ✅ RADDOPPIA CORRETTO: Moltiplica i punti GUADAGNATI, non il totale
        let gained = gs.lastSpinTarget * hits;
        
        if (gs.pendingDouble) {
  const i = gs.currentPlayerIndex;
  const roundScore = gs.players[i].roundScore;

  if (hits > 0) {
    // 🎯 Se la consonante è trovata:
    if (roundScore > 0) {
      // Caso 1: ci sono già punti → raddoppia tutto il round
      gs.players[i].roundScore = roundScore * 2;
      gained = 0; // nessun nuovo guadagno da consonante
      gs.gameMessage = {
        type: "success",
        text: `🎯 RADDOPPIA riuscito! Punteggio raddoppiato a ${gs.players[i].roundScore}!`
      };
    } else {
      // Caso 2: nessun punto → comportarsi come spicchio 100
      gained = hits * 100;
      gs.players[i].roundScore += gained;
      gs.gameMessage = {
        type: "success",
        text: `🎯 Lettere trovate! +${gained} pt (valore 100 per RADDOPPIA)`
      };
    }
  } else {
    // ❌ Consonante NON trovata → passa turno e niente raddoppio
    gs.pendingDouble = false;
    gs.awaitingConsonant = false;
    gs.mustSpin = true;
    nextPlayer(gs); // ✅ Salta presentatore
    gs.gameMessage = {
      type: "error",
      text: "❌ Nessuna lettera. RADDOPPIA annullato, turno al prossimo."
    };

    io.to(code).emit("gameStateUpdate", { gameState: gs });
    if (callback) callback({ ok: true });
    return;
  }

  gs.pendingDouble = false;
}

        
        gs.players[i].roundScore += gained;
        
        gs.revealedLetters.push(upper);
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        
        const message = gs.pendingDouble 
          ? `Trovate ${hits} ${upper}! +${gained} pt (RADDOPPIATI!)`
          : `Trovate ${hits} ${upper}! +${gained} pt`;
        
        gs.gameMessage = { type: "success", text: message };
      } else {
        nextPlayer(gs); // ✅ Salta presentatore
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

      // ✅ MODALITÀ PRESENTATORE: Mostra griglia al presentatore
      if (room.gameMode === "presenter" && !letter) {
        const host = room.players.find(p => p.isHost);
        if (host) {
          // Invia a tutti per sincronizzare illuminazione pulsanti
          io.to(code).emit("buttonStateSync", { 
            type: "vowel", 
            playerId: socket.id 
          });
          if (callback) callback({ ok: true });
          return;
        }
      }

      if (gs.currentPlayerId !== socket.id && room.gameMode !== "presenter") {
        if (callback) callback({ ok: false, error: "Non è il tuo turno" });
        return;
      }

      const upper = normalizeText(letter).charAt(0);
      const isVowel = "AEIOU".includes(upper);

      if (!isVowel || !/^[A-Z]$/.test(upper)) {
        if (callback) callback({ ok: false, error: "Inserisci una VOCALE (A,E,I,O,U)" });
        return;
      }

      // ❌ Se la vocale è già usata → PASSA IL TURNO
if (gs.usedLetters.includes(upper)) {
  // Annulla eventuali stati speciali
  gs.pendingDouble = false;
  gs.awaitingConsonant = false;
  gs.mustSpin = true;

  // Passa turno
  nextPlayer(gs); // ✅ Salta presentatore

  gs.gameMessage = {
    type: "error",
    text: `❌ ${upper} già usata. Turno al prossimo.`
  };

  io.to(code).emit("gameStateUpdate", { gameState: gs });
  if (callback) callback({ ok: true });
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

      // ✅ MODALITÀ PRESENTATORE: Notifica presentatore e attendi verifica
      if (room.gameMode === "presenter") {
        const host = room.players.find(p => p.isHost);
        if (host) {
          // Invia a tutti per sincronizzare illuminazione pulsanti
          io.to(code).emit("buttonStateSync", { 
            type: "solution", 
            playerId: socket.id 
          });
          
          // ✅ Invia evento al presentatore per mostrare pulsanti verifica
          io.to(host.id).emit("solutionAttempt", {
            playerName: gs.players[gs.currentPlayerIndex].name
          });
          
          gs.gameMessage = { type: "info", text: "In attesa di verifica del presentatore..." };
          io.to(code).emit("gameStateUpdate", { gameState: gs });
          
          if (callback) callback({ ok: true });
          return;
        }
      }

      // ✅ MODALITÀ CLASSICA: Verifica automatica
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
        nextPlayer(gs); // ✅ Salta presentatore
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

      nextPlayer(gs); // ✅ Salta presentatore
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

  // ✅ ACCETTA RICHIESTA JOIN
  socket.on("acceptJoinRequest", ({ playerId, playerName, roomCode, type, isReconnection }) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];
      if (!room) return;

      // Verifica che chi accetta sia un giocatore della stanza
      const acceptingPlayer = room.players.find(p => p.id === socket.id);
      if (!acceptingPlayer) return;

      const targetSocket = io.sockets.sockets.get(playerId);
      if (!targetSocket) return;

      if (type === "player") {
        // ✅ Se è riconnessione, aggiorna box esistente
        if (isReconnection) {
          const existingPlayer = room.players.find(p => p.name === playerName);
          if (existingPlayer) {
            const oldSocketId = existingPlayer.id;
            existingPlayer.id = playerId;
            
            // Aggiorna anche in gameState
            if (room.gameState && room.gameState.players) {
              const gsPlayer = room.gameState.players.find(p => p.id === oldSocketId || p.name === playerName);
              if (gsPlayer) {
                gsPlayer.id = playerId;
                console.log(`🔄 ${playerName} ha ripreso il suo box in gameState`);
              }
            }
            
            targetSocket.join(code);
            console.log(`✅ ${playerName} ha ripreso il suo box approvato da ${acceptingPlayer.name}`);
            
            // Notifica TUTTI che richiesta risolta
            room.players.forEach(player => {
              io.to(player.id).emit("joinRequestResolved", { playerId });
            });
            
            io.to(playerId).emit("joinRequestAccepted", {
              roomCode: code,
              room,
              playerName
            });
            
            io.to(code).emit("roomUpdate", { room, roomCode: code });
            if (room.gameState) {
              io.to(code).emit("gameStateUpdate", { gameState: room.gameState });
            }
            return;
          }
        }
        
        // ✅ Altrimenti crea nuovo giocatore
        if (room.players.some(p => p.id === playerId)) {
          console.log(`⚠️ ${playerName} già aggiunto`);
          return;
        }
        
        room.players.push({ 
          name: playerName, 
          id: playerId, 
          isHost: false 
        });
        
        // Aggiungi al gameState se partita in corso
        if (room.gameState) {
          room.gameState.players.push({ 
            name: playerName, 
            id: playerId, 
            totalScore: 0, 
            roundScore: 0 
          });
        }
      } else if (type === "spectator") {
        if (!room.spectators) room.spectators = [];
        room.spectators.push({ 
          name: playerName, 
          id: playerId
        });
      }

      targetSocket.join(code);
      console.log(`✅ ${playerName} approvato da ${acceptingPlayer.name} in ${code}`);

      // Notifica TUTTI che richiesta risolta
      room.players.forEach(player => {
        io.to(player.id).emit("joinRequestResolved", { playerId });
      });

      // Notifica l'utente che è stato accettato
      io.to(playerId).emit("joinRequestAccepted", {
        roomCode: code,
        room,
        playerName
      });

      // Aggiorna tutti
      io.to(code).emit("roomUpdate", { room, roomCode: code });
      if (room.gameState) {
        io.to(code).emit("gameStateUpdate", { gameState: room.gameState });
      }
    } catch (err) {
      console.error("Errore acceptJoinRequest:", err);
    }
  });

  // ✅ RIFIUTA RICHIESTA JOIN
  socket.on("rejectJoinRequest", ({ playerId, roomCode }) => {
    try {
      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        io.to(playerId).emit("joinRequestRejected", {
          message: "Richiesta rifiutata"
        });
      }
      
      // Notifica TUTTI che richiesta risolta
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];
      if (room) {
        room.players.forEach(player => {
          io.to(player.id).emit("joinRequestResolved", { playerId });
        });
      }
    } catch (err) {
      console.error("Errore rejectJoinRequest:", err);
    }
  });

  // ✅ MESSAGGI SPETTATORI → GIOCATORI
  socket.on("sendMessageToPlayer", ({ toPlayerId, message, fromName }) => {
    try {
      const targetSocket = io.sockets.sockets.get(toPlayerId);
      if (targetSocket) {
        io.to(toPlayerId).emit("messageReceived", {
          from: fromName,
          message: message,
          timestamp: Date.now()
        });
        console.log(`💬 Messaggio da ${fromName} a ${toPlayerId}: ${message}`);
      }
    } catch (err) {
      console.error("Errore sendMessageToPlayer:", err);
    }
  });

  // ✅ MODALITÀ PRESENTATORE: Verifica soluzione
  socket.on("presenterSolutionCheck", ({ roomCode, isCorrect }) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) return;
      if (room.gameMode !== "presenter") return;

      const gs = room.gameState;
      const i = gs.currentPlayerIndex;

      if (isCorrect) {
        // ✅ Soluzione corretta
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
        // ❌ Soluzione sbagliata
        nextPlayer(gs); // ✅ Salta presentatore
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.pendingDouble = false;
        gs.gameMessage = { type: "error", text: "Soluzione non corretta." };

        io.to(code).emit("gameStateUpdate", { gameState: gs });
      }

      console.log(`🎯 Presentatore verifica soluzione: ${isCorrect ? "CORRETTA" : "SBAGLIATA"}`);
    } catch (err) {
      console.error("Errore presenterSolutionCheck:", err);
    }
  });

  // ✅ NUOVO: Richiesta stato gioco (per riconnessione)
  socket.on("requestGameState", ({ roomCode }) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];
      
      if (room && room.gameState) {
        socket.emit("gameStateUpdate", { gameState: room.gameState });
        console.log(`🔄 Stato gioco inviato a ${socket.id} per room ${code}`);
      }
    } catch (err) {
      console.error("Errore requestGameState:", err);
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
