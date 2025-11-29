// src/components/PhraseManager.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/phrase-manager.css";
import { parseToCells } from "../game/GameEngine";

// ⏱️ ============================================
// PARAMETRI TIMING ANIMAZIONE - MODIFICA QUI
// ============================================
const TIMING = {
  GLOW_DELAY: 350,           // Delay tra illuminazione caselle (ms)
  PAUSE_BEFORE_REVEAL: 600,  // Pausa con tutte illuminate prima di rivelare (ms)
  REVEAL_DELAY: 350,         // Delay tra rivelazione lettere (ms)
  GLOW_FADE_OUT: 300,        // Durata fade-out glow dopo ultima rivelazione (ms)
};
// ============================================

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
  const timeoutsRef = useRef([]);
  const lastRevealQueueRef = useRef(null);
  
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
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    if (!revealQueue || revealQueue.length === 0) {
      return;
    }

    const currentQueueKey = JSON.stringify(revealQueue);
    if (currentQueueKey !== lastRevealQueueRef.current) {
      setGlowingCells(new Set());
      setRevealedCells(new Set());
      lastRevealQueueRef.current = currentQueueKey;
    }

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

    // ✅ CALCOLO AUTOMATICO TIMING
    const numCells = revealCellKeys.length;
    const totalGlowTime = (numCells - 1) * TIMING.GLOW_DELAY; // Prima cella a 0ms, ultima a (n-1)*delay
    const revealStartTime = totalGlowTime + TIMING.PAUSE_BEFORE_REVEAL;
    const totalRevealTime = (numCells - 1) * TIMING.REVEAL_DELAY;
    const totalAnimationTime = revealStartTime + totalRevealTime + TIMING.GLOW_FADE_OUT;
    
    console.log(`🎬 Animazione timing:
      - Celle da illuminare: ${numCells}
      - Fase GLOW: 0ms → ${totalGlowTime}ms
      - PAUSA: ${TIMING.PAUSE_BEFORE_REVEAL}ms
      - Fase REVEAL: ${revealStartTime}ms → ${revealStartTime + totalRevealTime}ms
      - Fade-out glow: ${TIMING.GLOW_FADE_OUT}ms
      - Durata totale: ${totalAnimationTime}ms
    `);
    
    // ✅ FASE 1: Illumina caselle una per volta
    revealCellKeys.forEach((key, index) => {
      const t = setTimeout(() => {
        setGlowingCells(prev => new Set([...prev, key]));
      }, index * TIMING.GLOW_DELAY);
      timeoutsRef.current.push(t);
    });
    
    // ✅ FASE 2: Rivela lettere una per volta (glow ancora attivo)
    revealCellKeys.forEach((key, index) => {
      const t = setTimeout(() => {
        setRevealedCells(prev => new Set([...prev, key]));
      }, revealStartTime + (index * TIMING.REVEAL_DELAY));
      timeoutsRef.current.push(t);
    });
    
    // ✅ FASE 3: Spegni glow dopo fade-out
    const t = setTimeout(() => {
      setGlowingCells(new Set());
      onRevealDone && onRevealDone();
    }, totalAnimationTime);
    timeoutsRef.current.push(t);
    
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };

  }, [revealQueue]);

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
                  
                  const shouldShowLetter = isVisible || isRevealed;
                  
                  return (
                    <div
                      key={cellIndex}
                      className={`pm-cell ${
                        isSpace ? "space" : shouldShowLetter ? "vis" : ""
                      } ${isGlowing ? "glowing" : ""}`}
                    >
                      <span>
                        {isSpace 
                          ? "\u00A0" 
                          : (shouldShowLetter ? cell.char : "\u00A0")
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
