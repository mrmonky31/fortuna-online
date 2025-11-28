// src/components/LetterGrid.jsx - GRIGLIA QWERTY COMPLETA
import React from "react";
import "../styles/letter-grid.css";

// ✅ Layout QWERTY classico: 3 righe da 7 + 1 riga da 4 + X
const KEYBOARD_LAYOUT = [
  ["Q", "W", "E", "R", "T", "Y", "U"],
  ["I", "O", "P", "A", "S", "D", "F"],
  ["G", "H", "J", "K", "L", "Z", "X"],
  ["C", "V", "B", "N", "M"]  // + X rossa
];

export default function LetterGrid({ 
  usedLetters = [], 
  onLetterClick,
  onPassTurn,
  disabled = false 
}) {
  return (
    <div className="letter-grid-container">
      <h3 className="letter-grid-title">
        🔤 LETTERE
      </h3>
      <div className="letter-grid-qwerty">
        {/* Righe 1-3: 7 lettere ciascuna */}
        {KEYBOARD_LAYOUT.slice(0, 3).map((row, rowIndex) => (
          <div key={rowIndex} className="letter-row">
            {row.map(letter => {
              const isUsed = usedLetters.includes(letter);
              return (
                <button
                  key={letter}
                  className={`letter-btn ${isUsed ? "used" : ""}`}
                  onClick={() => !isUsed && !disabled && onLetterClick && onLetterClick(letter)}
                  disabled={disabled}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
        
        {/* Riga 4: 4 lettere + X rossa */}
        <div className="letter-row letter-row-last">
          {KEYBOARD_LAYOUT[3].map(letter => {
            const isUsed = usedLetters.includes(letter);
            return (
              <button
                key={letter}
                className={`letter-btn ${isUsed ? "used" : ""}`}
                onClick={() => !isUsed && !disabled && onLetterClick && onLetterClick(letter)}
                disabled={disabled}
              >
                {letter}
              </button>
            );
          })}
          
          {/* ✅ X ROSSA per passare turno */}
          <button
            className="letter-btn letter-btn-pass"
            onClick={() => !disabled && onPassTurn && onPassTurn()}
            disabled={disabled}
            title="Passa turno al prossimo giocatore"
          >
            ✖
          </button>
        </div>
      </div>
    </div>
  );
}
