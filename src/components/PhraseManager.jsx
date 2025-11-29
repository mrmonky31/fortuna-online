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
  
  // ✅ Crea struttura celle con mappatura indici
  const boardData = rows.map((origRow, rowIndex) => {
    const origCells = parseToCells(origRow);
    const maskRow = maskedRows[rowIndex] || origRow;
    const maskCells = parseToCells(maskRow);
    
    const renderCells = [];
    const charIndexToRenderIndex = new Map();
    
    let charIndex = 0;
    
    origCells.forEach((origCell, cellIndex) => {
      const maskCell = maskCells[cellIndex];
      
      // ✅ Mappa TUTTI i caratteri di questa casella all'indice render corrente
      for (let i = 0; i < origCell.char.length; i++) {
        charIndexToRenderIndex.set(charIndex + i, renderCells.length);
      }
      
      // Aggiungi la cella
      renderCells.push({
        type: origCell.type,
        char: maskCell ? maskCell.char : origCell.char,
        originalChar: origCell.char
      });
      
      charIndex += origCell.char.length;
      
      // ✅ Se ha apostrofo o è accentata, aggiungi spazio
      if (origCell.type === "letter") {
        const hasApostrophe = origCell.char.includes("'") || origCell.char.includes("'") || 
                             origCell.char.includes("`") || origCell.char.includes("´");
        const isAccented = /[ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]/i.test(origCell.char);
        
        if (hasApostrophe || isAccented) {
          const nextCell = origCells[cellIndex + 1];
          if (!nextCell || nextCell.type !== "space") {
            renderCells.push({ type: "space", char: " " });
          }
        }
      }
    });
    
    return { renderCells, charIndexToRenderIndex };
  });

  useEffect(() => {
    if (!revealQueue || revealQueue.length === 0) {
      setRevealingCells(new Set());
      return;
    }

    // ✅ Converti indici e FILTRA celle space
    const revealCellKeys = [];
    const seenRenderIndexes = new Set(); // Evita duplicati
    
    revealQueue.forEach(({ r, c }) => {
      const rowData = boardData[r];
      if (rowData) {
        const renderIndex = rowData.charIndexToRenderIndex.get(c);
        if (renderIndex !== undefined) {
          const cell = rowData.renderCells[renderIndex];
          
          // ✅ Illumina SOLO se NON è una cella space E non l'abbiamo già aggiunta
          if (cell && cell.type !== "space" && !seenRenderIndexes.has(`${r}-${renderIndex}`)) {
            revealCellKeys.push(`${r}-${renderIndex}`);
            seenRenderIndexes.add(`${r}-${renderIndex}`);
          }
        }
      }
    });

    const DELAY_BETWEEN_CELLS = 100;
    
    revealCellKeys.forEach((key, index) => {
      setTimeout(() => {
        setRevealingCells(prev => new Set([...prev, key]));
      }, index * DELAY_BETWEEN_CELLS);
    });

    const REVEAL_DURATION = 500;
    
    setTimeout(() => {
      setRevealingCells(new Set());
      onRevealDone && onRevealDone();
    }, revealCellKeys.length * DELAY_BETWEEN_CELLS + REVEAL_DURATION);

  }, [revealQueue, onRevealDone, boardData]);

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
          {boardData.length > 0 ? (
            boardData.map((rowData, r) => (
              <div key={r} className="pm-row">
                {rowData.renderCells.map((cell, cellIndex) => {
                  const isSpace = cell.type === "space";
                  const isMasked = cell.char === "_";
                  const isVisible = !isMasked && !isSpace;
                  
                  return (
                    <div
                      key={cellIndex}
                      className={`pm-cell ${
                        isSpace ? "space" : isVisible ? "vis" : ""
                      } ${revealingCells.has(`${r}-${cellIndex}`) ? "revealing" : ""}`}
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
