// src/pages/GameTimeChallenge.jsx
import React, { useEffect, useState, useRef } from "react";
import "../styles/game-layout.css";
import "../styles/controls.css";
import "../styles/tiles.css";
import "../styles/letter-grid.css";

import Wheel from "../components/Wheel";
import LetterGrid from "../components/LetterGrid";

import { buildGridWithCoordinates, maskGrid } from "../game/GameEngine";
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
    revealedLetters: [],
    usedLetters: [],
    mustSpin: true,
    spinning: false,
    lastSpinTarget: 0,
    awaitingConsonant: false
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [revealingLetters, setRevealingLetters] = useState([]);
  const [consInput, setConsInput] = useState("");
  const [vowInput, setVowInput] = useState("");
  const [solInput, setSolInput] = useState("");
  const [showConsPanel, setShowConsPanel] = useState(false);
  const [showVowPanel, setShowVowPanel] = useState(false);
  const [showSolPanel, setShowSolPanel] = useState(false);
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
        revealedLetters: [],
        usedLetters: [],
        mustSpin: true,
        spinning: false,
        lastSpinTarget: 0,
        awaitingConsonant: false
      }));
      setElapsedTime(0);
      setPenalties(0);
    }
  }, [phrase, category]);

  const grid = buildGridWithCoordinates(gameState.phrase);
  const maskedGrid = maskGrid(grid, gameState.revealedLetters);

  // Gira ruota LOCALMENTE
  const handleSpin = () => {
    if (!gameState.mustSpin || gameState.spinning) return;
    
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
        setShowConsPanel(true);
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

    setShowConsPanel(false);
    setConsInput("");

    const used = [...gameState.usedLetters];
    if (used.includes(upper)) {
      setPenalties(prev => prev + 5);
      setGameState(prev => ({
        ...prev,
        usedLetters: used,
        mustSpin: true,
        awaitingConsonant: false
      }));
      return;
    }

    used.push(upper);

    const phrase = normalizeText(gameState.phrase);
    const hits = [...phrase].filter(ch => normalizeText(ch) === upper && !/[AEIOU]/.test(ch)).length;

    if (hits > 0) {
      const revealed = [...gameState.revealedLetters, upper];
      setGameState(prev => ({
        ...prev,
        revealedLetters: revealed,
        usedLetters: used,
        mustSpin: true,
        awaitingConsonant: false
      }));
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

    setShowVowPanel(false);
    setVowInput("");

    const used = [...gameState.usedLetters];
    if (used.includes(upper)) {
      return;
    }

    used.push(upper);

    const phrase = normalizeText(gameState.phrase);
    const hits = [...phrase].filter(ch => normalizeText(ch) === upper && "AEIOU".includes(ch)).length;

    if (hits > 0) {
      const revealed = [...gameState.revealedLetters, upper];
      setGameState(prev => ({
        ...prev,
        revealedLetters: revealed,
        usedLetters: used
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        usedLetters: used
      }));
    }
  };

  // Tentativo soluzione LOCALMENTE
  const handleSolution = (text) => {
    const guess = normalizeText(text || "");
    const target = normalizeText(gameState.phrase || "");

    if (!guess) return;

    setShowSolPanel(false);
    setSolInput("");

    if (guess === target) {
      // FRASE CORRETTA
      if (timerRef.current) clearInterval(timerRef.current);

      // Rivela tutta la frase
      const allLetters = [...normalizeText(gameState.phrase)].filter(ch => /[A-Z]/.test(ch));
      setGameState(prev => ({
        ...prev,
        revealedLetters: allLetters
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
      <LetterGrid 
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
            onClick={() => setShowConsPanel(!showConsPanel)}
            disabled={!gameState.awaitingConsonant}
          >
            Consonante
          </button>

          <button
            className="btn-secondary btn-compact"
            onClick={() => setShowVowPanel(!showVowPanel)}
          >
            Vocali
          </button>

          <button
            className="btn-secondary btn-compact"
            onClick={() => setShowSolPanel(!showSolPanel)}
          >
            Soluzione
          </button>
        </div>

        {/* Pannelli input */}
        <div className="controls-panels">
          {showConsPanel && (
            <div className="panel panel-cons panel-game">
              <label className="panel-label">Consonante</label>
              <input
                type="text"
                maxLength={1}
                value={consInput}
                onChange={(e) => setConsInput(e.target.value.replace(/[^A-Za-z]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConsonant(consInput);
                }}
                className="panel-input panel-input-game"
                placeholder="Inserisci consonante"
                autoFocus
              />
              <button 
                className="btn-ok" 
                onClick={() => handleConsonant(consInput)}
              >
                OK
              </button>
            </div>
          )}

          {showVowPanel && (
            <div className="panel panel-vow panel-game">
              <label className="panel-label">Vocale</label>
              <input
                type="text"
                maxLength={1}
                value={vowInput}
                onChange={(e) => setVowInput(e.target.value.replace(/[^AEIOUaeiou]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVowel(vowInput);
                }}
                className="panel-input panel-input-game"
                placeholder="A, E, I, O, U"
                autoFocus
              />
              <button 
                className="btn-ok" 
                onClick={() => handleVowel(vowInput)}
              >
                OK
              </button>
            </div>
          )}

          {showSolPanel && (
            <div className="panel panel-sol panel-game">
              <label className="panel-label">Soluzione</label>
              <input
                type="text"
                value={solInput}
                onChange={(e) => setSolInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSolution(solInput);
                }}
                className="panel-input panel-input-game"
                placeholder="Scrivi la frase"
                autoFocus
              />
              <button 
                className="btn-ok" 
                onClick={() => handleSolution(solInput)}
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
