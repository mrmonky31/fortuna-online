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
  const [glowingCells, setGlowingCells] = useState(new Set());
  const [revealedCells, setRevealedCells] = useState(new Set());
  
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
      
      for (let i = 0; i < origCell.char.length; i++) {
        charIndexToRenderIndex.set(charIndex + i, renderCells.length);
      }
      
      renderCells.push({
        type: origCell.type,
        char: maskCell ? maskCell.char : origCell.char,
        originalChar: origCell.char
      });
      
      charIndex += origCell.char.length;
      
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
      setGlowingCells(new Set());
      setRevealedCells(new Set());
      return;
    }

    // ✅ Converti indici e filtra
    const revealCellKeys = [];
    const seenRenderIndexes = new Set();
    
    revealQueue.forEach(({ r, c }) => {
      const rowData = boardData[r];
      if (rowData) {
        const renderIndex = rowData.charIndexToRenderIndex.get(c);
        if (renderIndex !== undefined) {
          const cell = rowData.renderCells[renderIndex];
          
          if (cell && cell.type !== "space" && !seenRenderIndexes.has(`${r}-${renderIndex}`)) {
            revealCellKeys.push(`${r}-${renderIndex}`);
            seenRenderIndexes.add(`${r}-${renderIndex}`);
          }
        }
      }
    });

    // ✅ ANIMAZIONE SEQUENZIALE
    const GLOW_DELAY = 150;      // Delay tra illuminazioni
    const GLOW_DURATION = 400;   // Durata glow su singola cella
    const REVEAL_DELAY = 100;    // Delay dopo glow prima di rivelare
    
    let timeoutIds = [];
    
    // Reset stato
    setGlowingCells(new Set());
    setRevealedCells(new Set());
    
    revealCellKeys.forEach((key, index) => {
      // ✅ FASE 1: Illumina (glow)
      const glowTimeout = setTimeout(() => {
        setGlowingCells(prev => new Set([...prev, key]));
      }, index * GLOW_DELAY);
      timeoutIds.push(glowTimeout);
      
      // ✅ FASE 2: Rivela lettera (dopo il glow)
      const revealTimeout = setTimeout(() => {
        setRevealedCells(prev => new Set([...prev, key]));
        setGlowingCells(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, index * GLOW_DELAY + GLOW_DURATION + REVEAL_DELAY);
      timeoutIds.push(revealTimeout);
    });
    
    // ✅ Cleanup finale
    const finalTimeout = setTimeout(() => {
      setGlowingCells(new Set());
      onRevealDone && onRevealDone();
    }, revealCellKeys.length * GLOW_DELAY + GLOW_DURATION + REVEAL_DELAY + 200);
    timeoutIds.push(finalTimeout);
    
    return () => {
      timeoutIds.forEach(clearTimeout);
    };

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
                  const cellKey = `${r}-${cellIndex}`;
                  const isGlowing = glowingCells.has(cellKey);
                  const isRevealed = revealedCells.has(cellKey);
                  const isVisible = !isMasked && !isSpace;
                  
                  return (
                    <div
                      key={cellIndex}
                      className={`pm-cell ${
                        isSpace ? "space" : (isVisible || isRevealed) ? "vis" : ""
                      } ${isGlowing ? "revealing" : ""}`}
                    >
                      <span>
                        {isSpace 
                          ? "\u00A0" 
                          : (isRevealed || isVisible ? cell.char : "\u00A0")
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
