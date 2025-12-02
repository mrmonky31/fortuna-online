// VERSIONE CON COORDINATE XY - MOD by MARCO
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
const isAccented = (ch) => /[ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]/i.test(ch);

export const eqMatch = (a, b) => normalize(a) === normalize(b);

/* =========================
   COSTRUZIONE GRIGLIA CON COORDINATE XY
   ========================= */
export function buildGridWithCoordinates(text, maxCols = 14, maxRows = 4) {
  const raw = String(text || "");
  const words = raw.split(/\s+/).filter(Boolean);
  
  const grid = {
    cells: [],
    rows: 0,
    cols: maxCols
  };
  
  let currentRow = 0;
  let currentCol = 0;
  let rowCells = [];
  
  const flushRow = () => {
    if (rowCells.length > 0) {
      // ✅ MAI iniziare riga con spazio
      while (rowCells.length > 0 && rowCells[0].type === "space") {
        rowCells.shift();
        // Ricalcola x delle celle rimanenti
        rowCells.forEach((cell, idx) => {
          cell.x = idx;
        });
      }
      
      grid.cells.push(...rowCells);
      grid.rows = currentRow + 1;
      rowCells = [];
      currentRow++;
      currentCol = 0;
    }
  };
  
  const addCell = (type, char, original) => {
    if (currentCol >= maxCols) {
      flushRow();
    }
    
    if (currentRow >= maxRows) return false;
    
    rowCells.push({
      x: currentCol,
      y: currentRow,
      type: type,
      char: char,
      original: original || char,
      masked: type === "letter" ? "_" : char
    });
    
    currentCol++;
    return true;
  };
  
  // Processa parola per parola
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Se non è la prima parola della riga, aggiungi spazio
    if (currentCol > 0) {
      if (!addCell("space", " ")) break;
    }
    
    // Processa caratteri della parola
    let charIndex = 0;
    while (charIndex < word.length) {
      const ch = word[charIndex];
      
      if (isPunct(ch)) {
        if (!addCell("punct", ch)) break;
        charIndex++;
      }
      else if (isLetter(ch)) {
        // ✅ Controlla se lettera + apostrofo = 1 cella
        if (charIndex + 1 < word.length && isApostrophe(word[charIndex + 1])) {
          const combined = ch + word[charIndex + 1];
          if (!addCell("letter", combined, combined)) break;
          charIndex += 2;
          // ✅ Aggiungi spazio dopo L', D', ecc
          if (!addCell("space", " ")) break;
        }
        // ✅ Lettera accentata
        else if (isAccented(ch)) {
          if (!addCell("letter", ch, ch)) break;
          charIndex++;
          // ✅ Aggiungi spazio dopo È, À, ecc
          if (!addCell("space", " ")) break;
        }
        // Lettera normale
        else {
          if (!addCell("letter", ch, ch)) break;
          charIndex++;
        }
      }
      else {
        if (!addCell("other", ch, ch)) break;
        charIndex++;
      }
    }
    
    if (currentRow >= maxRows) break;
  }
  
  // Flush ultima riga
  if (currentRow < maxRows) {
    flushRow();
  }
  
  return grid;
}

/* =========================
   GET CELLA A COORDINATE SPECIFICHE
   ========================= */
export function getCellAt(grid, x, y) {
  if (!grid || !Array.isArray(grid.cells)) return null;
  return grid.cells.find(cell => cell.x === x && cell.y === y) || null;
}

/* =========================
   GET TUTTE LE CELLE DI UNA RIGA
   ========================= */
export function getRowCells(grid, rowIndex) {
  if (!grid || !Array.isArray(grid.cells)) return [];
  return grid.cells.filter(cell => cell.y === rowIndex);
}

/* =========================
   CONVERTI GRIGLIA IN ARRAY DI RIGHE (per compatibilità)
   ========================= */
export function gridToRows(grid) {
  if (!grid || !Array.isArray(grid.cells)) return [];
  
  const rows = [];
  for (let y = 0; y < grid.rows; y++) {
    const rowCells = getRowCells(grid, y);
    const rowText = rowCells.map(cell => cell.original).join("");
    rows.push(rowText);
  }
  return rows;
}

/* =========================
   MASCHERATURA GRIGLIA
   ========================= */
export function maskGrid(grid, revealedLetters) {
  if (!grid || !Array.isArray(grid.cells)) return grid;
  
  const set = revealedLetters instanceof Set
    ? new Set([...revealedLetters].map(c => normalize(c)))
    : new Set((revealedLetters || []).map(c => normalize(c)));
  
  const maskedCells = grid.cells.map(cell => {
    const newCell = { ...cell };
    
    if (cell.type === "letter") {
      // Estrai lettera base (senza apostrofo)
      const baseLetter = cell.original.replace(/['`´']/g, "");
      
      if (set.has(normalize(baseLetter))) {
        newCell.masked = cell.original; // Rivelata
      } else {
        newCell.masked = "_"; // ✅ SEMPRE solo underscore
      }
    } else {
      newCell.masked = cell.char; // Spazi e punteggiatura restano visibili
    }
    
    return newCell;
  });
  
  return {
    ...grid,
    cells: maskedCells
  };
}

/* =========================
   TROVA COORDINATE LETTERA
   ========================= */
export function findLetterCoordinates(grid, targetLetter) {
  if (!grid || !Array.isArray(grid.cells)) return [];
  
  const norm = normalize(targetLetter);
  const coordinates = [];
  
  grid.cells.forEach(cell => {
    if (cell.type === "letter") {
      // Estrai lettera base
      const baseLetter = cell.original.replace(/['`´']/g, "");
      
      if (eqMatch(norm, baseLetter)) {
        coordinates.push({
          x: cell.x,
          y: cell.y,
          char: cell.original
        });
      }
    }
  });
  
  return coordinates;
}

/* =========================
   CONTA OCCORRENZE LETTERA (per compatibilità)
   ========================= */
export function letterOccurrences(rows, targetUpper) {
  // Converte rows in grid temporaneo
  const text = Array.isArray(rows) ? rows.join(" ") : "";
  const grid = buildGridWithCoordinates(text);
  const coords = findLetterCoordinates(grid, targetUpper);
  
  // Converti in formato vecchio {r, c, ch}
  return coords.map(coord => ({
    r: coord.y,
    c: coord.x,
    ch: coord.char
  }));
}

/* =========================
   BACKWARD COMPATIBILITY: buildBoard
   ========================= */
export function buildBoard(text, maxCols = 14, maxRows = 4) {
  const grid = buildGridWithCoordinates(text, maxCols, maxRows);
  return gridToRows(grid);
}

/* =========================
   BACKWARD COMPATIBILITY: maskBoard
   ========================= */
export function maskBoard(rows, revealedLetters) {
  const text = Array.isArray(rows) ? rows.join(" ") : "";
  const grid = buildGridWithCoordinates(text);
  const masked = maskGrid(grid, revealedLetters);
  return gridToRows(masked);
}
