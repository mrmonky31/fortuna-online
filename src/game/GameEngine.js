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
   parseToCells: converte stringa in array di caselle
   ✅ Definisce ESATTAMENTE la struttura: L' = 1 casella
   ========================= */
function parseToCells(text) {
  const cells = [];
  const str = String(text || "");
  let i = 0;
  
  while (i < str.length) {
    const ch = str[i];
    
    if (ch === " ") {
      cells.push({ type: "space", char: " " });
      i++;
    } else if (isPunct(ch)) {
      cells.push({ type: "punct", char: ch });
      i++;
    } else if (isLetter(ch)) {
      // Lettera SEGUITA da apostrofo → 1 casella
      if (i + 1 < str.length && isApostrophe(str[i + 1])) {
        cells.push({ type: "letter", char: ch + str[i + 1] }); // L'
        i += 2;
      } else {
        cells.push({ type: "letter", char: ch });
        i++;
      }
    } else if (isApostrophe(ch)) {
      // Apostrofo isolato
      cells.push({ type: "letter", char: ch });
      i++;
    } else {
      cells.push({ type: "other", char: ch });
      i++;
    }
  }
  
  return cells;
}

/* =========================
   maskBoard: maschera usando STESSA struttura caselle
   ✅ ZERO errori di allineamento
   ========================= */
export function maskBoard(rows, revealedLetters) {
  const base = Array.isArray(rows) ? rows : [];
  const set =
    revealedLetters instanceof Set
      ? new Set([...revealedLetters].map((c) => normalize(c)))
      : new Set((revealedLetters || []).map((c) => normalize(c)));

  const masked = base.map((row) => {
    const cells = parseToCells(row);
    
    const maskedCells = cells.map(cell => {
      if (cell.type === "space") return " ";
      if (cell.type === "punct") return cell.char; // :!? visibili
      
      if (cell.type === "letter") {
        // Estrai la LETTERA base (senza apostrofo) per controllo
        const baseLetter = cell.char.replace(/['`´']/g, "");
        
        if (set.has(normalize(baseLetter))) {
          return cell.char; // Rivelata (con apostrofo se c'è)
        } else {
          return "_"; // Mascherata (sempre 1 underscore)
        }
      }
      
      return cell.char;
    });
    
    return maskedCells.join("");
  });

  return masked;
}

/* =========================
   Ricerca occorrenze di una lettera
   ✅ USA parseToCells per consistenza struttura
   ========================= */
export function letterOccurrences(rows, targetUpper) {
  const norm = normalize(targetUpper);
  const hits = [];
  
  (Array.isArray(rows) ? rows : []).forEach((row, r) => {
    const cells = parseToCells(row);
    let cellIndex = 0;
    
    cells.forEach((cell) => {
      if (cell.type === "letter") {
        // Estrai lettera base senza apostrofo
        const baseLetter = cell.char.replace(/['`´']/g, "");
        
        if (eqMatch(norm, baseLetter)) {
          // Trova TUTTE le posizioni carattere di questa casella
          // Se è L' devo aggiungere sia L che '
          const charPositions = [];
          let charCount = 0;
          
          for (let i = 0; i < cell.char.length; i++) {
            charPositions.push({ r, c: cellIndex + i, ch: cell.char[i] });
            charCount++;
          }
          
          hits.push(...charPositions);
        }
      }
      
      // Avanza cellIndex del numero di caratteri in questa casella
      cellIndex += cell.char.length;
    });
  });
  
  return hits;
}
