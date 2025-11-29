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
  GLOW_DURATION: 800,        // Durata glow su singola cella (ms)
  REVEAL_DELAY: 350,         // Delay tra rivelazione lettere (ms)
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
    const totalGlowTime = (numCells - 1) * TIMING.GLOW_DELAY;
    const revealStartTime = totalGlowTime + TIMING.PAUSE_BEFORE_REVEAL;
    
    console.log(`🎬 Animazione timing (${numCells} celle):
      - GLOW fase: 0ms → ${totalGlowTime}ms (delay: ${TIMING.GLOW_DELAY}ms)
      - PAUSA: ${TIMING.PAUSE_BEFORE_REVEAL}ms
      - REVEAL inizio: ${revealStartTime}ms
      - Durata glow singola cella: ${TIMING.GLOW_DURATION}ms
    `);
    
    // ✅ FASE 1: Illumina caselle una per volta
    revealCellKeys.forEach((key, index) => {
      const glowStartTime = index * TIMING.GLOW_DELAY;
      
      // Accendi glow
      const t1 = setTimeout(() => {
        setGlowingCells(prev => new Set([...prev, key]));
      }, glowStartTime);
      timeoutsRef.current.push(t1);
    });
    
    // ✅ FASE 2: Rivela lettere una per volta DOPO il glow
    revealCellKeys.forEach((key, index) => {
      const revealTime = revealStartTime + (index * TIMING.REVEAL_DELAY);
      
      // Prima spegni il glow su questa cella
      const t2 = setTimeout(() => {
        setGlowingCells(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, revealTime);
      timeoutsRef.current.push(t2);
      
      // Poi rivela la lettera (dopo fade-out glow)
      const t3 = setTimeout(() => {
        setRevealedCells(prev => new Set([...prev, key]));
      }, revealTime + TIMING.GLOW_DURATION);
      timeoutsRef.current.push(t3);
    });
    
    // ✅ FASE 3: Callback finale
    const totalTime = revealStartTime + ((numCells - 1) * TIMING.REVEAL_DELAY) + TIMING.GLOW_DURATION + 100;
    const t = setTimeout(() => {
      onRevealDone && onRevealDone();
    }, totalTime);
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
                  
                  // ✅ Mostra lettera SOLO se rivelata O già visibile (NON durante glow)
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
