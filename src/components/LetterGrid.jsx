// src/components/LetterGrid.jsx - GRIGLIA QWERTY 3 RIGHE
import React from "react";
import "../styles/letter-grid.css";

// ✅ Layout QWERTY standard: 3 righe
const KEYBOARD_LAYOUT = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"]
];

export default function LetterGrid({ 
  usedLetters = [], 
  onLetterClick,
  onPassTurn,
  disabled = false,
  activeLetterType = null // "consonant" | "vowel" | null
}) {
  const VOWELS = ["A", "E", "I", "O", "U"];
  
  return (
    <div className="letter-grid-container">
      <h3 className="letter-grid-title">
        🔤 LETTERE
      </h3>
      <div className="letter-grid-qwerty">
        {/* Righe 1-2: 10 e 9 lettere */}
        {KEYBOARD_LAYOUT.slice(0, 2).map((row, rowIndex) => (
          <div key={rowIndex} className="letter-row">
            {row.map(letter => {
              const isUsed = usedLetters.includes(letter);
              const isVowel = VOWELS.includes(letter);
              
              // ✅ Disabilita vocali se activeLetterType === "consonant"
              // ✅ Disabilita consonanti se activeLetterType === "vowel"
              const isWrongType = 
                (activeLetterType === "consonant" && isVowel) ||
                (activeLetterType === "vowel" && !isVowel);
              
              return (
                <button
                  key={letter}
                  className={`letter-btn ${isUsed ? "used" : ""} ${isWrongType ? "disabled" : ""}`}
                  onClick={() => !isUsed && !disabled && !isWrongType && onLetterClick && onLetterClick(letter)}
                  disabled={disabled || isWrongType}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
        
        {/* Riga 3: 7 lettere + X rossa */}
        <div className="letter-row letter-row-last">
          {KEYBOARD_LAYOUT[2].map(letter => {
            const isUsed = usedLetters.includes(letter);
            const isVowel = VOWELS.includes(letter);
            const isWrongType = 
              (activeLetterType === "consonant" && isVowel) ||
              (activeLetterType === "vowel" && !isVowel);
            
            return (
              <button
                key={letter}
                className={`letter-btn ${isUsed ? "used" : ""} ${isWrongType ? "disabled" : ""}`}
                onClick={() => !isUsed && !disabled && !isWrongType && onLetterClick && onLetterClick(letter)}
                disabled={disabled || isWrongType}
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
