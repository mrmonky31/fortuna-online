// server.mjs - 🎯 VERSIONE FINALE COMPLETA
// ✅ RADDOPPIA corretto (moltiplica DOPO aver trovato la lettera)
// ✅ Supporto 3 versiioni ruota
// ✅ Cambio frase funzionante
// ✅ Pulsante consonante gestito
// ✅ Import dinamico phrases con set personalizzati
// 🔧 MODIFICHE PERFORMANCE: Error handling MongoDB, Lock salvataggi, Cleanup room, Connection pooling, Rate limiting

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { MongoClient } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Carica frasi base
import { testPhrases } from "./game/phrases.js";

// ✅ Carica frasi modalità giocatore singolo
import { singlePlayerPhrases } from "./phrases-singleplayer.js";

// ✅ MONGODB CONFIGURATION CON POOLING
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Monkyfortuna:Monky.fortuna.31@clusterfortuna.njzzbl8.mongodb.net/?appName=Clusterfortuna";
const DB_NAME = "fortuna_online";

let mongoClient;
let db;
let playersCollection;

// 🔧 MODIFICA 1: ERROR HANDLING + RETRY AUTOMATICO MONGODB
async function connectMongoDB() {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      mongoClient = new MongoClient(MONGODB_URI, {
        maxPoolSize: 20, // 🔧 MODIFICA 4: Connection pooling (da 1 a 20 connessioni)
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
      });
      
      await mongoClient.connect();
      db = mongoClient.db(DB_NAME);
      playersCollection = db.collection("players");
      
      console.log("✅ MongoDB connesso con pooling!");
      
      // Crea indice su ID per ricerche veloci
      await playersCollection.createIndex({ id: 1 }, { unique: true });
      
      // Carica leaderboard all'avvio
      await updateLeaderboard();
      return true;
    } catch (err) {
      retryCount++;
      console.error(`❌ Tentativo ${retryCount}/${maxRetries} connessione MongoDB fallito:`, err.message);
      
      if (retryCount >= maxRetries) {
        console.error("❌ MongoDB non raggiungibile. Server continua senza database.");
        return false;
      }
      
      // Attendi prima di riprovare
      await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
    }
  }
}

// ✅ DATABASE GIOCATORE SINGOLO (cache in memoria)
const singlePlayerDB = {
  players: {}, // Cache locale per performance
  leaderboard: [] // [ { id, totalScore, level }, ... ] ordinato
};

// 🔧 MODIFICA 2: LOCK PER SALVATAGGI (evita race condition)
const saveLocks = new Map(); // playerId -> Promise

async function acquireSaveLock(playerId) {
  while (saveLocks.has(playerId)) {
    await saveLocks.get(playerId);
  }
  
  let releaseLock;
  const lockPromise = new Promise(resolve => {
    releaseLock = resolve;
  });
  
  saveLocks.set(playerId, lockPromise);
  return releaseLock;
}

// ✅ Carica tutti i giocatori da MongoDB all'avvio
async function loadAllPlayers() {
  try {
    if (!playersCollection) {
      console.log("⚠️ MongoDB non disponibile, uso solo cache locale");
      return;
    }
    
    const players = await playersCollection.find({}).toArray();
    
    players.forEach(player => {
      singlePlayerDB.players[player.id] = player;
    });
    
    console.log(`✅ Database caricato: ${players.length} giocatori`);
    
    // ✅ IMPORTANTE: Aggiorna leaderboard dopo caricamento
    await updateLeaderboard();
    console.log(`📊 Leaderboard aggiornata: ${singlePlayerDB.leaderboard.length} giocatori in classifica`);
  } catch (err) {
    console.error("❌ Errore caricamento players:", err.message);
  }
}

// 🔧 MODIFICA 1: Salva giocatore su MongoDB CON RETRY
async function savePlayerToMongo(player) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      if (!playersCollection) {
        console.log("⚠️ MongoDB non disponibile, salvo solo in cache");
        return;
      }
      
      await playersCollection.updateOne(
        { id: player.id },
        { $set: player },
        { upsert: true }
      );
      
      console.log(`💾 Player salvato: ${player.id}`);
      return;
    } catch (err) {
      retryCount++;
      console.error(`❌ Tentativo ${retryCount}/${maxRetries} salvataggio fallito:`, err.message);
      
      if (retryCount >= maxRetries) {
        console.error(`❌ Impossibile salvare ${player.id}. Dati restano in cache.`);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
}

// ✅ Inizializza MongoDB prima di avviare il server
await connectMongoDB();
await loadAllPlayers();

// ✅ Import funzioni coordinate per animazione
import { buildGridWithCoordinates, findLetterCoordinates } from "./game/GameEngine.js";

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
    .replace(/[\u0300-\u036f]/g, "") // Rimuove accenti
    .replace(/[\u0027\u0060\u00B4\u02B9\u02BB\u02BC\u02BD\u02C8\u02CA\u02CB\u02D9\u0300\u0301\u2018\u2019\u201A\u201B\u2032\u2035\u2039\u203A\uFF07]/g, "") // ✅ Rimuove TUTTI gli apostrofi Unicode
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

// ✅ Converte stringa in caselle strutturate (L' = 1 casella)
function parseToCells(text) {
  const isLetter = (ch) => /^[A-ZÀ-ÖØ-Ý]$/i.test(ch);
  const isSpace = (ch) => ch === " ";
  const isPunct = (ch) => ":!?".includes(ch);
  const isApostrophe = (ch) => "'`´'".includes(ch);
  
  const cells = [];
  const str = String(text || "");
  let i = 0;
  
  while (i < str.length) {
    const ch = str[i];
    
    if (isSpace(ch)) {
      cells.push({ type: "space", char: " " });
      i++;
    } else if (isPunct(ch)) {
      cells.push({ type: "punct", char: ch });
      i++;
    } else if (isLetter(ch)) {
      // Lettera + apostrofo = 1 casella
      if (i + 1 < str.length && isApostrophe(str[i + 1])) {
        cells.push({ type: "letter", char: ch + str[i + 1] });
        i += 2;
      } else {
        cells.push({ type: "letter", char: ch });
        i++;
      }
    } else if (isApostrophe(ch)) {
      cells.push({ type: "letter", char: ch });
      i++;
    } else {
      cells.push({ type: "other", char: ch });
      i++;
    }
  }
  
  return cells;
}

// ✅ Trova posizioni lettere usando parseToCells
function letterOccurrences(phrase, targetLetter) {
  const grid = buildGridWithCoordinates(phrase, 16, 5);
  const coordinates = findLetterCoordinates(grid, targetLetter);
  return coordinates;
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

// 🔧 MODIFICA 3: CLEANUP AUTOMATICO ROOM SINGLE PLAYER
const roomLastActivity = new Map(); // roomCode -> timestamp

function updateRoomActivity(roomCode) {
  roomLastActivity.set(roomCode, Date.now());
}

function cleanupInactiveRooms() {
  const now = Date.now();
  const TIMEOUT = 5 * 60 * 1000; // 5 minuti
  
  for (const [roomCode, lastActivity] of roomLastActivity.entries()) {
    if (now - lastActivity > TIMEOUT) {
      const room = rooms[roomCode];
      
      // Elimina solo room singlePlayer senza giocatori connessi
      if (room && room.gameMode === "singlePlayer") {
        const hasConnectedPlayers = room.players?.some(p => {
          const socket = io.sockets.sockets.get(p.id);
          return socket && socket.connected;
        });
        
        if (!hasConnectedPlayers) {
          console.log(`🗑️ Cleanup room inattiva: ${roomCode}`);
          delete rooms[roomCode];
          roomLastActivity.delete(roomCode);
        }
      }
    }
  }
}

// Cleanup ogni 2 minuti
setInterval(cleanupInactiveRooms, 2 * 60 * 1000);

// ==================== DATABASE GIOCATORE SINGOLO ====================

// ✅ Calcola punteggio caselle bianche consecutive (modalità singlePlayer)
function calculateWhiteCellsScore(phrase, revealedLetters) {
  const normalized = normalizeText(phrase);
  const revealedSet = new Set(revealedLetters.map(l => normalizeText(l)));
  
  // Trova tutte le lettere della frase
  const cells = [...normalized].map(ch => {
    if (!/[A-Z]/.test(ch)) return { type: 'other' }; // Non lettera
    return { 
      type: 'letter',
      revealed: revealedSet.has(ch)
    };
  });
  
  // Conta gruppi di caselle bianche consecutive
  let totalScore = 0;
  let consecutiveWhite = 0;
  let singleCells = 0; // Prime 2 di ogni gruppo (1pt)
  let doubleCells = 0; // Dalla 3ª in poi (2pt)
  
  for (const cell of cells) {
    if (cell.type === 'letter' && !cell.revealed) {
      // Casella bianca
      consecutiveWhite++;
    } else {
      // Fine gruppo consecutivo
      if (consecutiveWhite > 0) {
        // Prime 2 = 1pt, dalla 3ª in poi = 2pt
        for (let i = 0; i < consecutiveWhite; i++) {
          if (i < 2) {
            totalScore += 1;
            singleCells++;
          } else {
            totalScore += 2;
            doubleCells++;
          }
        }
        consecutiveWhite = 0;
      }
    }
  }
  
  // Ultimo gruppo se presente
  if (consecutiveWhite > 0) {
    for (let i = 0; i < consecutiveWhite; i++) {
      if (i < 2) {
        totalScore += 1;
        singleCells++;
      } else {
        totalScore += 2;
        doubleCells++;
      }
    }
  }
  
  return { 
    totalScore, 
    singleCells, // Caselle da 1pt
    doubleCells  // Caselle da 2pt
  };
}

// 🔧 MODIFICA 2: Crea nuovo giocatore CON LOCK
async function createSinglePlayer(playerId, pin) {
  const upperID = String(playerId).toUpperCase().trim();
  
  if (!upperID || upperID.length < 3) {
    return { ok: false, error: "ID deve essere almeno 3 caratteri" };
  }
  
  if (String(pin).length !== 4 || !/^\d{4}$/.test(pin)) {
    return { ok: false, error: "PIN deve essere 4 cifre" };
  }
  
  if (singlePlayerDB.players[upperID]) {
    return { ok: false, error: "ID già usato" };
  }
  
  const releaseLock = await acquireSaveLock(upperID);
  
  try {
    const newPlayer = {
      id: upperID,
      pin: String(pin),
      level: 1,
      totalScore: 0,
      createdAt: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString()
    };
    
    singlePlayerDB.players[upperID] = newPlayer;
    
    // ✅ Salva su MongoDB
    await savePlayerToMongo(newPlayer);
    await updateLeaderboard();
    
    return { ok: true, player: newPlayer };
  } finally {
    releaseLock();
    saveLocks.delete(upperID);
  }
}

// 🔧 MODIFICA 2: Autentica giocatore CON LOCK
async function authenticateSinglePlayer(playerId, pin) {
  const upperID = String(playerId).toUpperCase().trim();
  const player = singlePlayerDB.players[upperID];
  
  if (!player) {
    return { ok: false, error: "ID non trovato" };
  }
  
  if (player.pin !== String(pin)) {
    return { ok: false, error: "PIN errato" };
  }
  
  const releaseLock = await acquireSaveLock(upperID);
  
  try {
    player.lastPlayedAt = new Date().toISOString();
    
    // ✅ Salva su MongoDB
    await savePlayerToMongo(player);
    
    return { ok: true, player };
  } finally {
    releaseLock();
    saveLocks.delete(upperID);
  }
}

// 🔧 MODIFICA 2: Salva progressi giocatore CON LOCK
async function saveSinglePlayerProgress(playerId, level, totalScore) {
  const upperID = String(playerId).toUpperCase().trim();
  const player = singlePlayerDB.players[upperID];
  
  if (!player) return { ok: false, error: "Giocatore non trovato" };
  
  const releaseLock = await acquireSaveLock(upperID);
  
  try {
    player.level = level;
    player.totalScore = totalScore;
    player.lastPlayedAt = new Date().toISOString();
    
    // ✅ Salva su MongoDB
    await savePlayerToMongo(player);
    await updateLeaderboard();
    
    return { ok: true, player };
  } finally {
    releaseLock();
    saveLocks.delete(upperID);
  }
}

// ✅ Aggiorna classifica
async function updateLeaderboard() {
  try {
    singlePlayerDB.leaderboard = Object.values(singlePlayerDB.players)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map(p => ({ id: p.id, totalScore: p.totalScore, level: p.level })); // ✅ Includi livello
  } catch (err) {
    console.error("❌ Errore updateLeaderboard:", err.message);
  }
}

// ✅ Ottieni classifica
function getLeaderboard(limit = 30) {
  return singlePlayerDB.leaderboard.slice(0, limit);
}

// ==================== STANZE ====================

// ✅ Funzione per caricare frasi (personalizzate o random)
async function loadPhrases(roomName) {
  const normalized = String(roomName || "").toLowerCase().trim();
  
  if (!normalized) {
    return { phrases: testPhrases, mode: "random", customName: null };
  }
  
  // ✅ NUOVO: Parse formato "nome_N" per set numerati
  const match = normalized.match(/^([a-z]+)_(\d+)$/);
  const baseName = match ? match[1] : normalized;
  const setNumber = match ? parseInt(match[2], 10) : null;
  
  const customPath = join(__dirname, "game", `phrases-${baseName}.js`);
  
  if (existsSync(customPath)) {
    try {
  const module = await import(customPath);

  // ✅ NUOVO: Se c'è un numero, carica set specifico
  if (setNumber !== null && module.phraseSets && module.phraseSets[setNumber]) {
    const setData = module.phraseSets[setNumber];
    console.log(`✅ Caricato set ${setNumber} da ${baseName}: ${setData.length} frasi`);
    return {
      phrases: setData,
      mode: "sequential", // Set predefiniti sono sempre sequenziali
      customName: `${baseName}_${setNumber}`
    };
  }

  // ✅ Altrimenti usa testPhrases normale
  const customPhrases = module.testPhrases;
  const mode = module.phraseMode === "sequential" ? "sequential" : "random";

  console.log(`✅ Caricato ${baseName}: ${customPhrases.length} frasi, mode: ${mode}`);
  return {
    phrases: customPhrases,
    mode,
    customName: baseName
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
  const player = room.players?.find(p => p.id === socketId);
  if (!player) return;

  io.to(code).emit("playerDisconnected", {
    playerName: player.name,
    timeout: 30
  });

  disconnectionTimeouts[socketId] = setTimeout(() => {
    
    const idx = room.players.findIndex((p) => p.id === socketId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      
      if (room.gameState && room.gameState.currentPlayerId === socketId) {
        nextPlayer(room.gameState); // ✅ Salta presentatore
        io.to(code).emit("gameStateUpdate", { gameState: room.gameState });
      }
      
      io.to(code).emit("roomUpdate", { room, roomCode: code });
      
      if (room.players.length === 0) {
        delete rooms[code];
        roomLastActivity.delete(code); // 🔧 MODIFICA 3: Cleanup tracking
      }
    }
  }, 30000);
}

// 🔧 MODIFICA 5: RATE LIMITING
const eventLimits = new Map(); // socketId -> { event -> { count, resetTime } }

function checkRateLimit(socketId, eventName, maxPerSecond = 2) {
  const now = Date.now();
  
  if (!eventLimits.has(socketId)) {
    eventLimits.set(socketId, {});
  }
  
  const userLimits = eventLimits.get(socketId);
  
  if (!userLimits[eventName]) {
    userLimits[eventName] = { count: 1, resetTime: now + 1000 };
    return true;
  }
  
  const limit = userLimits[eventName];
  
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + 1000;
    return true;
  }
  
  if (limit.count >= maxPerSecond) {
    return false; // Rate limit exceeded
  }
  
  limit.count++;
  return true;
}

// Cleanup rate limits ogni minuto
setInterval(() => {
  const now = Date.now();
  for (const [socketId, limits] of eventLimits.entries()) {
    for (const [event, data] of Object.entries(limits)) {
      if (now > data.resetTime + 60000) {
        delete limits[event];
      }
    }
    if (Object.keys(limits).length === 0) {
      eventLimits.delete(socketId);
    }
  }
}, 60000);

// ==================== HELPER FUNCTIONS ====================

// ✅ Helper per emit basato su modalità
function emitGameStateUpdate(io, room, roomCode, socketId, gameState, extraData = {}) {
  if (room.gameMode === "timeChallenge") {
    // Time Challenge: emetti solo al giocatore e salva stato
    room.playerGameStates[socketId] = gameState;
    io.to(socketId).emit("gameStateUpdate", { gameState, ...extraData });
  } else {
    // Altre modalità: emit in broadcast
    io.to(roomCode).emit("gameStateUpdate", { gameState, ...extraData });
  }
}

// ==================== SOCKET.IO ====================

io.on("connection", (socket) => {

  if (disconnectionTimeouts[socket.id]) {
    clearTimeout(disconnectionTimeouts[socket.id]);
    delete disconnectionTimeouts[socket.id];
  }

  // CREA STANZA
  socket.on("createRoom", async ({ playerName, totalRounds, roomName, gameMode, timeChallengeSettings }, callback) => {
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
      const mode = gameMode === "presenter" ? "presenter" : gameMode === "timeChallenge" ? "timeChallenge" : "classic";
      
      // ✅ Carica set frasi (personalizzato o random)
      const phraseSet = await loadPhrases(rawName);

      rooms[code] = {
        host: name,
        players: [{ name, id: socket.id, isHost: true }],
        spectators: [],
        totalRounds: Number(totalRounds) || 3,
        gameMode: mode,
        gameState: null,
        phraseSet: phraseSet,
        currentPhraseIndex: 0,
        timeChallengeSettings: mode === "timeChallenge" ? timeChallengeSettings : null, // ✅ NUOVO
      };

      socket.join(code);
      updateRoomActivity(code);

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

      updateRoomActivity(code); // 🔧 MODIFICA 3: Tracking attività
      const name = String(playerName || "").trim() || "Giocatore";

      if (room.players.some((p) => p.id === socket.id)) {
        if (callback) callback({ ok: false, error: "Sei già nella stanza" });
        return;
      }

      // ✅ Controlla se esiste già un giocatore con questo NOME
      const existingPlayerByName = room.players.find(p => p.name === name);

      // ✅ Se partita iniziata, chiedi approvazione a TUTTI
      if (room.gameState && !room.gameState.gameOver) {
        
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

      updateRoomActivity(code); // 🔧 MODIFICA 3: Tracking attività
      const spectatorName = String(name || "").trim() || "Spettatore";

      if (!room.spectators) room.spectators = [];

      // ✅ Se partita iniziata, chiedi approvazione a TUTTI
      if (room.gameState && !room.gameState.gameOver) {
        
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
      }

      const sIdx = room.spectators?.findIndex((s) => s.id === socket.id);
      if (sIdx !== -1) {
        room.spectators.splice(sIdx, 1);
      }

      if (room.players.length === 0) {
        delete rooms[code];
        roomLastActivity.delete(code); // 🔧 MODIFICA 3: Cleanup tracking
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

      updateRoomActivity(code); // 🔧 MODIFICA 3: Tracking attività

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

      
      // ✅ MODALITÀ TIME CHALLENGE - Stati privati per ogni giocatore
      if (room.gameMode === "timeChallenge") {
        const settings = room.timeChallengeSettings || {
          numFrasi: 1,
          numMatch: 1,
          timerFrase: 0,
          timerMatch: 0
        };
        
        // Inizializza mappa stati privati
        room.playerGameStates = {};
        room.sharedPhraseData = {
          phrase: selectedPhrase.text,
          category: selectedPhrase.category
        };
        
        // Crea stato privato per OGNI giocatore
        for (const player of room.players) {
          const playerState = initGameState([player], room.totalRounds, selectedPhrase.text, selectedPhrase.category);
          
          playerState.isTimeChallenge = true;
          playerState.timeChallengeSettings = settings;
          playerState.spinCounter = 0;
          playerState.nextForcedSpin = Math.floor(Math.random() * 6) + 5;
          
          // Salva stato privato
          room.playerGameStates[player.id] = playerState;
          
          // Invia gameStart SOLO a questo giocatore
          io.to(player.id).emit("gameStart", {
            room,
            roomCode: code,
            gameState: playerState,
          });
        }

        if (callback) callback({ ok: true });
        return;
      }

      const gs = initGameState(room.players, room.totalRounds, selectedPhrase.text, selectedPhrase.category);
      
      // ✅ Inizializza contatore spin per forzatura PASSA/BANCAROTTA
      gs.spinCounter = 0;
      gs.nextForcedSpin = Math.floor(Math.random() * 6) + 5; // Primo tra 5-10 spin

      room.gameState = gs;

      io.to(code).emit("gameStart", {
        room,
        roomCode: code,
        gameState: gs,
      });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore startGame:", err);
      if (callback) callback({ ok: false, error: "Errore avvio" });
    }
  });

  // CAMBIA FRASE
  socket.on("changePhrase", ({ roomCode }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room || !room.gameState) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      updateRoomActivity(code); // 🔧 MODIFICA 3: Tracking attività

      const gs = room.gameState;

      // ✅ MODALITÀ GIOCATORE SINGOLO: Penalità -500
      if (room.gameMode === "singlePlayer") {
        const i = gs.currentPlayerIndex;
        gs.players[i].roundScore = Math.max(0, gs.players[i].roundScore - 500);
        gs.gameMessage = { type: "warning", text: "Frase saltata: -500 punti" };
      } else {
        gs.gameMessage = { type: "info", text: "Nuova frase caricata!" };
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

      io.to(code).emit("gameStateUpdate", { gameState: gs });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore changePhrase:", err);
      if (callback) callback({ ok: false, error: "Errore cambio frase" });
    }
  });

  // GIRA LA RUOTA
  socket.on("spinWheel", ({ roomCode }, callback) => {
    try {
      // 🔧 MODIFICA 5: Rate limiting (max 2 spin al secondo)
      if (!checkRateLimit(socket.id, "spinWheel", 2)) {
        if (callback) callback({ ok: false, error: "Troppi click, rallenta!" });
        return;
      }

      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      updateRoomActivity(code);

      // ✅ TIME CHALLENGE: Usa stato privato
      let gs;
      if (room.gameMode === "timeChallenge") {
        gs = room.playerGameStates?.[socket.id];
        if (!gs) {
          if (callback) callback({ ok: false, error: "Stato gioco non trovato" });
          return;
        }
      } else {
        gs = room.gameState;
        if (!gs) {
          if (callback) callback({ ok: false, error: "Partita non attiva" });
          return;
        }
        
        if (gs.currentPlayerId !== socket.id) {
          if (callback) callback({ ok: false, error: "Non è il tuo turno" });
          return;
        }
      }

      if (!gs.mustSpin) {
        if (callback) callback({ ok: false, error: "Non puoi girare ora" });
        return;
      }

      gs.spinning = true;
      gs.gameMessage = null;
      
      // ✅ Incrementa contatore spin
      gs.spinCounter = (gs.spinCounter || 0) + 1;
      
      // ✅ Controlla se forzare PASSA o BANCAROTTA
      let forcedTarget = null;
      if (gs.spinCounter >= gs.nextForcedSpin) {
        // Scegli random PASSA o BANCAROTTA
        forcedTarget = Math.random() < 0.5 ? "PASSA" : "BANCAROTTA";
        
        // Reset counter e scegli prossima forzatura
        gs.spinCounter = 0;
        gs.nextForcedSpin = Math.floor(Math.random() * 6) + 5; // 5-10
      }
      
      // ✅ Genera seed per sincronizzazione animazione
      const spinSeed = Date.now();
      
      // ✅ TIME CHALLENGE: Emetti solo al giocatore
      if (room.gameMode === "timeChallenge") {
        io.to(socket.id).emit("wheelSpinStart", { 
          spinning: true,
          spinSeed: spinSeed,
          forcedTarget: forcedTarget
        });
      } else {
        io.to(code).emit("wheelSpinStart", { 
          spinning: true,
          spinSeed: spinSeed,
          forcedTarget: forcedTarget
        });
      }

      // ✅ Il server ora ASPETTA che il client invii l'outcome tramite evento "wheelOutcome"
      // Non più timeout - il client determina lo spicchio vincente in base alla posizione finale

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore spinWheel:", err);
      if (callback) callback({ ok: false, error: "Errore spin" });
    }
  });

  // ✅ NUOVO: Ricevi outcome dalla ruota (calcolato dal client)
  socket.on("wheelOutcome", ({ roomCode, outcome }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      updateRoomActivity(code);

      // ✅ TIME CHALLENGE: Usa stato privato
      let gs;
      if (room.gameMode === "timeChallenge") {
        gs = room.playerGameStates?.[socket.id];
        if (!gs) {
          if (callback) callback({ ok: false, error: "Stato gioco non trovato" });
          return;
        }
      } else {
        gs = room.gameState;
        if (!gs) {
          if (callback) callback({ ok: false, error: "Partita non attiva" });
          return;
        }
      }

      const i = gs.currentPlayerIndex;

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
        // ✅ Se roundScore = 0, RADDOPPIA si comporta come 100pt
        if (gs.players[i].roundScore === 0) {
          gs.lastSpinTarget = 100;
          gs.mustSpin = false;
          gs.awaitingConsonant = true;
          gs.pendingDouble = false; // ✅ NON raddoppia
          gs.gameMessage = {
            type: "info",
            text: "Valore: 100 pt. Inserisci una consonante."
          };
          
          // ✅ MODALITÀ PRESENTATORE: Auto-attiva griglia consonanti
          if (room.gameMode === "presenter") {
            io.to(code).emit("buttonStateSync", { 
              type: "consonant", 
              playerId: gs.currentPlayerId 
            });
          }
        } else {
          // ✅ roundScore > 0: RADDOPPIA normale
          gs.pendingDouble = true;
          gs.mustSpin = false;
          gs.awaitingConsonant = true;
          gs.lastSpinTarget = 100; // valore base di fallback
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
        }
      } else if (outcome.type === "pass") {
        // ✅ TIME CHALLENGE: Rigira subito
        if (room.gameMode === "timeChallenge") {
          gs.gameMessage = { type: "warning", text: "PASSA: gira di nuovo!" };
          gs.mustSpin = true;
          gs.lastSpinTarget = 0;
        }
        // ✅ MODALITÀ GIOCATORE SINGOLO: Penalità -200
        else if (room.gameMode === "singlePlayer") {
          const i = gs.currentPlayerIndex;
          gs.players[i].roundScore = Math.max(0, gs.players[i].roundScore - 200);
          gs.gameMessage = { type: "warning", text: "PASSA: -200 punti. Turno al prossimo." };
          nextPlayer(gs);
          gs.mustSpin = true;
          gs.lastSpinTarget = 0;
        } else {
          gs.gameMessage = { type: "warning", text: "PASSA: turno al prossimo." };
          nextPlayer(gs);
          gs.mustSpin = true;
          gs.lastSpinTarget = 0;
        }
      } else if (outcome.type === "bankrupt") {
        const i = gs.currentPlayerIndex;
        gs.players[i].roundScore = 0;
        
        // ✅ TIME CHALLENGE: Rigira subito, azzera solo round score
        if (room.gameMode === "timeChallenge") {
          gs.mustSpin = true;
          gs.lastSpinTarget = 0;
          gs.gameMessage = { type: "error", text: "BANCAROTTA: punteggio azzerato! Gira di nuovo." };
        }
        // ✅ MODALITÀ GIOCATORE SINGOLO: NON azzera total score
        else if (room.gameMode === "singlePlayer") {
          nextPlayer(gs);
          gs.mustSpin = true;
          gs.lastSpinTarget = 0;
          gs.gameMessage = { type: "error", text: "BANCAROTTA: round score azzerato!" };
        } else {
          gs.players[i].totalScore = 0;
          nextPlayer(gs);
          gs.mustSpin = true;
          gs.lastSpinTarget = 0;
          gs.gameMessage = { type: "error", text: "BANCAROTTA: punteggi azzerati!" };
        }
      }

      // ✅ TIME CHALLENGE: Emetti solo al giocatore e salva stato
      if (room.gameMode === "timeChallenge") {
        room.playerGameStates[socket.id] = gs;
        io.to(socket.id).emit("gameStateUpdate", { gameState: gs });
      } else {
        io.to(code).emit("gameStateUpdate", { gameState: gs });
      }

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore wheelOutcome:", err);
      if (callback) callback({ ok: false, error: "Errore outcome" });
    }
  });

  // ✅ GIOCA CONSONANTE - RADDOPPIA CORRETTO
  socket.on("playConsonant", ({ roomCode, letter }, callback) => {
    try {
      // 🔧 MODIFICA 5: Rate limiting (max 2 al secondo)
      if (!checkRateLimit(socket.id, "playConsonant", 2)) {
        if (callback) callback({ ok: false, error: "Troppi click, rallenta!" });
        return;
      }

      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      updateRoomActivity(code);

      // ✅ TIME CHALLENGE: Usa stato privato
      let gs;
      if (room.gameMode === "timeChallenge") {
        gs = room.playerGameStates?.[socket.id];
        if (!gs) {
          if (callback) callback({ ok: false, error: "Stato gioco non trovato" });
          return;
        }
      } else {
        gs = room.gameState;
        if (!gs) {
          if (callback) callback({ ok: false, error: "Partita non attiva" });
          return;
        }
      }

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

      // ✅ TIME CHALLENGE: NO check turno
      if (room.gameMode !== "timeChallenge" && gs.currentPlayerId !== socket.id && room.gameMode !== "presenter") {
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

  // ✅ MODALITÀ GIOCATORE SINGOLO: Penalità -200
  if (room.gameMode === "singlePlayer") {
    const i = gs.currentPlayerIndex;
    gs.players[i].roundScore = Math.max(0, gs.players[i].roundScore - 200);
    gs.gameMessage = { type: "error", text: `❌ ${upper} già usata. -200 punti.` };
  } else {
    gs.gameMessage = { type: "error", text: `❌ ${upper} già usata. Turno al prossimo.` };
  }

  // passa al prossimo giocatore
  if (room.gameMode !== "timeChallenge") {
    nextPlayer(gs);
  }

  emitGameStateUpdate(io, room, code, socket.id, gs);
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
      
      // ✅ NON aggiungere ancora a revealedLetters - lo farà il client dopo animazione
      // gs.revealedLetters.push(upper);
      
      // ✅ Calcola posizioni lettere per animazione
      const revealQueue = letterOccurrences(gs.phrase, upper);
      emitGameStateUpdate(io, room, code, socket.id, gs, { 
        revealQueue: revealQueue,
        letterToReveal: upper
      });
      
      if (callback) callback({ ok: true });
      return;
    }
  } else {
    // ❌ Consonante NON trovata → passa turno e niente raddoppio
    gs.pendingDouble = false;
    gs.awaitingConsonant = false;
    gs.mustSpin = true;
    if (room.gameMode !== "timeChallenge") {
      nextPlayer(gs);
    }
    gs.gameMessage = {
      type: "error",
      text: "❌ Nessuna lettera. RADDOPPIA annullato, turno al prossimo."
    };

    emitGameStateUpdate(io, room, code, socket.id, gs);
    if (callback) callback({ ok: true });
    return;
  }

  gs.pendingDouble = false;
}

        
        gs.players[i].roundScore += gained;
        
        // ✅ NON aggiungere ancora a revealedLetters - lo farà il client dopo animazione
        // gs.revealedLetters.push(upper);
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        
        const message = gs.pendingDouble 
          ? `Trovate ${hits} ${upper}! +${gained} pt (RADDOPPIATI!)`
          : `Trovate ${hits} ${upper}! +${gained} pt`;
        
        gs.gameMessage = { type: "success", text: message };
        
        // ✅ Calcola posizioni lettere rivelate per animazione
        const revealQueue = letterOccurrences(gs.phrase, upper);
        emitGameStateUpdate(io, room, code, socket.id, gs, {
          revealQueue: revealQueue,
          letterToReveal: upper
        });
        
        if (callback) callback({ ok: true });
        return;
      } else {
        // ✅ MODALITÀ GIOCATORE SINGOLO: Penalità -200
        if (room.gameMode === "singlePlayer") {
          const i = gs.currentPlayerIndex;
          gs.players[i].roundScore = Math.max(0, gs.players[i].roundScore - 200);
          gs.gameMessage = { type: "error", text: `Nessuna ${upper}. -200 punti.` };
        } else {
          gs.gameMessage = { type: "error", text: `Nessuna ${upper}. Turno al prossimo.` };
        }
        
        if (room.gameMode !== "timeChallenge") {
          nextPlayer(gs);
        }
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.pendingDouble = false;
        gs.lastSpinTarget = 0;
        
        emitGameStateUpdate(io, room, code, socket.id, gs);
        if (callback) callback({ ok: true });
        return;
      }
    } catch (err) {
      console.error("Errore playConsonant:", err);
      if (callback) callback({ ok: false, error: "Errore consonante" });
    }
  });

  // COMPRA VOCALE
  socket.on("playVowel", ({ roomCode, letter }, callback) => {
    try {
      // 🔧 MODIFICA 5: Rate limiting (max 2 al secondo)
      if (!checkRateLimit(socket.id, "playVowel", 2)) {
        if (callback) callback({ ok: false, error: "Troppi click, rallenta!" });
        return;
      }

      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      updateRoomActivity(code);

      // ✅ TIME CHALLENGE: Usa stato privato
      let gs;
      if (room.gameMode === "timeChallenge") {
        gs = room.playerGameStates?.[socket.id];
        if (!gs) {
          if (callback) callback({ ok: false, error: "Stato gioco non trovato" });
          return;
        }
      } else {
        gs = room.gameState;
        if (!gs) {
          if (callback) callback({ ok: false, error: "Partita non attiva" });
          return;
        }
      }

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

      // ✅ TIME CHALLENGE: NO check turno
      if (room.gameMode !== "timeChallenge" && gs.currentPlayerId !== socket.id && room.gameMode !== "presenter") {
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

  // ✅ MODALITÀ GIOCATORE SINGOLO: Penalità -200
  if (room.gameMode === "singlePlayer") {
    const i = gs.currentPlayerIndex;
    gs.players[i].roundScore = Math.max(0, gs.players[i].roundScore - 200);
    gs.gameMessage = { type: "error", text: `❌ ${upper} già usata. -200 punti.` };
  } else {
    gs.gameMessage = { type: "error", text: `❌ ${upper} già usata. Turno al prossimo.` };
  }

  // Passa turno
  if (room.gameMode !== "timeChallenge") {
    nextPlayer(gs);
  }

  emitGameStateUpdate(io, room, code, socket.id, gs);
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
        // ✅ NON aggiungere ancora a revealedLetters - lo farà il client dopo animazione
        // gs.revealedLetters.push(upper);
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.gameMessage = { type: "success", text: `Rivelate ${hits} ${upper}! (-${cost} pt)` };
        
        // ✅ Calcola posizioni per animazione
        const revealQueue = letterOccurrences(gs.phrase, upper);
        emitGameStateUpdate(io, room, code, socket.id, gs, {
          revealQueue: revealQueue,
          letterToReveal: upper
        });
      } else {
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        
        // ✅ MODALITÀ GIOCATORE SINGOLO: Penalità -200 EXTRA (oltre al costo vocale)
        if (room.gameMode === "singlePlayer") {
          const i = gs.currentPlayerIndex;
          gs.players[i].roundScore = Math.max(0, gs.players[i].roundScore - 200);
          gs.gameMessage = { type: "error", text: `Nessuna ${upper}. (-${cost + 200} pt totali)` };
        } else {
          gs.gameMessage = { type: "error", text: `Nessuna ${upper}. (-${cost} pt)` };
        }
        
        emitGameStateUpdate(io, room, code, socket.id, gs);
      }

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore playVowel:", err);
      if (callback) callback({ ok: false, error: "Errore vocale" });
    }
  });

  // RISOLVI FRASE
  socket.on("trySolution", ({ roomCode, text, timeChallengeData }, callback) => {
    try {
      // 🔧 MODIFICA 5: Rate limiting (max 2 al secondo)
      if (!checkRateLimit(socket.id, "trySolution", 2)) {
        if (callback) callback({ ok: false, error: "Troppi tentativi, rallenta!" });
        return;
      }

      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      updateRoomActivity(code);

      // ✅ TIME CHALLENGE: Usa stato privato
      let gs;
      if (room.gameMode === "timeChallenge") {
        gs = room.playerGameStates?.[socket.id];
        if (!gs) {
          if (callback) callback({ ok: false, error: "Stato gioco non trovato" });
          return;
        }
      } else {
        gs = room.gameState;
        if (!gs) {
          if (callback) callback({ ok: false, error: "Partita non attiva" });
          return;
        }
        
        if (gs.currentPlayerId !== socket.id) {
          if (callback) callback({ ok: false, error: "Non è il tuo turno" });
          return;
        }
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

      // ✅ MODALITÀ CLASSICA/SINGLEPLAYER: Verifica automatica
      const guess = normalizeText(text || "");
      const target = normalizeText(gs.phrase || "");

      if (!guess) {
        if (callback) callback({ ok: false, error: "Scrivi una soluzione" });
        return;
      }

      if (guess === target) {
        const i = gs.currentPlayerIndex;
        const winnerName = gs.players[i].name;
        
        // ✅ MODALITÀ TIME CHALLENGE: Traccia completamento frase
        if (gs.isTimeChallenge) {
          // Inizializza tracking globale se non esiste
          if (!room.timeChallengeData) {
            room.timeChallengeData = {
              currentMatch: 1,
              completions: {}
            };
          }
          
          // Inizializza tracking giocatore se non esiste
          if (!room.timeChallengeData.completions[socket.id]) {
            room.timeChallengeData.completions[socket.id] = {
              playerName: winnerName,
              phrasesCompleted: 0,
              totalTime: 0,
              totalPenalties: 0,
              finished: false
            };
          }
          
          const completion = room.timeChallengeData.completions[socket.id];
          
          // ✅ Aggiungi tempo e penalità
          const phraseTime = timeChallengeData?.time || 0;
          const penalties = timeChallengeData?.penalties || 0;
          
          completion.totalTime += phraseTime;
          completion.totalPenalties += penalties;
          completion.phrasesCompleted++;
          
          const settings = gs.timeChallengeSettings || {};
          const totalFrasi = settings.numFrasi || 1;
          
          // ✅ Controlla se ha finito tutte le frasi
          if (completion.phrasesCompleted >= totalFrasi) {
            completion.finished = true;
            
            // ✅ Controlla se TUTTI hanno finito
            const allFinished = room.players.every(p => 
              room.timeChallengeData.completions[p.id]?.finished === true
            );
            
            if (allFinished) {
              // ✅ TUTTI HANNO FINITO - Calcola classifica
              const results = room.players.map(p => {
                const data = room.timeChallengeData.completions[p.id];
                if (!data) return null;
                
                const finalTime = data.totalTime + data.totalPenalties;
                
                return {
                  playerName: data.playerName,
                  phrasesCompleted: data.phrasesCompleted,
                  totalTime: data.totalTime,
                  totalPenalties: data.totalPenalties,
                  finalTime
                };
              }).filter(Boolean);
              
              // Ordina per finalTime crescente (più veloce vince)
              results.sort((a, b) => a.finalTime - b.finalTime);
              
              const currentMatch = room.timeChallengeData.currentMatch || 1;
              const totalMatches = settings.numMatch || 1;
              
              // Invia risultati a TUTTI i giocatori
              io.to(code).emit("showTimeChallengeResults", {
                results,
                currentMatch,
                totalMatches
              });
              
              if (callback) callback({ ok: true });
              return;
            } else {
              // ✅ Questo giocatore ha finito, ma altri no
              // Manda messaggio di attesa
              gs.gameMessage = { 
                type: "success", 
                text: `✅ Hai completato tutte le frasi! Attendi gli altri giocatori...` 
              };
              gs.gameOver = false; // NON è game over per lui, ma non può più giocare
              
              room.playerGameStates[socket.id] = gs;
              io.to(socket.id).emit("gameStateUpdate", { gameState: gs });
              
              if (callback) callback({ ok: true });
              return;
            }
          } else {
            // ✅ Carica PROSSIMA frase per questo giocatore
            const nextPhraseIndex = completion.phrasesCompleted; // 0-based dopo increment
            
            // Prendi frase dal phraseSet della room
            const phrases = room.phraseSet || [];
            if (phrases.length === 0) {
              console.error("❌ Nessuna frase disponibile in room.phraseSet");
              if (callback) callback({ ok: false, error: "Nessuna frase disponibile" });
              return;
            }
            
            // Usa modulo per ciclare se necessario
            const nextPhrase = phrases[nextPhraseIndex % phrases.length];
            
            // ✅ Aggiorna gameState PRIVATO con nuova frase
            gs.phrase = nextPhrase.text;
            gs.rows = buildBoard(nextPhrase.text, 14, 4);
            gs.category = nextPhrase.category;
            gs.revealedLetters = [];
            gs.usedLetters = [];
            gs.wheel = generateWheel();
            gs.mustSpin = true;
            gs.awaitingConsonant = false;
            gs.pendingDouble = false;
            gs.lastSpinTarget = 0;
            gs.players[i].roundScore = 0; // Reset punteggio round
            gs.gameMessage = { 
              type: "success", 
              text: `✅ Frase ${completion.phrasesCompleted} completata! Carico la prossima...` 
            };
            
            // ✅ Salva stato privato aggiornato
            room.playerGameStates[socket.id] = gs;
            
            // ✅ TIME CHALLENGE: Evento dedicato per nuova frase (NON roundWon)
            io.to(socket.id).emit("timeChallengeNextPhrase", {
              phraseNumber: completion.phrasesCompleted,
              totalPhrases: totalFrasi,
              gameState: gs
            });
            
            if (callback) callback({ ok: true });
            return;
          }
        }
        
        // ✅ MODALITÀ GIOCATORE SINGOLO: Calcolo speciale punteggio
        if (room.gameMode === "singlePlayer") {
          // Calcola punteggio basato su caselle bianche rimaste
          const scoreDetails = calculateWhiteCellsScore(gs.phrase, gs.revealedLetters);
          
          // ✅ Bonus: ogni 500 round score = +2pt
          const roundScore = gs.players[i].roundScore;
          const bonusMultiplier = Math.floor(roundScore / 500);
          const bonusPoints = bonusMultiplier * 2;
          
          const finalScore = scoreDetails.totalScore + bonusPoints;
          
          gs.players[i].totalScore += finalScore;
          gs.lastRoundScore = finalScore; // ✅ Salva per mostrare nel popup
          gs.lastRoundDetails = { // ✅ Salva dettagli per popup
            singleCells: scoreDetails.singleCells,
            doubleCells: scoreDetails.doubleCells,
            roundScore: roundScore,
            bonusPoints: bonusPoints
          };
          
          gs.gameMessage = { type: "success", text: `✅ Frase indovinata! +${finalScore} punti!` };
        } else {
          // Modalità multiplayer: round score + bonus
          gs.players[i].totalScore += gs.players[i].roundScore;
          const bonus = 1000;
          gs.players[i].totalScore += bonus;
          gs.gameMessage = { type: "success", text: `✅ ${winnerName} ha indovinato! +${bonus} BONUS!` };
        }

        const allLetters = [...normalizeText(gs.phrase)].filter(ch => /[A-Z]/.test(ch));
        gs.revealedLetters = [...new Set(allLetters)];

        gs.mustSpin = false;
        gs.awaitingConsonant = false;
        gs.pendingDouble = false;

        // ✅ TIME CHALLENGE: roundWon solo al giocatore
        if (room.gameMode === "timeChallenge") {
          io.to(socket.id).emit("roundWon", {
            winnerName,
            countdown: 0
          });
        } else {
          io.to(code).emit("roundWon", {
            winnerName,
            countdown: room.gameMode === "singlePlayer" ? 0 : 7
          });
        }

        emitGameStateUpdate(io, room, code, socket.id, gs);

        // ✅ In singlePlayer e timeChallenge NON avviare automaticamente prossimo round
        if (room.gameMode !== "singlePlayer" && room.gameMode !== "timeChallenge") {
          setTimeout(() => {
            nextRound(code, room);
          }, 7000);
        }
      } else {
        // ❌ Soluzione sbagliata
        if (room.gameMode !== "timeChallenge") {
          nextPlayer(gs);
        }
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.pendingDouble = false;
        gs.gameMessage = { type: "error", text: "Soluzione non corretta." };

        emitGameStateUpdate(io, room, code, socket.id, gs);
      }

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore trySolution:", err);
      if (callback) callback({ ok: false, error: "Errore soluzione" });
    }
  });

  // PASSA IL TURNO
  socket.on("passTurn", ({ roomCode }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        if (callback) callback({ ok: false, error: "Stanza non trovata" });
        return;
      }

      updateRoomActivity(code);

      // ✅ TIME CHALLENGE: Non esiste "passa turno"
      if (room.gameMode === "timeChallenge") {
        if (callback) callback({ ok: false, error: "Non puoi passare in Time Challenge" });
        return;
      }

      const gs = room.gameState;
      if (!gs) {
        if (callback) callback({ ok: false, error: "Partita non attiva" });
        return;
      }

      if (gs.currentPlayerId !== socket.id) {
        if (callback) callback({ ok: false, error: "Non è il tuo turno" });
        return;
      }

      nextPlayer(gs);
      gs.mustSpin = true;
      gs.awaitingConsonant = false;
      gs.pendingDouble = false;
      gs.lastSpinTarget = 0;
      gs.gameMessage = { type: "info", text: "Turno passato" };

      io.to(code).emit("gameStateUpdate", { gameState: gs });

      if (callback) callback({ ok: true });
    } catch (err) {
      console.error("Errore passTurn:", err);
      if (callback) callback({ ok: false, error: "Errore passa turno" });
    }
  });

  // ✅ EVENTO: Animazione completata
  socket.on("animationComplete", ({ roomCode, letter }) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];
      if (!room) return;

      // ✅ TIME CHALLENGE: Usa stato privato
      let gs;
      if (room.gameMode === "timeChallenge") {
        gs = room.playerGameStates?.[socket.id];
        if (!gs) return;
      } else {
        gs = room.gameState;
        if (!gs) return;
      }

      const upper = String(letter || "").toUpperCase().trim();
      
      // ✅ Aggiungi lettera a revealedLetters
      if (upper && !gs.revealedLetters.includes(upper)) {
        gs.revealedLetters.push(upper);
        
        // ✅ Emetti aggiornamento
        if (room.gameMode === "timeChallenge") {
          room.playerGameStates[socket.id] = gs;
          io.to(socket.id).emit("gameStateUpdate", { gameState: gs });
        } else {
          io.to(code).emit("gameStateUpdate", { gameState: gs });
        }
      }
    } catch (err) {
      console.error("❌ Errore in animationComplete:", err);
    }
  });

  // ✅ ACCETTA RICHIESTA JOIN
  socket.on("acceptJoinRequest", ({ playerId, playerName, roomCode, type, isReconnection }) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];
      if (!room) return;

      updateRoomActivity(code); // 🔧 MODIFICA 3: Tracking attività

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
              }
            }
            
            targetSocket.join(code);
            
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

      updateRoomActivity(code); // 🔧 MODIFICA 3: Tracking attività

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
          countdown: room.gameMode === "singlePlayer" ? 0 : 7 // ✅ No countdown per singlePlayer
        });

        io.to(code).emit("gameStateUpdate", { gameState: gs });

        // ✅ In singlePlayer NON avviare automaticamente prossimo round
        if (room.gameMode !== "singlePlayer") {
          setTimeout(() => {
            nextRound(code, room);
          }, 7000);
        }
      } else {
        // ❌ Soluzione sbagliata
        nextPlayer(gs); // ✅ Salta presentatore
        gs.mustSpin = true;
        gs.awaitingConsonant = false;
        gs.pendingDouble = false;
        gs.gameMessage = { type: "error", text: "Soluzione non corretta." };

        io.to(code).emit("gameStateUpdate", { gameState: gs });
      }

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
      }
    } catch (err) {
      console.error("Errore requestGameState:", err);
    }
  });

  // ==================== GIOCATORE SINGOLO ====================

  // ✅ CREA NUOVO GIOCATORE SINGOLO
  socket.on("singlePlayerCreate", async ({ playerId, pin }, callback) => {
    try {
      const result = await createSinglePlayer(playerId, pin);
      
      if (!result.ok) {
        return callback({ ok: false, error: result.error });
      }
      
      callback({ 
        ok: true, 
        player: {
          id: result.player.id,
          level: result.player.level,
          totalScore: result.player.totalScore
        }
      });
    } catch (err) {
      console.error("Errore singlePlayerCreate:", err);
      callback({ ok: false, error: "Errore server" });
    }
  });

  // ✅ AUTENTICA GIOCATORE SINGOLO
  socket.on("singlePlayerAuth", async ({ playerId, pin }, callback) => {
    try {
      const result = await authenticateSinglePlayer(playerId, pin);
      
      if (!result.ok) {
        return callback({ ok: false, error: result.error });
      }
      
      callback({ 
        ok: true, 
        player: {
          id: result.player.id,
          level: result.player.level,
          totalScore: result.player.totalScore
        }
      });
    } catch (err) {
      console.error("Errore singlePlayerAuth:", err);
      callback({ ok: false, error: "Errore server" });
    }
  });

  // ✅ SALVA PROGRESSI GIOCATORE SINGOLO
  socket.on("singlePlayerSave", async ({ playerId, level, totalScore }, callback) => {
    try {
      const result = await saveSinglePlayerProgress(playerId, level, totalScore);
      
      if (!result.ok) {
        return callback({ ok: false, error: result.error });
      }
      
      callback({ ok: true });
    } catch (err) {
      console.error("Errore singlePlayerSave:", err);
      callback({ ok: false, error: "Errore server" });
    }
  });

  // ✅ OTTIENI CLASSIFICA
  socket.on("getLeaderboard", ({ limit }, callback) => {
    try {
      const leaderboard = getLeaderboard(limit || 30);
      callback({ ok: true, leaderboard });
    } catch (err) {
      console.error("Errore getLeaderboard:", err);
      callback({ ok: false, error: "Errore server" });
    }
  });

  // ✅ OTTIENI FRASE GIOCATORE SINGOLO (sequenziale)
  socket.on("getSinglePlayerPhrase", ({ level }, callback) => {
    try {
      const index = (level - 1) % singlePlayerPhrases.length;
      const phrase = singlePlayerPhrases[index];
      
      if (!phrase) {
        return callback({ ok: false, error: "Frase non trovata" });
      }
      
      callback({ 
        ok: true, 
        phrase: phrase.text,
        category: phrase.category,
        level: level
      });
    } catch (err) {
      console.error("Errore getSinglePlayerPhrase:", err);
      callback({ ok: false, error: "Errore server" });
    }
  });

  // ✅ PROSSIMO LIVELLO (modalità singlePlayer)
  socket.on("nextLevel", async ({ roomCode }, callback) => {
    try {
      const code = String(roomCode || "").trim().toUpperCase();
      const room = rooms[code];
      
      if (!room || room.gameMode !== "singlePlayer") {
        return callback({ ok: false, error: "Room non trovata" });
      }

      updateRoomActivity(code); // 🔧 MODIFICA 3: Tracking attività
      
      const gs = room.gameState;
      if (!gs) {
        return callback({ ok: false, error: "GameState non trovato" });
      }
      
      // Incrementa livello
      const newLevel = (gs.singlePlayerLevel || 1) + 1;
      gs.singlePlayerLevel = newLevel;
      room.currentPhraseIndex = newLevel - 1;
      
      // ✅ Salva progressi nel database
      const playerId = gs.singlePlayerId;
      const totalScore = gs.players[0]?.totalScore || 0;
      
      if (playerId) {
        const saveResult = await saveSinglePlayerProgress(playerId, newLevel, totalScore);
        if (saveResult.ok) {
          console.log(`💾 Progressi auto-salvati: ${playerId} - Livello ${newLevel}`);
        }
      }
      
      // Carica nuova frase
      const phraseIndex = (newLevel - 1) % singlePlayerPhrases.length;
      const selectedPhrase = singlePlayerPhrases[phraseIndex];
      
      if (!selectedPhrase) {
        return callback({ ok: false, error: "Frase non trovata" });
      }
      
      // Reset gameState per nuovo livello
      gs.phrase = selectedPhrase.text;
      gs.rows = buildBoard(selectedPhrase.text, 14, 4);
      gs.category = selectedPhrase.category;
      gs.revealedLetters = [];
      gs.usedLetters = [];
      gs.players[0].roundScore = 0; // Reset round score
      gs.wheel = generateWheel();
      gs.mustSpin = true;
      gs.awaitingConsonant = false;
      gs.pendingDouble = false;
      gs.lastSpinTarget = 0;
      gs.spinning = false;
      gs.gameMessage = { type: "info", text: `🎮 Livello ${newLevel} - ${selectedPhrase.category}` };
      
      io.to(code).emit("gameStateUpdate", { gameState: gs });
      
      callback({ ok: true, level: newLevel });
    } catch (err) {
      console.error("Errore nextLevel:", err);
      callback({ ok: false, error: "Errore server" });
    }
  });

  // ✅ AVVIA PARTITA GIOCATORE SINGOLO (crea room virtuale)
  socket.on("startSinglePlayerGame", ({ playerId, level, totalScore }, callback) => {
    try {
      const roomCode = `SP-${playerId}`; // Room virtuale unica per giocatore
      
      // ✅ Crea room virtuale
      rooms[roomCode] = {
        roomName: roomCode,
        gameMode: "singlePlayer",
        players: [{
          id: socket.id,
          name: playerId,
          isHost: true
        }],
        spectators: [],
        totalRounds: 1,
        currentPhraseIndex: level - 1, // Indice frase corrente
        phraseSet: {
          phrases: singlePlayerPhrases,
          mode: "sequential"
        }
      };

      updateRoomActivity(roomCode); // 🔧 MODIFICA 3: Tracking attività
      
      // ✅ Carica frase per livello corrente
      const phraseIndex = (level - 1) % singlePlayerPhrases.length;
      const selectedPhrase = singlePlayerPhrases[phraseIndex];
      
      if (!selectedPhrase) {
        return callback({ ok: false, error: "Frase non trovata" });
      }
      
      // ✅ Inizializza gameState
      const gs = initGameState(
        [{ id: socket.id, name: playerId, isHost: false }],
        1,
        selectedPhrase.text,
        selectedPhrase.category
      );
      
      // ✅ Imposta total score salvato
      gs.players[0].totalScore = totalScore || 0;
      gs.singlePlayerLevel = level;
      gs.singlePlayerId = playerId;
      
      rooms[roomCode].gameState = gs;
      
      socket.join(roomCode);
      
      callback({
        ok: true,
        roomCode: roomCode,
        gameState: gs
      });
      
      // ✅ Emetti gameStart
      io.to(roomCode).emit("gameStart", {
        room: rooms[roomCode],
        roomCode: roomCode,
        gameState: gs
      });
      
    } catch (err) {
      console.error("Errore startSinglePlayerGame:", err);
      callback({ ok: false, error: "Errore server" });
    }
  });

  // TIME CHALLENGE COMPLETE
  socket.on("timeChallengeComplete", ({ phraseIndex, time, penalties }) => {
    try {
      const info = findRoomBySocketId(socket.id);
      if (!info) return;

      const { code, room } = info;
      if (room.gameMode !== "timeChallenge") return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      // Salva completamento
      if (!room.timeChallengeData.completions[socket.id]) {
        room.timeChallengeData.completions[socket.id] = {
          playerName: player.name,
          phrases: []
        };
      }

      room.timeChallengeData.completions[socket.id].phrases.push({
        phraseIndex,
        time,
        penalties
      });

      const phrasesCompleted = room.timeChallengeData.completions[socket.id].phrases.length;

      // Se ci sono altre frasi da completare
      if (phrasesCompleted < room.timeChallengeData.totalPhrases) {
        const nextPhrase = singlePlayerPhrases[phrasesCompleted];
        const wheel = generateWheel();

        io.to(socket.id).emit("startTimeChallengeGame", {
          phrase: nextPhrase.text,
          category: nextPhrase.category,
          wheel: wheel,
          phraseIndex: phrasesCompleted,
          totalPhrases: room.timeChallengeData.totalPhrases
        });
      } else {
        // Giocatore ha finito tutte le frasi
        room.timeChallengeData.completions[socket.id].matchCompleted = true;

        // Controlla se TUTTI hanno finito
        const allCompleted = room.players.every(p => 
          room.timeChallengeData.completions[p.id]?.matchCompleted === true
        );

        if (allCompleted) {
          // Calcola classifica
          const results = room.players.map(p => {
            const data = room.timeChallengeData.completions[p.id];
            if (!data) return null;

            const totalTime = data.phrases.reduce((sum, ph) => sum + ph.time, 0);
            const totalPenalties = data.phrases.reduce((sum, ph) => sum + ph.penalties, 0);
            const finalTime = totalTime + totalPenalties;

            return {
              playerName: data.playerName,
              phrasesCompleted: data.phrases.length,
              totalTime,
              totalPenalties,
              finalTime
            };
          }).filter(Boolean);

          // Ordina per finalTime crescente
          results.sort((a, b) => a.finalTime - b.finalTime);

          // Invia risultati a tutti
          io.to(code).emit("showTimeChallengeResults", { results });
        }
      }
    } catch (err) {
      console.error("Errore timeChallengeComplete:", err);
    }
  });

  // DISCONNESSIONE
  socket.on("disconnect", () => {
    const info = findRoomBySocketId(socket.id);
    if (!info) {
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
          io.to(code).emit("roomUpdate", { room, roomCode: code });
        }
      }
    } catch (err) {
      console.error("Errore disconnect:", err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server su porta ${PORT}`);
  console.log("✅ CORS abilitato");
  console.log("✅ MongoDB connection pooling attivo");
  console.log("✅ Rate limiting attivo");
  console.log("✅ Auto-cleanup room attivo");
});
