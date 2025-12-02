// src/components/PhraseManager.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/phrase-manager.css";

// ⏱️ ============================================
// ⚙️ PARAMETRI TIMING ANIMAZIONE - MODIFICA QUI
// ============================================
const TIMING = {
  GLOW_DELAY: 250,           // ⏱️ Delay tra illuminazione caselle (ms)
  GLOW_DURATION: 800,        // ⏱️ Durata illuminazione su singola cella (ms)
  GLOW_FADEOUT: 250,         // ⏱️ Durata fade-out dal basso verso alto (ms)
  LETTER_DELAY: 300,         // ⏱️ Gap prima che appaiano le lettere (ms)
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
  const [revealedCells, setRevealedCells] = useState(new Set());
  const timeoutsRef = useRef([]);
  
  // Reset quando cambia la queue
  useEffect(() => {
    // Clear tutti i timeout precedenti
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    if (!revealQueue || revealQueue.length === 0) {
      setGlowingCells(new Set());
      setRevealedCells(new Set());
      return;
    }
    
    // ✅ ANIMAZIONE SEQUENZIALE CON COORDINATE
    console.log(`🎬 Inizio animazione ${revealQueue.length} celle`);
    
    // Reset stato
    setGlowingCells(new Set());
    setRevealedCells(new Set());
    
    revealQueue.forEach((coord, index) => {
      const cellKey = `${coord.x}-${coord.y}`;
      
      // ✅ FASE 1: GLOW - Illumina cella
      const glowTimeout = setTimeout(() => {
        console.log(`💡 Glow ON: (${coord.x},${coord.y})`);
        setGlowingCells(prev => new Set([...prev, cellKey]));
      }, index * TIMING.GLOW_DELAY);
      timeoutsRef.current.push(glowTimeout);
      
      // ✅ FASE 2: FADE OUT - Spegni glow
      const fadeOutTimeout = setTimeout(() => {
        console.log(`🌑 Glow OFF: (${coord.x},${coord.y})`);
        setGlowingCells(prev => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
      }, index * TIMING.GLOW_DELAY + TIMING.GLOW_DURATION);
      timeoutsRef.current.push(fadeOutTimeout);
      
      // ✅ FASE 3: REVEAL - Mostra lettera
      const revealTimeout = setTimeout(() => {
        console.log(`✅ Lettera rivelata: (${coord.x},${coord.y}) = ${coord.char}`);
        setRevealedCells(prev => new Set([...prev, cellKey]));
      }, index * TIMING.GLOW_DELAY + TIMING.GLOW_DURATION + TIMING.LETTER_DELAY);
      timeoutsRef.current.push(revealTimeout);
    });
    
    // ✅ CLEANUP FINALE
    const totalTime = 
      (revealQueue.length - 1) * TIMING.GLOW_DELAY + 
      TIMING.GLOW_DURATION + 
      TIMING.GLOW_FADEOUT + 
      TIMING.LETTER_DELAY + 
      200; // buffer
    
    const finalTimeout = setTimeout(() => {
      console.log(`✅ Animazione completata`);
      onRevealDone && onRevealDone();
    }, totalTime);
    timeoutsRef.current.push(finalTimeout);
    
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
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
            const isRevealed = revealedCells.has(cellKey);
            const isVisible = !isMasked && !isSpace;
            
            return (
              <div
                key={cellKey}
                className={`pm-cell ${
                  isSpace ? "space" : (isVisible || isRevealed) ? "vis" : ""
                } ${isGlowing ? "glowing" : ""}`}
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
