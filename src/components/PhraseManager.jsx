// src/components/PhraseManager.jsx
import React, { useState, useEffect } from "react";
import "../styles/phrase-manager.css";

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
  
  // ✅ RAGGRUPPA lettera+apostrofo in UNA SOLA CELLA (L')
  const text = String(row || "");
  const cells = [];
  const isApostrophe = (ch) => "'`´'".includes(ch);
  const isLetter = (ch) => /^[A-ZÀ-ÖØ-Ý]$/i.test(ch);
  
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

// ➕ Dopo apostrofo/accento, se manca lo spazio lo aggiunge (PRIMA DI TUTTO)
if ("'`´’".includes(ch)) {
  const next = text[i + 1] || "";
  if (next !== " ") {
    cells.push(toCell(ch));
    cells.push(toCell(" "));
    i++;
    continue;
  }
}

    
    if (ch === " ") {
      // Spazio = casella nera
      cells.push(toCell(ch));
      i++;
    } else if (isLetter(ch)) {
      // Lettera SEGUITA da apostrofo → uniscili (L')
      if (i + 1 < text.length && isApostrophe(text[i + 1])) {
        cells.push(toCell(ch + text[i + 1])); // Es: L'
        i += 2;
      } else {
        cells.push(toCell(ch));
        i++;
      }
    } else {
      // Carattere normale (_, lettere singole, ecc)
      cells.push(toCell(ch));
      i++;
    }
  }
  
  return cells;
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
    
    // 🔍 Controllo extra sulla mascheratura: verifica che maskedRows e rows coincidano
if (maskedRows?.length) {
  const parsedOriginal = rows.map(toRow);
  const parsedMasked = maskedRows.map(toRow);

  let mismatch = false;

  if (parsedOriginal.length !== parsedMasked.length) {
    mismatch = true;
  } else {
    for (let r = 0; r < parsedOriginal.length; r++) {
      if (parsedOriginal[r].length !== parsedMasked[r].length) {
        mismatch = true;
        break;
      }
    }
  }

  // Se la mascheratura è sbagliata → rigenera automaticamente
  if (mismatch) {
    console.warn("⚠️ Mascheratura sfasata: rigenero maskedRows automaticamente");
    base.splice(
      0,
      base.length,
      ...parsedOriginal
    );
  }
}


  // ✅ Gestione rivelazione animata
  useEffect(() => {
    if (!revealQueue || revealQueue.length === 0) {
      setRevealingCells(new Set());
      return;
    }

    const cellKeys = revealQueue.map(({ r, c }) => `${r}-${c}`);
    const newSet = new Set(cellKeys);
    
    // ⏱️ RIGA MODIFICABILE: Delay tra illuminazione caselle (ms)
    const DELAY_BETWEEN_CELLS = 800; // ← Cambia questo valore (100ms = 0.1s)
    
    cellKeys.forEach((key, index) => {
      setTimeout(() => {
        setRevealingCells(prev => new Set([...prev, key]));
      }, index * DELAY_BETWEEN_CELLS);
    });

    // ⏱️ RIGA MODIFICABILE: Durata totale animazione reveal (ms)
    const REVEAL_DURATION = 100; // ← Cambia questo valore (500ms = 0.5s)
    
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
