// server/server.mjs
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// CORS semplice
app.use(
  cors({
    origin: ["https://fortuna-online.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
  })
);

// health
app.get("/", (req, res) => res.send("Fortuna Online Server attivo ✅"));

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// socket.io con cors
const io = new Server(server, {
  cors: {
    origin: ["https://fortuna-online.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// struttura stanze:
// rooms[code] = {
//   code,
//   hostId,
//   players: [{ id, name, totalScore, turnScore }],
//   spectators: [{ id, name }],
//   totalRounds,
//   currentRound,
//   currentPlayerIndex,
//   gameStarted: boolean,
//   phrase: { text, normalizedText }
// }

let rooms = {};

// helper normalizzazione
function normalize(str = "") {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/gi, "")
    .toUpperCase();
}

function nextPlayerIndex(room) {
  if (!room || !room.players || room.players.length === 0) return 0;
  return (room.currentPlayerIndex + 1) % room.players.length;
}

io.on("connection", (socket) => {
  console.log("Connessione", socket.id);

  socket.on("createRoom", ({ playerName, totalRounds, roomName }, cb) => {
    const code =
      (roomName && String(roomName).trim().toUpperCase()) ||
      Math.random().toString(36).substring(2, 6).toUpperCase();

    rooms[code] = {
      code,
      hostId: socket.id,
      players: [
        { id: socket.id, name: playerName || "GIOCATORE", totalScore: 0, turnScore: 0 },
      ],
      spectators: [],
      totalRounds: totalRounds || 3,
      currentRound: 0,
      currentPlayerIndex: 0,
      gameStarted: false,
      phrase: null,
    };

    socket.join(code);
    const payload = { ok: true, room: rooms[code], roomCode: code, playerName: playerName || "GIOCATORE" };
    if (typeof cb === "function") cb(payload);
    io.to(code).emit("roomUpdate", { room: rooms[code], roomCode: code });
    console.log("Stanza creata", code, "host", playerName);
  });

  socket.on("joinRoom", ({ roomCode, playerName }, cb) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms[code];
    if (!room) {
      if (typeof cb === "function") cb({ ok: false, error: "Stanza non trovata" });
      return;
    }

    room.players.push({ id: socket.id, name: playerName || "GIOCATORE", totalScore: 0, turnScore: 0 });
    socket.join(code);
    if (typeof cb === "function") cb({ ok: true, room, playerName });
    io.to(code).emit("roomUpdate", { room, roomCode: code });
    console.log("JoinRoom", code, playerName);
  });

  socket.on("joinAsSpectator", ({ roomCode, name }, cb) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms[code];
    if (!room) {
      if (typeof cb === "function") cb({ ok: false, error: "Stanza non trovata" });
      return;
    }
    room.spectators.push({ id: socket.id, name: name || "SPETTATORE" });
    socket.join(code);
    if (typeof cb === "function") cb({ ok: true, room });
    io.to(code).emit("roomUpdate", { room, roomCode: code });
  });

  // AVVIO PARTITA: only host può far partire
  socket.on("startGame", ({ roomCode }, cb) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms[code];
    if (!room) {
      if (typeof cb === "function") cb({ ok: false, error: "Stanza non trovata" });
      return;
    }
    if (socket.id !== room.hostId) {
      if (typeof cb === "function") cb({ ok: false, error: "Solo host può avviare" });
      return;
    }

    // Scegli frase deterministica semplice (es. hash del code)
    // Qui usiamo una frase finta se non hai file frase; fallback rapido:
    const defaultPhrase = "ESMPIO DI FRASE PER LA PROVA";
    const text = defaultPhrase;
    room.phrase = { text, normalizedText: normalize(text) };

    room.gameStarted = true;
    room.currentRound = 1;
    room.currentPlayerIndex = 0;
    // azzera turnScore per tutti
    room.players.forEach((p) => (p.turnScore = 0));

    const state = {
      roomCode: code,
      players: room.players,
      totalRounds: room.totalRounds,
      currentRound: room.currentRound,
      currentPlayerIndex: room.currentPlayerIndex,
      phraseMask: room.phrase.normalizedText.replace(/[A-Z0-9]/g, "_"),
      status: "IN_PROGRESS",
    };

    io.to(code).emit("gameState", { state });
    if (typeof cb === "function") cb({ ok: true });
    console.log("Partita avviata in", code);
  });

  // RICEZIONE AZIONI DAL CLIENT (minimale): il client invia 'action' con { type, payload }
  // Server verifica turno e applica regole essenziali, poi broadcast gameState
  socket.on("action", ({ roomCode, type, payload }, cb) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms[code];
    if (!room || !room.gameStarted) {
      if (typeof cb === "function") cb({ ok: false, error: "Partita non attiva" });
      return;
    }

    const playerIndex = room.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) {
      if (typeof cb === "function") cb({ ok: false, error: "Non sei in stanza" });
      return;
    }

    if (playerIndex !== room.currentPlayerIndex) {
      if (typeof cb === "function") cb({ ok: false, error: "Non è il tuo turno" });
      return;
    }

    const player = room.players[playerIndex];

    // Gestione tipi azione: spin, guessConsonant, guessVowel, solve
    if (type === "spin") {
      // il client invia il risultato dello spin so that we don't ricreare la ruota qui
      // payload = { result: number|string }  e.g. 700 or "PASSA" or "BANCAROTTA" or "RADDOPPIA"
      const { result } = payload || {};

      // Salviamo l'ultimo spin nel room
      room.lastSpin = result;

      // Comportamenti base:
      if (result === "PASSA") {
        // passa il turno al prossimo, azzera turnScore del player
        player.turnScore = 0;
        room.currentPlayerIndex = nextPlayerIndex(room);
      } else if (result === "BANCAROTTA") {
        // azzera punteggio totale e del turno
        player.totalScore = 0;
        player.turnScore = 0;
        room.currentPlayerIndex = nextPlayerIndex(room);
      } else if (result === "RADDOPPIA") {
        // segniamo che raddoppio è attivo: verrà applicato solo se la consonante trovata >0
        player.pendingDouble = true;
        // rimane turno al giocatore (attesa consonante)
      } else {
        // numero (valore)
        player.lastSpinValue = Number(result) || 0;
        // rimane turno in attesa consonante
      }

      // Broadcast stato
      const state = {
        roomCode: code,
        players: room.players,
        currentPlayerIndex: room.currentPlayerIndex,
        lastSpin: room.lastSpin || null,
        phraseMask: room.phrase.normalizedText.replace(/[A-Z0-9]/g, "_"),
      };
      io.to(code).emit("gameState", { state });
      if (typeof cb === "function") cb({ ok: true });
      return;
    }

    if (type === "guessConsonant") {
      // payload = { letter: "B" }
      const { letter } = payload || {};
      const L = String(letter || "").toUpperCase();
      if (!L || L.length !== 1 || "AEIOU".includes(L)) {
        if (typeof cb === "function") cb({ ok: false, error: "Lettera non valida" });
        return;
      }

      // Verifica che lastSpin sia un numero oppure RADDOPPIA pending
      const spinVal = player.lastSpinValue || 0;
      const normalized = room.phrase.normalizedText;
      // conta occorrenze
      const matches = (normalized.split("").filter((c) => c === L) || []).length;

      if (matches > 0) {
        // punti guadagnati
        let gained = (player.pendingDouble ? spinVal * 2 : spinVal) * matches;
        // ma RADDOPPIA deve valere solo se ha trovato almeno una consonante: qui lo facciamo valere
        // aggiungi ai punteggi: sia al turnScore che al totalScore
        player.turnScore = (player.turnScore || 0) + gained;
        player.totalScore = (player.totalScore || 0) + gained;
        // reset pendingDouble
        player.pendingDouble = false;
        // rimane il turno al giocatore (può rigirare)
      } else {
        // nessuna occorrenza -> perde il turno, azzera turnScore del turno corrente e passa
        player.turnScore = 0;
        player.pendingDouble = false;
        room.currentPlayerIndex = nextPlayerIndex(room);
      }

      // Broadcast stato aggiornato
      const state = {
        roomCode: code,
        players: room.players,
        currentPlayerIndex: room.currentPlayerIndex,
        lastSpin: room.lastSpin || null,
        phraseMask: room.phrase.normalizedText.replace(/[A-Z0-9]/g, "_"),
      };
      io.to(code).emit("gameState", { state });
      if (typeof cb === "function") cb({ ok: true, matches });
      return;
    }

    if (type === "guessVowel") {
      // payload = { letter: "A" }
      const { letter } = payload || {};
      const L = String(letter || "").toUpperCase();
      if (!L || L.length !== 1 || !"AEIOU".includes(L)) {
        if (typeof cb === "function") cb({ ok: false, error: "Vocale non valida" });
        return;
      }

      // costa 500 punti (regola richiesta)
      const cost = 500;
      if ((player.totalScore || 0) < cost) {
        if (typeof cb === "function") cb({ ok: false, error: "Punti insufficienti per comprare vocale" });
        return;
      }

      // sottrai costo dai punti totali
      player.totalScore = (player.totalScore || 0) - cost;

      // conta occorrenze
      const normalized = room.phrase.normalizedText;
      const matches = (normalized.split("").filter((c) => c === L) || []).length;

      if (matches > 0) {
        // rivela vocali: penalità pagata già sottratta, aggiungiamo al turnScore 0 (vocali non danno punteggio)
        // rimane il turno
      } else {
        // nessuna occorrenza -> passa il turno
        room.currentPlayerIndex = nextPlayerIndex(room);
      }

      const state = {
        roomCode: code,
        players: room.players,
        currentPlayerIndex: room.currentPlayerIndex,
        lastSpin: room.lastSpin || null,
        phraseMask: room.phrase.normalizedText.replace(/[A-Z0-9]/g, "_"),
      };
      io.to(code).emit("gameState", { state });
      if (typeof cb === "function") cb({ ok: true, matches });
      return;
    }

    if (type === "solve") {
      // payload = { solution: "TESTO" }
      const { solution } = payload || {};
      const guess = normalize(solution || "");
      const target = room.phrase.normalizedText;
      if (guess === target) {
        // corretta: assegna bonus 1000 al player e termina round
        player.totalScore = (player.totalScore || 0) + 1000;
        player.turnScore = 0;
        room.gameStarted = false; // round finito in questa implementazione minimale
        const state = {
          roomCode: code,
          players: room.players,
          status: "SOLVED",
          winnerId: player.id,
          phrase: room.phrase.text,
        };
        io.to(code).emit("gameState", { state });
        if (typeof cb === "function") cb({ ok: true, solved: true });
        return;
      } else {
        // sbagliata: passa turno
        player.turnScore = 0;
        room.currentPlayerIndex = nextPlayerIndex(room);
        const state = {
          roomCode: code,
          players: room.players,
          currentPlayerIndex: room.currentPlayerIndex,
        };
        io.to(code).emit("gameState", { state });
        if (typeof cb === "function") cb({ ok: true, solved: false });
        return;
      }
    }

    if (typeof cb === "function") cb({ ok: false, error: "Azione non gestita" });
  });

  socket.on("disconnect", () => {
    // rimuovi da stanze se presente
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];
      if (!room) return;
      const pIndex = room.players.findIndex((p) => p.id === socket.id);
      if (pIndex !== -1) {
        room.players.splice(pIndex, 1);
        io.to(code).emit("roomUpdate", { room, roomCode: code });
      }
      const sIndex = room.spectators.findIndex((s) => s.id === socket.id);
      if (sIndex !== -1) {
        room.spectators.splice(sIndex, 1);
        io.to(code).emit("roomUpdate", { room, roomCode: code });
      }
    });

    console.log("Disconnesso", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server su porta ${PORT}`));
