// VERSIONE SENZA TIMER - MOD by MARCO
// src/game/GameEngine.js

export const normalize = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['`´']/g, "");

const isLetter = (ch) => /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]$/i.test(ch);
const isSpace  = (ch) => ch === " ";
const isPunct  = (ch) => ":!?".includes(ch);
const isApostrophe = (ch) => "'`´'".includes(ch);

export const eqMatch = (a, b) => normalize(a) === normalize(b);

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

export function parseToCells(text) {
  const cells = [];
  const str = String(text || "");
  let i = 0;
  
  while (i < str.length) {
    const ch = str[i];
    
    if (ch === " ") {
      cells.push({ type: "space", char: " " });
      i++;
    } 
    else if (isPunct(ch)) {
      cells.push({ type: "punct", char: ch });
      i++;
    } 
    else if (ch === "_") {
      cells.push({ type: "letter", char: "_" });
      i++;
    }
    else if (isLetter(ch)) {
      // Lettera + apostrofo = 1 CASELLA
      if (i + 1 < str.length && isApostrophe(str[i + 1])) {
        cells.push({ type: "letter", char: ch + str[i + 1] }); // "L'"
        i += 2;
      } else {
        cells.push({ type: "letter", char: ch });
        i++;
      }
    } 
    else if (isApostrophe(ch)) {
      cells.push({ type: "letter", char: ch });
      i++;
    }
    else {
      cells.push({ type: "other", char: ch });
      i++;
    }
  }
  
  return cells;
}

export function maskBoard(rows, revealedLetters) {
  const base = Array.isArray(rows) ? rows : [];
  const set =
    revealedLetters instanceof Set
      ? new Set([...revealedLetters].map((c) => normalize(c)))
      : new Set((revealedLetters || []).map((c) => normalize(c)));

  const masked = base.map((row) => {
    const cells = parseToCells(row);
    
    const maskedChars = cells.map(cell => {
      if (cell.type === "space") return " ";
      if (cell.type === "punct") return cell.char;
      
      if (cell.type === "letter") {
        const baseLetter = cell.char.replace(/['`´']/g, "");
        
        if (set.has(normalize(baseLetter))) {
          return cell.char; // Rivelata
        } else {
          return "_"; // ✅ Mascherata: SEMPRE solo underscore
        }
      }
      
      return cell.char;
    });
    
    return maskedChars.join("");
  });

  return masked;
}

export function letterOccurrences(rows, targetUpper) {
  const norm = normalize(targetUpper);
  const hits = [];
  
  (Array.isArray(rows) ? rows : []).forEach((row, r) => {
    const cells = parseToCells(row);
    let charIndex = 0;
    
    cells.forEach((cell) => {
      if (cell.type === "letter") {
        const baseLetter = cell.char.replace(/['`´']/g, "");
        
        if (eqMatch(norm, baseLetter)) {
          for (let i = 0; i < cell.char.length; i++) {
            hits.push({ r, c: charIndex + i, ch: cell.char[i] });
          }
        }
      }
      
      charIndex += cell.char.length;
    });
  });
  
  return hits;
}
