// src/components/PhraseManager.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/phrase-manager.css";

// ⏱️ ============================================
// ⚙️ PARAMETRI TIMING ANIMAZIONE - MODIFICA QUI
// ============================================
const TIMING = {
  GLOW_DELAY: 250,           // ⏱️ Delay tra accensione caselle (ms)
  PAUSE_ALL_GLOWING: 500,    // ⏱️ Pausa con tutte accese (ms)
  FADEOUT_DELAY: 250,        // ⏱️ Delay tra fade-out (ms)
  FADEOUT_DURATION: 250,     // ⏱️ Durata fade-out singola cella (ms)
};
// ============================================

export default function PhraseManager({
  grid = null,              // ✅ Ora riceve grid invece di rows
  revealQueue = [],         // ✅ Array di {x, y, char}
  onRevealDone = () => {},
  category = "-",
  onChangePhrase = () => {},
  flash = null,
  roundColor = null,
}) {
  const [glowingCells, setGlowingCells] = useState(new Set());
  const [fadingCells, setFadingCells] = useState(new Set());
  const [revealedCells, setRevealedCells] = useState(new Set());
  const timeoutsRef = useRef([]);
  
  // Reset quando cambia la queue
  useEffect(() => {
    // Clear tutti i timeout precedenti
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    if (!revealQueue || revealQueue.length === 0) {
      setGlowingCells(new Set());
      setFadingCells(new Set());
      setRevealedCells(new Set());
      return;
    }
    
    // Reset stato
    setGlowingCells(new Set());
    setFadingCells(new Set());
    setRevealedCells(new Set());
    
    const cellKeys = revealQueue.map(coord => `${coord.x}-${coord.y}`);
    
    // ✅ FASE 1: ACCENDI tutte le caselle una per volta
    cellKeys.forEach((key, index) => {
      const glowTimeout = setTimeout(() => {
        setGlowingCells(prev => new Set([...prev, key]));
      }, index * TIMING.GLOW_DELAY);
      timeoutsRef.current.push(glowTimeout);
    });
    
    const totalGlowTime = (cellKeys.length - 1) * TIMING.GLOW_DELAY;
    const fadeStartTime = totalGlowTime + TIMING.PAUSE_ALL_GLOWING;
    
    // ✅ FASE 2: FADE-OUT sequenziale (stesso ordine) rivela lettere
    cellKeys.forEach((key, index) => {
      const fadeTimeout = setTimeout(() => {
        // Rimuovi glow E aggiungi fading contemporaneamente
        setGlowingCells(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        
        setFadingCells(prev => new Set([...prev, key]));
        
        // Dopo fade-out mostra lettera
        const revealTimeout = setTimeout(() => {
          setFadingCells(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          setRevealedCells(prev => new Set([...prev, key]));
        }, TIMING.FADEOUT_DURATION);
        timeoutsRef.current.push(revealTimeout);
        
      }, fadeStartTime + (index * TIMING.FADEOUT_DELAY));
      timeoutsRef.current.push(fadeTimeout);
    });
    
    // ✅ CLEANUP FINALE
    const totalTime = fadeStartTime + 
                      (cellKeys.length * TIMING.FADEOUT_DELAY) + 
                      TIMING.FADEOUT_DURATION + 
                      200;
    
    const finalTimeout = setTimeout(() => {
      setGlowingCells(new Set()); // ✅ PULISCI TUTTO
      setFadingCells(new Set());  // ✅ PULISCI TUTTO
      onRevealDone && onRevealDone();
    }, totalTime);
    timeoutsRef.current.push(finalTimeout);
    
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      setGlowingCells(new Set());
      setFadingCells(new Set());
    };
    
  }, [revealQueue, onRevealDone]);
  
  // Renderizza griglia
  const renderGrid = () => {
    if (!grid || !Array.isArray(grid.cells) || grid.rows === 0) {
      return <div className="pm-empty">—</div>;
    }
    
    const rows = [];
    for (let y = 0; y < grid.rows; y++) {
      const rowCells = grid.cells.filter(cell => cell.y === y);
      rows.push(
        <div key={y} className="pm-row">
          {rowCells.map((cell) => {
            const cellKey = `${cell.x}-${cell.y}`;
            const isSpace = cell.type === "space";
            const isMasked = cell.masked === "_";
            const isGlowing = glowingCells.has(cellKey);
            const isFading = fadingCells.has(cellKey);
            const isRevealed = revealedCells.has(cellKey);
            const isVisible = !isMasked && !isSpace;
            
            return (
              <div
                key={cellKey}
                className={`pm-cell ${
                  isSpace ? "space" : ""
                } ${isGlowing ? "glowing" : ""} ${isFading ? "fading-out" : ""} ${(isVisible || isRevealed) && !isGlowing && !isFading ? "vis" : ""}`}
              >
                <span>
                  {isSpace 
                    ? "\u00A0" 
                    : (isRevealed || isVisible ? cell.masked : "\u00A0")
                  }
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return rows;
  };
  
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
          {renderGrid()}
        </div>
      </div>
    </div>
  );
}
