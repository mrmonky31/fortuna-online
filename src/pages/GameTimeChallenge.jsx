// src/pages/GameTimeChallenge.jsx
import React, { useState, useEffect, useRef } from "react";
import Board from "../components/Board";
import Wheel from "../components/Wheel";
import { buildGridWithCoordinates, maskGrid, findLetterCoordinates } from "../game/GameEngine";
import { normalizeText } from "../game/GameLogic";
import socket from "../socket";

export default function GameTimeChallenge({ 
  phrase, 
  category, 
  wheel, 
  phraseIndex, 
  totalPhrases,
  playerName 
}) {
  const [gameState, setGameState] = useState({
    phrase: phrase || "",
    category: category || "",
    revealedLetters: new Set(),
    usedLetters: new Set(),
    mustSpin: true,
    spinning: false,
    lastSpinTarget: 0,
    awaitingConsonant: false
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [revealingLetters, setRevealingLetters] = useState([]);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Aggiorna frase quando cambia
  useEffect(() => {
    if (phrase) {
      setGameState(prev => ({
        ...prev,
        phrase: phrase,
        category: category || "",
        revealedLetters: new Set(),
        usedLetters: new Set(),
        mustSpin: true,
        spinning: false,
        lastSpinTarget: 0,
        awaitingConsonant: false
      }));
    }
  }, [phrase, category]);

  const grid = buildGridWithCoordinates(gameState.phrase);
  const maskedGrid = maskGrid(grid, gameState.revealedLetters);

  // Gira ruota LOCALMENTE
  const handleSpin = () => {
    if (!gameState.mustSpin) return;
    
    setWheelSpinning(true);
    setGameState(prev => ({ ...prev, spinning: true }));

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * wheel.length);
      const outcome = wheel[randomIndex];

      setWheelSpinning(false);

      if (outcome.type === "points") {
        setGameState(prev => ({
          ...prev,
          spinning: false,
          lastSpinTarget: outcome.value,
          mustSpin: false,
          awaitingConsonant: true
        }));
      } else if (outcome.type === "pass") {
        setPenalties(prev => prev + 5);
        setGameState(prev => ({
          ...prev,
          spinning: false,
          mustSpin: true,
          awaitingConsonant: false
        }));
      } else if (outcome.type === "bankrupt") {
        setPenalties(prev => prev + 5);
        setGameState(prev => ({
          ...prev,
          spinning: false,
          mustSpin: true,
          awaitingConsonant: false
        }));
      }
    }, 3000);
  };

  // Gioca consonante LOCALMENTE
  const handleConsonant = (letter) => {
    if (!letter || !gameState.awaitingConsonant) return;

    const upper = normalizeText(letter).charAt(0);
    if (!upper || !/^[A-Z]$/.test(upper) || "AEIOU".includes(upper)) return;

    const used = new Set(gameState.usedLetters);
    if (used.has(upper)) {
      setPenalties(prev => prev + 5);
      setGameState(prev => ({
        ...prev,
        usedLetters: used,
        mustSpin: true,
        awaitingConsonant: false
      }));
      return;
    }

    used.add(upper);

    const phrase = normalizeText(gameState.phrase);
    const hits = [...phrase].filter(ch => normalizeText(ch) === upper && !/[AEIOU]/.test(ch)).length;

    if (hits > 0) {
      const coords = findLetterCoordinates(grid, upper);
      setRevealingLetters(coords);

      let delay = 0;
      coords.forEach((coord, idx) => {
        setTimeout(() => {
          setGameState(prev => {
            const newRevealed = new Set(prev.revealedLetters);
            newRevealed.add(upper);
            return {
              ...prev,
              revealedLetters: newRevealed
            };
          });
        }, delay);
        delay += 200;
      });

      setTimeout(() => {
        setRevealingLetters([]);
        setGameState(prev => ({
          ...prev,
          usedLetters: used,
          mustSpin: true,
          awaitingConsonant: false
        }));
      }, delay + 500);
    } else {
      setPenalties(prev => prev + 5);
      setGameState(prev => ({
        ...prev,
        usedLetters: used,
        mustSpin: true,
        awaitingConsonant: false
      }));
    }
  };

  // Compra vocale LOCALMENTE
  const handleVowel = (letter) => {
    if (!letter) return;

    const upper = normalizeText(letter).charAt(0);
    if (!upper || !/^[A-Z]$/.test(upper) || !"AEIOU".includes(upper)) return;

    const used = new Set(gameState.usedLetters);
    if (used.has(upper)) {
      return;
    }

    used.add(upper);

    const phrase = normalizeText(gameState.phrase);
    const hits = [...phrase].filter(ch => normalizeText(ch) === upper && "AEIOU".includes(ch)).length;

    if (hits > 0) {
      const coords = findLetterCoordinates(grid, upper);
      setRevealingLetters(coords);

      let delay = 0;
      coords.forEach((coord, idx) => {
        setTimeout(() => {
          setGameState(prev => {
            const newRevealed = new Set(prev.revealedLetters);
            newRevealed.add(upper);
            return {
              ...prev,
              revealedLetters: newRevealed
            };
          });
        }, delay);
        delay += 200;
      });

      setTimeout(() => {
        setRevealingLetters([]);
        setGameState(prev => ({
          ...prev,
          usedLetters: used,
          mustSpin: true,
          awaitingConsonant: false
        }));
      }, delay + 500);
    } else {
      setGameState(prev => ({
        ...prev,
        usedLetters: used,
        mustSpin: true,
        awaitingConsonant: false
      }));
    }
  };

  // Tentativo soluzione LOCALMENTE
  const handleSolution = (text) => {
    const guess = normalizeText(text || "");
    const target = normalizeText(gameState.phrase || "");

    if (!guess) return;

    if (guess === target) {
      // FRASE CORRETTA
      if (timerRef.current) clearInterval(timerRef.current);

      // Rivela tutta la frase
      const allLetters = [...normalizeText(gameState.phrase)].filter(ch => /[A-Z]/.test(ch));
      setGameState(prev => ({
        ...prev,
        revealedLetters: new Set(allLetters)
      }));

      // Invia completamento al server
      setTimeout(() => {
        socket.emit("timeChallengeComplete", {
          phraseIndex,
          time: elapsedTime,
          penalties
        });
      }, 1000);
    } else {
      // FRASE SBAGLIATA
      setPenalties(prev => prev + 5);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="game-page">
      {/* Header con info */}
      <div style={{
        textAlign: 'center',
        padding: '20px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '15px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '10px 0', color: '#00ff55' }}>
          SFIDA A TEMPO
        </h2>
        <div style={{ fontSize: '1.2rem', color: '#fff', marginTop: '10px' }}>
          Frase {phraseIndex + 1} / {totalPhrases}
        </div>
        <div style={{ fontSize: '1rem', color: '#ffcc00', marginTop: '5px' }}>
          Penalita: +{penalties}s
        </div>
      </div>

      {/* Categoria */}
      {gameState.category && (
        <div className="category-display">
          {gameState.category}
        </div>
      )}

      {/* Tabellone */}
      <Board 
        grid={maskedGrid} 
        revealingCoords={revealingLetters}
      />

      {/* Ruota */}
      <Wheel
        spinning={wheelSpinning}
        onSpinEnd={() => {}}
        pattern={wheel}
      />

      {/* Controlli */}
      <div className="controls-root">
        <div className="controls-buttons">
          <button
            className="btn-primary"
            onClick={handleSpin}
            disabled={!gameState.mustSpin || gameState.spinning}
          >
            Gira la ruota
          </button>

          <div className="target-box">
            <div className="target-title">Target:</div>
            <div className="target-value">{gameState.lastSpinTarget || "-"}</div>
          </div>
        </div>

        <div className="controls-row-secondary">
          <button
            className="btn-secondary btn-compact"
            onClick={() => {
              const letter = prompt("Inserisci consonante:");
              if (letter) handleConsonant(letter);
            }}
            disabled={!gameState.awaitingConsonant}
          >
            Consonante
          </button>

          <button
            className="btn-secondary btn-compact"
            onClick={() => {
              const letter = prompt("Inserisci vocale:");
              if (letter) handleVowel(letter);
            }}
          >
            Vocali
          </button>

          <button
            className="btn-secondary btn-compact"
            onClick={() => {
              const text = prompt("Inserisci soluzione:");
              if (text) handleSolution(text);
            }}
          >
            Soluzione
          </button>
        </div>
      </div>
    </div>
  );
}
