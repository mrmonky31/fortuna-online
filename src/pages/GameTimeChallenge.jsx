// src/pages/GameTimeChallenge.jsx
import React, { useEffect, useState, useRef } from "react";
import "../styles/game-layout.css";
import "../styles/controls.css";
import "../styles/tiles.css";

import PhraseManager from "../components/PhraseManager";
import Wheel from "../components/Wheel";
import Controls from "../components/Controls";

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
    revealedLetters: [],
    usedLetters: [],
    mustSpin: true,
    spinning: false,
    lastSpinTarget: 0,
    awaitingConsonant: false,
    wheel: wheel || []
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelSpinSeed, setWheelSpinSeed] = useState(Math.random());
  const [revealQueue, setRevealQueue] = useState([]);
  const [grid, setGrid] = useState(null);
  const [maskedGrid, setMaskedGrid] = useState(null);
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
        awaitingConsonant: false,
        wheel: wheel || prev.wheel
      }));
      setElapsedTime(0);
      setPenalties(0);
      setRevealQueue([]);
    }
  }, [phrase, category, wheel]);

  // Costruisci grid
  useEffect(() => {
    if (!gameState.phrase) {
      setGrid(null);
      setMaskedGrid(null);
      return;
    }

    try {
      const newGrid = buildGridWithCoordinates(gameState.phrase, 16, 5);
      setGrid(newGrid);
      
      const masked = maskGrid(newGrid, gameState.revealedLetters);
      setMaskedGrid(masked);
    } catch (error) {
      console.error("Errore costruzione grid:", error);
      setGrid(null);
      setMaskedGrid(null);
    }
  }, [gameState.phrase, gameState.revealedLetters]);

  // Gira ruota LOCALMENTE
  const handleSpin = () => {
    if (!gameState.mustSpin || gameState.spinning) return;
    
    setWheelSpinning(true);
    setWheelSpinSeed(Math.random());
    setGameState(prev => ({ ...prev, spinning: true }));
  };

  const handleWheelStop = (outcome) => {
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
  };

  // Gioca consonante LOCALMENTE
  const handleConsonant = (letter) => {
    if (!letter || !gameState.awaitingConsonant) return;

    const upper = normalizeText(letter).charAt(0);
    if (!upper || !/^[A-Z]$/.test(upper) || "AEIOU".includes(upper)) return;

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
      const coords = findLetterCoordinates(grid, upper);
      setRevealQueue(coords);

      setTimeout(() => {
        const revealed = [...gameState.revealedLetters, upper];
        setGameState(prev => ({
          ...prev,
          revealedLetters: revealed,
          usedLetters: used,
          mustSpin: true,
          awaitingConsonant: false
        }));
        setRevealQueue([]);
      }, coords.length * 250 + 1200);
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

    const used = [...gameState.usedLetters];
    if (used.includes(upper)) {
      return;
    }

    used.push(upper);

    const phrase = normalizeText(gameState.phrase);
    const hits = [...phrase].filter(ch => normalizeText(ch) === upper && "AEIOU".includes(ch)).length;

    if (hits > 0) {
      const coords = findLetterCoordinates(grid, upper);
      setRevealQueue(coords);

      setTimeout(() => {
        const revealed = [...gameState.revealedLetters, upper];
        setGameState(prev => ({
          ...prev,
          revealedLetters: revealed,
          usedLetters: used
        }));
        setRevealQueue([]);
      }, coords.length * 250 + 1200);
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

      {/* Tabellone */}
      <div className="game-board-area">
        <PhraseManager
          grid={maskedGrid}
          revealQueue={revealQueue}
          onRevealDone={() => setRevealQueue([])}
          category={gameState.category || "-"}
          phrase={gameState.phrase || ""}
          isSinglePlayer={false}
        />
      </div>

      {/* Ruota */}
      <div className="game-wheel-area">
        <Wheel
          slices={gameState.wheel}
          spinning={wheelSpinning}
          spinSeed={wheelSpinSeed}
          onStop={handleWheelStop}
        />
      </div>

      {/* Controlli */}
      <div className="controls-area">
        <Controls
          onSpin={handleSpin}
          onConsonant={handleConsonant}
          onVowel={handleVowel}
          onSolution={handleSolution}
          onPassTurn={() => {}}
          lastTarget={gameState.lastSpinTarget}
          forceConsonant={gameState.awaitingConsonant === true}
          disabled={false}
        />
      </div>
    </div>
  );
}
