// src/components/LetterGrid.jsx - GRIGLIA LETTERE PER PRESENTATORE
import React from "react";
import "../styles/letter-grid.css";

const CONSONANTS = ["B", "C", "D", "F", "G", "H", "L", "M", "N", "P", "Q", "R", "S", "T", "V", "Z"];
const VOWELS = ["A", "E", "I", "O", "U"];

export default function LetterGrid({ 
  type,  // "consonant" | "vowel"
  usedLetters = [], 
  onLetterClick,
  disabled = false 
}) {
  const letters = type === "vowel" ? VOWELS : CONSONANTS;

  return (
    <div className="letter-grid-container">
      <h3 className="letter-grid-title">
        {type === "vowel" ? "🔤 VOCALI" : "🔠 CONSONANTI"}
      </h3>
      <div className={`letter-grid ${type === "vowel" ? "vowel-grid" : "consonant-grid"}`}>
        {letters.map(letter => {
          const isUsed = usedLetters.includes(letter);
          return (
            <button
              key={letter}
              className={`letter-btn ${isUsed ? "used" : ""}`}
              onClick={() => !isUsed && !disabled && onLetterClick(letter)}
              disabled={isUsed || disabled}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
