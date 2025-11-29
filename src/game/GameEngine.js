// VERSIONE SENZA TIMER - MOD by MARCO
// src/game/GameEngine.js

/* =========================
   Normalizzazione / confronto
   ========================= */
// ✅ Normalizza per CONFRONTO: rimuove accenti e apostrofi
export const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Rimuove accenti
    .replace(/['`´']/g, "");           // Rimuove apostrofi

const isLetter = (ch) => /^[A-ZÀ-ÖØ-Ý]$/i.test(ch);
const isSpace  = (ch) => ch === " ";
const isPunct  = (ch) => ":!?".includes(ch);
const isApostrophe = (ch) => "'`´'".includes(ch);

// confronta due caratteri letterali ignorando accenti/case
export const eqMatch = (a, b) => normalize(a) === normalize(b);

/* =========================
   buildBoard: spezza una frase
   in righe maxCols x maxRows
   ========================= */
export function buildBoard(text, maxCols = 14, maxRows = 4) {
  const raw = String(text || "");
  const words = raw.split(/\s+/).filter(Boolean);

  const rows = [];
  let cur = "";

  const flush = () => {
    rows.push(cur);
    cur = "";
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (cur.length === 0) {
      // nuova riga
      if (w.length <= maxCols) {
        cur = w;
      } else {
        // parola più lunga di maxCols → hard wrap
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
      // prova ad aggiungere con spazio
      if (cur.length + 1 + w.length <= maxCols) {
        cur += " " + w;
      } else {
        flush();
        i--; // rielabora la stessa parola sulla prossima riga
      }
    }
    if (rows.length >= maxRows) break;
  }
  if (rows.length < maxRows && cur.length > 0) flush();

  // Se abbiamo superato maxRows per hard wrap, tronchiamo
  return rows.slice(0, maxRows);
}

/* =========================
   maskBoard: maschera le righe
   mantenendo spazi, :!? e apostrofi
   ========================= */
export function maskBoard(rows, revealedLetters) {
  const base = Array.isArray(rows) ? rows : [];
  // revealed può essere Set o Array
  const set =
    revealedLetters instanceof Set
      ? new Set([...revealedLetters].map((c) => normalize(c)))
      : new Set((revealedLetters || []).map((c) => normalize(c)));

  const masked = base.map((row) => {
    const chars = String(row || "").split("");
    return chars
      .map((ch) => {
        if (isSpace(ch)) return " ";
        if (isPunct(ch)) return ch; // lascia visibili :!?
        if (isApostrophe(ch)) return ch; // ✅ lascia visibili apostrofi
        if (isLetter(ch)) {
          return set.has(normalize(ch)) ? ch : "_";
        }
        // altri caratteri (numeri, simboli): lasciali passare
        return ch;
      })
      .join("");
  });

  return masked;
}

/* =========================
   Ricerca occorrenze di una lettera
   (usata da UI per reveal animato, ecc.)
   ========================= */
export function letterOccurrences(rows, targetUpper) {
  const norm = normalize(targetUpper);
  const hits = [];
  (Array.isArray(rows) ? rows : []).forEach((row, r) => {
    String(row || "")
      .split("")
      .forEach((ch, c) => {
        if (isSpace(ch) || isPunct(ch) || isApostrophe(ch)) return; // ✅ Ignora apostrofi
        if (isLetter(ch) && eqMatch(norm, ch)) hits.push({ r, c, ch });
      });
  });
  return hits;
}
