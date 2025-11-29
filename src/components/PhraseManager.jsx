// src/components/PhraseManager.jsx
import React, { useState, useEffect } from "react";
import "../styles/phrase-manager.css";
import { parseToCells } from "../game/GameEngine";

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
  
  // ✅ Converti righe in celle da renderizzare
  const boardCells = (maskedRows?.length ? maskedRows : rows).map(row => {
    const cells = parseToCells(row);
    const renderCells = [];
    
    cells.forEach((cell, idx) => {
      // Aggiungi la cella
      renderCells.push(cell);
      
      // ✅ Se la cella contiene apostrofo o è lettera accentata, aggiungi SPAZIO dopo
      if (cell.type === "letter") {
        const hasApostrophe = cell.char.includes("'") || cell.char.includes("'") || 
                             cell.char.includes("`") || cell.char.includes("´");
        const isAccented = /[ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]/i.test(cell.char);
        
        // Se ha apostrofo O è accentata, aggiungi spazio DOPO
        if (hasApostrophe || isAccented) {
          // Guarda la prossima cella: se NON è già uno spazio, aggiungilo
          const nextCell = cells[idx + 1];
          if (!nextCell || nextCell.type !== "space") {
            renderCells.push({ type: "space", char: " " });
          }
        }
      }
    });
    
    return renderCells;
  });

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
          {boardCells.length > 0 ? (
            boardCells.map((rowCells, r) => (
              <div key={r} className="pm-row">
                {rowCells.map((cell, cellIndex) => {
                  const isSpace = cell.type === "space";
                  const isMasked = cell.char === "_";
                  const isVisible = !isMasked && !isSpace;
                  
                  // Calcola indice carattere per reveal
                  let charIndex = 0;
                  for (let i = 0; i < cellIndex; i++) {
                    charIndex += rowCells[i].char.length;
                  }
                  
                  return (
                    <div
                      key={cellIndex}
                      className={`pm-cell ${
                        isSpace ? "space" : isVisible ? "vis" : ""
                      } ${revealingCells.has(`${r}-${charIndex}`) ? "revealing" : ""}`}
                    >
                      <span>
                        {isSpace 
                          ? "\u00A0" 
                          : (isMasked ? "\u00A0" : cell.char)
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
