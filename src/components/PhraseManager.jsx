// src/components/PhraseManager.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/phrase-manager.css";

// ⏱️ ============================================
// ⚙️ PARAMETRI TIMING ANIMAZIONE - MODIFICA QUI
// ============================================
const TIMING = {
  GLOW_DELAY: 250,           // ⏱️ Delay tra accensione caselle (ms)
  PAUSE_ALL_GLOWING: 800,    // ⏱️ Pausa con tutte accese (ms)
  FADEOUT_DURATION: 500,     // ⏱️ Durata fade-out (ms)
};
// ============================================

export default function PhraseManager({
  grid = null,
  revealQueue = [],
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
  const animatingRef = useRef(false);
  const lastQueueRef = useRef(null);
  
  useEffect(() => {
    const queueId = JSON.stringify(revealQueue);
    
    // ✅ Se è la stessa queue già processata, IGNORA
    if (queueId === lastQueueRef.current) {
      return;
    }
    
    // ✅ Se sta già animando, IGNORA
    if (animatingRef.current) {
      return;
    }
    
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    // ✅ Se queue è vuota MA ci sono celle rivelate, NON resettare
    if (!revealQueue || revealQueue.length === 0) {
      if (revealedCells.size === 0) {
        // Solo se anche revealedCells è vuoto, allora resetta
        setGlowingCells(new Set());
        setFadingCells(new Set());
      }
      animatingRef.current = false;
      lastQueueRef.current = null;
      return;
    }
    
    animatingRef.current = true;
    lastQueueRef.current = queueId;
    
    setGlowingCells(new Set());
    setFadingCells(new Set());
    setRevealedCells(new Set());
    
    const cellKeys = revealQueue.map(coord => `${coord.x}-${coord.y}`);
    
    // FASE 1: Accendi una per volta
    cellKeys.forEach((key, index) => {
      const t = setTimeout(() => {
        setGlowingCells(prev => new Set([...prev, key]));
      }, index * TIMING.GLOW_DELAY);
      timeoutsRef.current.push(t);
    });
    
    const totalGlowTime = (cellKeys.length - 1) * TIMING.GLOW_DELAY;
    const fadeStartTime = totalGlowTime + TIMING.PAUSE_ALL_GLOWING;
    
    // FASE 2: TUTTE fade-out contemporaneamente
    const fadeTimeout = setTimeout(() => {
      setGlowingCells(new Set());
      setFadingCells(new Set(cellKeys));
      
      // ✅ Lettere appaiono 700ms DOPO l'inizio del fade-out
      const revealTimeout = setTimeout(() => {
        setFadingCells(new Set()); // Rimuovi classe fading
        setRevealedCells(new Set(cellKeys)); // Mostra lettere
      }, TIMING.FADEOUT_DURATION + 700); // ✅ +700ms DOPO fade-out
      timeoutsRef.current.push(revealTimeout);
      
    }, fadeStartTime);
    timeoutsRef.current.push(fadeTimeout);
    
    const totalTime = fadeStartTime + TIMING.FADEOUT_DURATION + 700 + 200; // ✅ +700ms
    
    const finalTimeout = setTimeout(() => {
      setGlowingCells(new Set());
      setFadingCells(new Set());
      animatingRef.current = false;
      if (onRevealDone) {
        onRevealDone();
      }
    }, totalTime);
    timeoutsRef.current.push(finalTimeout);
    
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      setGlowingCells(new Set());
      setFadingCells(new Set());
      animatingRef.current = false;
    };
    
  }, [revealQueue]);
  
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
            const isGlowing = glowingCells.has(cellKey);
            const isFading = fadingCells.has(cellKey);
            const isRevealed = revealedCells.has(cellKey);
            
            // ✅ Mostra lettera se è stata rivelata dall'animazione O se è già nel masked
            const shouldShowLetter = isRevealed || (cell.masked !== "_" && !isSpace);
            
            return (
              <div
                key={cellKey}
                className={`pm-cell ${
                  isSpace ? "space" : ""
                } ${
                  isGlowing && !isFading ? "glowing" : ""
                } ${
                  isFading ? "fading-out" : ""
                } ${
                  shouldShowLetter && !isGlowing && !isFading ? "vis" : ""
                }`}
              >
                <span>
                  {isSpace 
                    ? "\u00A0" 
                    : (shouldShowLetter ? cell.masked : "\u00A0")
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
