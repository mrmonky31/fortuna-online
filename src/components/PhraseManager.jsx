// src/components/PhraseManager.jsx
import React, { useState, useEffect } from "react";
import "../styles/phrase-manager.css";
import { parseToCells } from "../game/GameEngine";

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
  
  // ✅ USA parseToCells da GameEngine per COERENZA
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
  flash = null,
  roundColor = null,
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

  useEffect(() => {
    if (!revealQueue || revealQueue.length === 0) {
      setRevealingCells(new Set());
      return;
    }

    const cellKeys = revealQueue.map(({ r, c }) => `${r}-${c}`);
    const DELAY_BETWEEN_CELLS = 100;
    
    cellKeys.forEach((key, index) => {
      setTimeout(() => {
        setRevealingCells(prev => new Set([...prev, key]));
      }, index * DELAY_BETWEEN_CELLS);
    });

    const REVEAL_DURATION = 500;
    
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
        '--round-color': roundColor || '#00ff55'
      }}
    >
      <div
        className="pm-header"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: "40px",
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

      <div className="pm-board-wrapper">
        <div className="pm-board">
          {base.length > 0 ? (
            base.map((row, r) => (
              <div key={r} className="pm-row">
                {row.map((cell, c) => {
                  const cellChar = cell.char || "";
                  const isSpace = cellChar === " ";
                  const isMasked = cellChar.includes("_");
                  
                  return (
                    <div
                      key={c}
                      className={`pm-cell ${
                        isSpace ? "space" : cell.visible ? "vis" : ""
                      } ${revealingCells.has(`${r}-${c}`) ? "revealing" : ""}`}
                    >
                      <span>
                        {isSpace 
                          ? "\u00A0" 
                          : (cell.visible ? cellChar : "\u00A0")
                        }
                      </span>
                    </div>
                  );
                })}
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
