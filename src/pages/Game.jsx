// VERSIONE SENZA TIMER - MOD by MARCO
// src/pages/Game.jsx
import React, { useEffect, useState } from "react";
import "../styles/game-layout.css";
import "../styles/controls.css";
import "../styles/tiles.css";

import Controls from "../components/Controls";
import PhraseManager from "../components/PhraseManager";
import Wheel from "../components/Wheel";
import FinalScoreboard from "../components/FinalScoreboard";

import { testPhrases } from "../game/phrases";
import { buildBoard, maskBoard } from "../game/GameEngine";
import {
  createInitialGameState,
  startRound,
  applyWheelSpin,
  applyWheelOutcome,
  playConsonant,
  buyVowel,
  trySolve,
  changePhrase,
  applyCountdownTick
} from "../game/GameLogic";
import socket from "../socket";

// Utility: seleziona una frase valida
function pickValidRandomPhrase(list) {
  const valid = list.filter((p) => (p.text || "").length <= 56);
  if (!valid.length) throw new Error("Nessuna frase valida disponibile");
  const i = Math.floor(Math.random() * valid.length);
  return valid[i];
}

export default function Game({ players = [], totalRounds = 3 }) {
  const [gameState, setGameState] = useState(null);
  const [turnTimer, setTurnTimer] = useState(60);
  const [timerPaused, setTimerPaused] = useState(false);

  const [revealQueue, setRevealQueue] = useState([]);
  const [maskedRows, setMaskedRows] = useState([]);

  // Ricalcolo tabellone mascherato dopo ogni lettera
  useEffect(() => {
    if (!gameState) return;
    const rows = Array.isArray(gameState.rows) ? gameState.rows : [];

    let revealed = gameState.revealedLetters;
    if (revealed && revealed instanceof Set) revealed = Array.from(revealed);

    try {
      const m = maskBoard(rows, revealed);
      setMaskedRows(Array.isArray(m) && m.length ? m : rows);
    } catch {
      setMaskedRows(rows);
    }
  }, [gameState?.rows, gameState?.revealedLetters]);

  const handleRevealDone = () => setRevealQueue([]);

  // 🔌 Ascolta lo stato di gioco dal server (azioni: spin, consonante, vocale, soluzione)
  useEffect(() => {
    function handleGameState({ state }) {
      console.log("📡 Nuovo gameState dal server:", state);

      if (!state || !state.lastAction) return;

      setGameState((prev) => {
        if (!prev) return prev;
        switch (state.lastAction) {
          case "spin":
            return applyWheelOutcome(prev, state.result);
          case "consonant":
            return playConsonant(prev, state.letter);
          case "vowel":
            return buyVowel(prev, state.letter);
          case "solve":
            return trySolve(prev, state.text);
          default:
            return prev;
        }
      });
    }

    socket.on("gameState", handleGameState);

    return () => {
      socket.off("gameState", handleGameState);
    };
  }, []);

  // 🔹 Riceve "gameStart" dal server e inizializza tutti con la stessa frase
  useEffect(() => {
    function handleGameStart({ phrase, category, roomCode }) {
      if (!phrase) {
        console.warn("gameStart ricevuto senza phrase");
        return;
      }

      console.log("🚀 Avvio partita sincronizzato:", phrase, category, roomCode);

      setGameState((prev) => {
        const basePlayers =
          prev?.players && prev.players.length
            ? prev.players
            : players.length
            ? players
            : [{ name: "GIOCATORE 1" }];

        const baseTotalRounds = prev?.totalRounds || totalRounds || 3;

        const base = createInitialGameState(basePlayers, baseTotalRounds, {
          vowelCost: 500,
          debug: false,
          getNextRoundData: () => ({
            phrase,
            rows: buildBoard(phrase, 14, 4),
            category,
          }),
        });

        const rows = buildBoard(phrase, 14, 4);
        const started = startRound(base, phrase, rows, category);
        if (roomCode) {
          started.roomCode = roomCode;
        } else if (prev?.roomCode) {
          started.roomCode = prev.roomCode;
        }
        return started;
      });
    }

    socket.on("gameStart", handleGameStart);
    return () => {
      socket.off("gameStart", handleGameStart);
    };
  }, [players, totalRounds]);

  // Inizializzazione partita locale (solo se il server non manda nulla)
  useEffect(() => {
    if (gameState) return;

    // Modalità locale: se non stiamo usando roomCode/sync server, usa una frase random
    // Utile per giocare in singolo, ma in online viene sovrascritta da gameStart
    const phraseObj = pickValidRandomPhrase(testPhrases);
    const base = createInitialGameState(
      players.length ? players : [{ name: "GIOCATORE 1" }],
      totalRounds,
      {
        vowelCost: 500,
        debug: false,
        getNextRoundData: () => ({
          phrase: phraseObj.text,
          rows: buildBoard(phraseObj.text, 14, 4),
          category: phraseObj.category,
        }),
      }
    );
    const rows = buildBoard(phraseObj.text, 14, 4);
    const started = startRound(
      base,
      phraseObj.text,
      rows,
      phraseObj.category
    );
    setGameState(started);
  }, [gameState, players, totalRounds]);

  // Tick logico (solo per countdown round)
  useEffect(() => {
    const id = setInterval(() => {
      setGameState((prev) => applyCountdownTick(prev));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Timer turno: 60s, mostra solo ultimi 10
  useEffect(() => {
    if (!gameState) return;
    if (timerPaused) return;

    const id = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          try {
            setGameState((s) => {
              if (!s) return s;
              return { ...s, forcePassTurn: true };
            });
          } catch (e) {
            console.error(e);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [gameState, timerPaused]);

  // === HANDLERS ===

  const handleSpin = () => {
    setGameState((s) => applyWheelSpin(s, 500));
  };

  const handleWheelStop = (outcome) => {
    if (socket && gameState?.roomCode) {
      socket.emit(
        "action",
        {
          roomCode: gameState.roomCode,
          type: "spin",
          payload: { result: outcome },
        },
        (res) => {
          if (!res?.ok) console.error("Errore azione spin:", res?.error);
          else console.log("Spin registrato dal server ✅", res);
        }
      );
    }
    setGameState((s) => applyWheelOutcome(s, outcome));
  };

  const handleConsonant = (letter) => {
    if (socket && gameState?.roomCode) {
      socket.emit("action", {
        roomCode: gameState.roomCode,
        type: "consonant",
        payload: { letter },
      });
    }
    setGameState((s) => playConsonant(s, letter));
  };

  const handleVowel = (letter) => {
    if (socket && gameState?.roomCode) {
      socket.emit("action", {
        roomCode: gameState.roomCode,
        type: "vowel",
        payload: { letter },
      });
    }
    setGameState((s) => buyVowel(s, letter));
  };

  const handleSolution = (text) => {
    if (socket && gameState?.roomCode) {
      socket.emit("action", {
        roomCode: gameState.roomCode,
        type: "solve",
        payload: { text },
      });
    }
    setGameState((s) => trySolve(s, text));
  };

  const handleChangePhrase = () => {
    setGameState((s) => {
      const phrase = pickValidRandomPhrase(testPhrases);
      const rows = buildBoard(phrase.text, 14, 4);
      return changePhrase(s, phrase.text, rows, phrase.category);
    });
  };

  if (!gameState) {
    return (
      <div className="game-loading">
        <p>Caricamento partita...</p>
      </div>
    );
  }

  if (gameState.gameOver) {
    return (
      <div className="game-wrapper">
        <FinalScoreboard players={gameState.players} />
      </div>
    );
  }

  const flashType =
    gameState.countdown?.active
      ? "success"
      : gameState.gameMessage?.type === "error" &&
        gameState.gameMessage?.text === "Soluzione non corretta."
      ? "error"
      : null;

  const showCenterOverlay = gameState.countdown?.active === true;

  return (
    <div className="game-wrapper">
      <div className="game-players">
        <h3>Giocatori</h3>
        {gameState.players.map((p, i) => (
          <div
            key={i}
            className={`player-card ${
              i === gameState.currentPlayerIndex ? "player-active" : ""
            }`}
          >
            <div className="player-name">{p.name}</div>
            <div className="player-round-score">{p.roundScore} pt</div>
          </div>
        ))}
      </div>

      <div>
        <div className="game-round-info">
          ROUND {gameState.currentRound} / {gameState.totalRounds}
        </div>

        <div className="game-wheel-area">
          <Wheel
            slices={gameState.wheel}
            spinning={gameState.spinning}
            onStop={handleWheelStop}
          />
        </div>

        <div className="controls-area">
          <Controls
            onSpin={handleSpin}
            onConsonant={handleConsonant}
            onVowel={handleVowel}
            onSolution={handleSolution}
            lastTarget={gameState.lastSpinTarget}
            forceConsonant={gameState.awaitingConsonant === true}
          />
        </div>

        <div className="game-board-area">
          <PhraseManager
            rows={gameState.rows}
            maskedRows={maskedRows}
            revealQueue={revealQueue}
            onRevealDone={handleRevealDone}
            category={gameState.category || "-"}
            onChangePhrase={handleChangePhrase}
            flash={flashType}
          />
        </div>
      </div>

      <div>
        <div className="game-alerts">
          {gameState.gameMessage ? (
            <div className={`alert ${gameState.gameMessage.type}`}>
              {gameState.gameMessage.text}
            </div>
          ) : (
            <div className="alert-placeholder">—</div>
          )}
        </div>

        <div className="scoreboard">
          <h4>Classifica</h4>
          {gameState.players.map((p, i) => (
            <div key={i} className="score-row">
              <span className="score-name">{p.name}</span>
              <span className="score-val">{p.totalScore}</span>
            </div>
          ))}
        </div>
      </div>

      {turnTimer <= 10 && turnTimer > 0 && (
        <div className="turn-timer">{turnTimer}</div>
      )}

      {showCenterOverlay && (
        <div className="center-overlay">
          <div className="center-box">
            {gameState.gameMessage?.text || "Prossimo round..."}
          </div>
        </div>
      )}
    </div>
  );
}
