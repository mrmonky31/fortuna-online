// src/components/PhraseManager.jsx
import React, { useState, useEffect } from "react";
import "../styles/phrase-manager.css";

// ✅ STESSA logica di GameEngine.js parseToCells
function parseToCells(text) {
  const isApostrophe = (ch) => "'`´'".includes(ch);
  const isLetter = (ch) => /^[A-ZÀ-ÖØ-Ý]$/i.test(ch);
  const isPunct = (ch) => ":!?".includes(ch);
  
  const cells = [];
  const str = String(text || "");
  let i = 0;
  
  while (i < str.length) {
    const ch = str[i];
    
    if (ch === "_") {
      // ✅ "_ " = L' mascherata (underscore + spazio)
      if (i + 1 < str.length && str[i + 1] === " ") {
        cells.push({ type: "letter", char: "_ " });
        i += 2;
      } else {
        cells.push({ type: "letter", char: "_" });
        i++;
      }
    } else if (ch === " ") {
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

function toCell(cell) {
  if (cell && typeof cell === "object" && "char" in cell) {
    const ch = String(cell.char ?? "");
    return { char: ch, visible: Boolean(cell.visible) };
  }
  const ch = String(cell ?? "");
  const isSpace = ch === " ";
  return { char: ch, visible: !isSpace && ch !== "" };
}

function toRow(row) {
  if (Array.isArray(row)) return row.map(toCell);
  
  // ✅ USA parseToCells per COERENZA con GameEngine
  const cells = parseToCells(row);
  return cells.map(cell => toCell(cell.char));
}

export default function PhraseManager({
  rows = [],
  maskedRows = [],
  revealQueue = [],
  onRevealDone = () => {},
  category = "-",
  onChangePhrase = () => {},
  flash = null, // "success" | "error" | null
  roundColor = null, // ✅ NUOVO: colore per round
}) {
  const [revealingCells, setRevealingCells] = useState(new Set());
  
  const base = (Array.isArray(rows) && rows.length
    ? maskedRows?.length
      ? maskedRows
      : rows
    : []
  )
    .map(toRow)
    .filter((r) => r.length > 0);

  // ✅ Gestione rivelazione animata
  useEffect(() => {
    if (!revealQueue || revealQueue.length === 0) {
      setRevealingCells(new Set());
      return;
    }

    const cellKeys = revealQueue.map(({ r, c }) => `${r}-${c}`);
    const newSet = new Set(cellKeys);
    
    // ⏱️ RIGA MODIFICABILE: Delay tra illuminazione caselle (ms)
    const DELAY_BETWEEN_CELLS = 100; // ← Cambia questo valore (100ms = 0.1s)
    
    cellKeys.forEach((key, index) => {
      setTimeout(() => {
        setRevealingCells(prev => new Set([...prev, key]));
      }, index * DELAY_BETWEEN_CELLS);
    });

    // ⏱️ RIGA MODIFICABILE: Durata totale animazione reveal (ms)
    const REVEAL_DURATION = 500; // ← Cambia questo valore (500ms = 0.5s)
    
    setTimeout(() => {
      setRevealingCells(new Set());
      onRevealDone && onRevealDone();
    }, cellKeys.length * DELAY_BETWEEN_CELLS + REVEAL_DURATION);

  }, [revealQueue, onRevealDone]);

  const flashClass =
    flash === "success"
      ? "tiles-flash-success"
      : flash === "error"
      ? "tiles-flash-error"
      : "";

  return (
    <div 
      className={`phrase-manager ${flashClass}`}
      style={{
        // ✅ Passa colore round come variabile CSS
        '--round-color': roundColor || '#00ff55'
      }}
    >
      {/* 🔹 HEADER ORDINATA: Cambia frase → Categoria */}
      <div
  className="pm-header"
  style={{
    width: "100%",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "40px", // distanza tra pulsante e categoria
    marginBottom: 8,
  }}
>
  <button className="btn-secondary" onClick={() => onChangePhrase()}>
    Cambia frase
  </button>

  <div className="pm-category">
    Categoria: <strong>{category || "-"}</strong>
  </div>
</div>


      {/* 🔥 WRAPPER ISOLATO PER IL TABELLONE */}
      <div className="pm-board-wrapper">
        <div className="pm-board">
          {base.length > 0 ? (
            base.map((row, r) => (
              <div key={r} className="pm-row">
                {row.map((cell, c) => (
                  
                 <div
  key={c}
  
  className={`pm-cell ${
    cell.char === " " ? "space" : cell.visible ? "vis" : ""
  } ${revealingCells.has(`${r}-${c}`) ? "revealing" : ""}`}
  
>
  <span>{cell.char === "_" ? "\u00A0" : (cell.visible ? cell.char : "\u00A0")}</span>

</div>

                ))}
              </div>
            ))
          ) : (
            <div className="pm-empty">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
