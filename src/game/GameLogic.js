// VERSIONE SENZA TIMER - MOD by MARCO
// src/game/GameLogic.js
import { SPIN_PATTERNS } from "./spinPatterns";

/* =========================
   Utils di normalizzazione
   ========================= */
export function normalizeText(str = "") {
  return String(str)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’‘`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const isVowel = (ch) => "AEIOU".includes(ch);
const isLetter = (ch) => /^[A-ZÀ-ÖØ-Ý]$/i.test(ch);
const eqChar = (a, b) => normalizeText(a) == normalizeText(b);

/* =========================
   Ruota: pattern degli spicchi
   ========================= */
let lastPatternIndex = -1;
export function generateWheel() {
  if (!Array.isArray(SPIN_PATTERNS) || !SPIN_PATTERNS.length) return [];
  let patternIndex;
  do {
    patternIndex = Math.floor(Math.random() * SPIN_PATTERNS.length);
  } while (patternIndex === lastPatternIndex && SPIN_PATTERNS.length > 1);
  lastPatternIndex = patternIndex;
  return SPIN_PATTERNS[patternIndex];
}

/* =========================
   Stato iniziale di gioco
   ========================= */
export function createInitialGameState(players, totalRounds, options = {}) {
  return {
    players: players.map((p) => ({ name: p.name, totalScore: 0, roundScore: 0 })),
    totalRounds,
    currentRound: 1,
    currentPlayerIndex: 0,

    phrase: null,
    rows: [],
    category: null,

    revealedLetters: new Set(),
    usedLetters: new Set(),

    mustSpin: true,
    spinning: false,
    gameMessage: null,
    options,

    // pattern corrente della ruota
    wheel: generateWheel(),

    // SOLO mini countdown tra i round (3s). Nessun timer di turno.
    countdown: { active: false, remaining: 0 },

    // gating per “consonante”
    awaitingConsonant: false,

    // flag doppi punti da “RADDOPPIA”
    pendingDouble: false,

    lastSpinTarget: 0
  };
}

/* =========================
   Avvio / cambio round
   ========================= */
export function startRound(state, phrase, rows, category = null) {
  const s = { ...state };
  s.phrase = String(phrase ?? "");
  s.rows = Array.isArray(rows) ? rows : [];
  s.category = category ?? null;

  s.revealedLetters = new Set();
  s.usedLetters = new Set();

  s.mustSpin = true;
  s.awaitingConsonant = false;
  s.spinning = false;
  s.pendingDouble = false;
  s.lastSpinTarget = 0;

  // imposta pattern ruota per il nuovo round
  s.wheel = generateWheel();

  s.gameMessage = { type: "info", text: "🎬 Nuovo round!" };
  return s;
}

/* =========================
   Spin della ruota
   ========================= */
export function applyWheelSpin(state /*, speedMs */) {
  return {
    ...state,
    spinning: true,
    gameMessage: null
  };
}

export function applyWheelOutcome(state, outcome) {
  const s = { ...state, spinning: false, gameMessage: null };
  if (!outcome || !outcome.type) return s;

  if (outcome.type === "points") {
    s.lastSpinTarget = Number(outcome.value ?? 0);
    s.mustSpin = false;
    s.awaitingConsonant = true;
    s.gameMessage = { type: "info", text: `Valore: ${s.lastSpinTarget} pt. Inserisci una consonante.` };
    return s;
  }

  if (outcome.type === "double") {
    s.pendingDouble = true;
    s.mustSpin = false;
    s.awaitingConsonant = true;
    s.gameMessage = { type: "info", text: "🎯 RADDOPPIA attivo: gioca una consonante!" };
    return s;
  }

  if (outcome.type === "pass") {
    s.pendingDouble = false;
    s.awaitingConsonant = false;
    s.mustSpin = true;
    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    s.gameMessage = { type: "warning", text: "PASSA: tocca al prossimo giocatore." };
    return s;
  }

  if (outcome.type === "bankrupt") {
    const i = s.currentPlayerIndex;
    const cur = { ...s.players[i] };
    cur.roundScore = 0;
    cur.totalScore = 0;
    s.players = s.players.map((p, idx) => (idx === i ? cur : p));
    s.pendingDouble = false;
    s.awaitingConsonant = false;
    s.mustSpin = true;
    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    s.gameMessage = { type: "error", text: "BANCAROTTA: punteggi azzerati. Turno al prossimo." };
    return s;
  }

  s.gameMessage = { type: "info", text: String(outcome.label ?? "—") };
  return s;
}

/* =========================
   CONSONANTE
   ========================= */
export function playConsonant(state, letter) {
  let s = { ...state, gameMessage: null };

  const upper = normalizeText((letter || "").trim());
  if (!upper || !/^[A-Z]$/.test(upper) || isVowel(upper)) {
    return { ...s, gameMessage: { type: "error", text: "Inserisci UNA CONSONANTE (A-Z, no vocali)." } };
  }

  if (s.mustSpin) {
    return { ...s, gameMessage: { type: "warning", text: "Devi prima GIRARE la ruota." } };
  }

  const used = new Set(s.usedLetters);
  if (used.has(upper)) {
    s.pendingDouble = false;
    s.awaitingConsonant = false;
    s.mustSpin = true;
    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    return { ...s, usedLetters: used, gameMessage: { type: "info", text: `Lettera ${upper} già usata. Turno al prossimo.` } };
  }
  used.add(upper);
  s.usedLetters = used;

  const phrase = String(s.phrase || "");
  const hits = [...phrase].filter((srcCh) => isLetter(srcCh) && eqChar(srcCh, upper) && !isVowel(srcCh)).length;

  if (hits > 0) {
    const i = s.currentPlayerIndex;
    const cur = { ...s.players[i] };
    const val = Number(s.lastSpinTarget || 0);
    let gained = val * hits;
    if (s.pendingDouble) {
      cur.roundScore *= 2;
      s.pendingDouble = false;
    }
    cur.roundScore += gained;
    s.players = s.players.map((p, idx) => (idx === i ? cur : p));

    const newRevealed = new Set(s.revealedLetters);
    newRevealed.add(upper);
    s.revealedLetters = newRevealed;

    s.mustSpin = true;
    s.awaitingConsonant = false;
    s.gameMessage = { type: "success", text: `Hai trovato ${hits} ${upper}! +${gained} punti.` };
  } else {
    s.pendingDouble = false;
    s.awaitingConsonant = false;
    s.mustSpin = true;
    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    s.gameMessage = { type: "error", text: `Nessuna ${upper}. Turno al prossimo.` };
  }

  return s;
}

/* =========================
   VOCALE (acquisto)
   ========================= */
export function buyVowel(state, letter) {
  let s = { ...state, gameMessage: null };

  const upper = normalizeText((letter || "").trim());
  if (!upper || !/^[A-Z]$/.test(upper) || !isVowel(upper)) {
    return { ...s, gameMessage: { type: "error", text: "Inserisci UNA VOCALE (A, E, I, O, U)." } };
  }

  const cost = Number(s.options?.vowelCost ?? 500);
  const i = s.currentPlayerIndex;
  const cur = { ...s.players[i] };

  if (cur.roundScore < cost) {
    return { ...s, gameMessage: { type: "warning", text: `Servono almeno ${cost} punti per comprare una vocale.` } };
  }

  const used = new Set(s.usedLetters);
  if (used.has(upper)) {
    return { ...s, gameMessage: { type: "info", text: `La vocale ${upper} è già stata usata.` } };
  }

  cur.roundScore -= cost;
  s.players = s.players.map((p, idx) => (idx === i ? cur : p));

  const phrase = String(s.phrase || "");
  const hits = [...phrase].filter((srcCh) => isLetter(srcCh) && eqChar(srcCh, upper) && isVowel(srcCh)).length;

  used.add(upper);
  s.usedLetters = used;

  if (hits > 0) {
    const rev = new Set(s.revealedLetters);
    rev.add(upper);
    s.revealedLetters = rev;
    s.mustSpin = true;
    s.awaitingConsonant = false;
    s.gameMessage = { type: "success", text: `Rivelate ${hits} ${upper}. (-${cost} pt)` };
  } else {
    s.mustSpin = true;
    s.awaitingConsonant = false;
    s.gameMessage = { type: "error", text: `Nessuna ${upper}. (-${cost} pt)` };
  }

  return s;
}

/* =========================
   Tentativo soluzione
   ========================= */
export function trySolve(state, solutionText) {
  let s = { ...state, gameMessage: null };
  const guess = normalizeText(solutionText || "");
  const target = normalizeText(s.phrase || "");

  if (!guess) return { ...s, gameMessage: { type: "warning", text: "Scrivi una soluzione." } };

  if (guess === target) {
    const i = s.currentPlayerIndex;
    const cur = { ...s.players[i] };
    cur.totalScore += cur.roundScore;
    // 💰 Bonus per soluzione corretta
const bonus = 1000;
cur.totalScore += bonus;
s.gameMessage = { type: "success", text: `✅ Frase indovinata! +${bonus} PUNTI BONUS!` };

    s.players = s.players.map((p, idx) => (idx === i ? cur : p));
// 🔥 Rivela tutta la frase
  const allLetters = [...normalizeText(s.phrase || "")].filter(ch => /[A-Z]/.test(ch));
  s.revealedLetters = new Set(allLetters);

    s.gameMessage = { type: "success", text: "✅ Frase indovinata!" };
    s.countdown = { active: true, remaining: 7 }; // mini countdown
    s.mustSpin = false;
    s.awaitingConsonant = false;
    s.pendingDouble = false;
    return s;
  }

  s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
  s.mustSpin = true;
  s.awaitingConsonant = false;
  s.pendingDouble = false;
  s.gameMessage = { type: "error", text: "Soluzione non corretta." };
  return s;
}

/* =========================
   Tick logico: SOLO countdown round
   ========================= */
export function applyCountdownTick(state) {
  const s = { ...state };
  if (!s.countdown?.active) return s;
  const rem = (s.countdown.remaining || 0) - 1;
  if (rem > 0) {
    s.countdown = { active: true, remaining: rem };
    return s;
  }
  s.countdown = { active: false, remaining: 0 };
  return nextRound(s);
}

/* =========================
   Cambio frase manuale
   ========================= */
export function changePhrase(state, newPhrase, newRows, newCategory) {
  return {
    ...state,
    phrase: newPhrase,
    rows: newRows,
    revealedLetters: new Set(),
    usedLetters: new Set(),
    category: newCategory,
    mustSpin: true,
    awaitingConsonant: false,
    gameMessage: { type: "info", text: "Nuova frase caricata!" }
  };
}

/* =========================
   Avanzamento round / partita
   ========================= */
export function nextRound(state) {
  let s = { ...state };

  if (s.nextRoundPayload) {
    const { phrase, rows, category } = s.nextRoundPayload;
    s = startRound(s, phrase || "", Array.isArray(rows) ? rows : [], category ?? null);
    s.nextRoundPayload = null;
    return s;
  }

  const provider = s.options?.getNextRoundData;
  if (typeof provider === "function") {
    const payload = provider();
    if (payload?.phrase && Array.isArray(payload?.rows) && payload.rows.length) {
      s = startRound(s, payload.phrase, payload.rows, payload.category ?? null);
    } else {
      s = startRound(s, "", [], null);
    }
  } else {
    s = startRound(s, "", [], null);
  }

  // Avanza round e reset punteggi round
  s = finalizeRound(s, { capAtTotal: true });
  return s;
}

export function finalizeRound(state, options = {}) {
  const cap = options?.capAtTotal === true;
  const next = (state.currentRound || 1) + 1;
  if (cap && next > state.totalRounds) {
    return { ...state, gameOver: true, mustSpin: false, gameMessage: { type: "success", text: "🏁 Partita terminata!" } };
  }
  return {
    ...state,
    currentRound: next,
    players: state.players.map((p) => ({ ...p, roundScore: 0 })),
    pendingDouble: false,
    mustSpin: true,
    awaitingConsonant: false
  };
}
