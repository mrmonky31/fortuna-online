// src/pages/Game.jsx - VERSIONE COMPLETA CON TUTTE LE MIGLIORIE
import React, { useEffect, useState } from "react";
import "../styles/game-layout.css";
import "../styles/controls.css";
import "../styles/tiles.css";

import Controls from "../components/Controls";
import PhraseManager from "../components/PhraseManager";
import Wheel from "../components/Wheel";
import FinalScoreboard from "../components/FinalScoreboard";

import { maskBoard } from "../game/GameEngine";
import socket from "../socket";

export default function Game({ players = [], totalRounds = 3, state, onExitToLobby }) {
  const [gameState, setGameState] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);

  const [maskedRows, setMaskedRows] = useState([]);
  const [revealQueue, setRevealQueue] = useState([]);

  const [turnTimer, setTurnTimer] = useState(60);
  const [timerPaused, setTimerPaused] = useState(false);

  // ✅ NUOVO: Stato per schermata tra round
  const [betweenRounds, setBetweenRounds] = useState(false);
  const [roundCountdown, setRoundCountdown] = useState(0);
  const [winnerName, setWinnerName] = useState("");

  // ✅ NUOVO: Salva dati in localStorage per riconnessione
  useEffect(() => {
    if (roomCode && mySocketId) {
      localStorage.setItem("gameSession", JSON.stringify({
        roomCode,
        socketId: mySocketId,
        timestamp: Date.now()
      }));
    }
  }, [roomCode, mySocketId]);

  // ✅ NUOVO: Riconnessione automatica al caricamento
  useEffect(() => {
    const savedSession = localStorage.getItem("gameSession");
    if (savedSession) {
      try {
        const { roomCode: savedRoom, timestamp } = JSON.parse(savedSession);
        // Se la sessione è vecchia di più di 10 minuti, ignorala
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          console.log("🔄 Tentativo riconnessione a:", savedRoom);
          // Il socket.id sarà diverso, ma il server può gestire la riconnessione
          setRoomCode(savedRoom);
        } else {
          localStorage.removeItem("gameSession");
        }
      } catch (e) {
        console.error("Errore parsing sessione:", e);
      }
    }
  }, []);

  // Salva socket ID
  useEffect(() => {
    setMySocketId(socket.id);
  }, []);

  // Salva roomCode
  useEffect(() => {
    if (state?.roomCode) {
      setRoomCode(state.roomCode);
    }
  }, [state]);

  // 🎮 ASCOLTA AVVIO PARTITA DAL SERVER
  useEffect(() => {
    function handleGameStart({ gameState: serverState }) {
      console.log("🚀 Partita avviata dal server:", serverState);
      setGameState(serverState);
      setTurnTimer(60);
      setBetweenRounds(false);
    }

    socket.on("gameStart", handleGameStart);

    return () => {
      socket.off("gameStart", handleGameStart);
    };
  }, []);

  // 🔄 ASCOLTA AGGIORNAMENTI STATO DAL SERVER
  useEffect(() => {
    function handleGameStateUpdate({ gameState: serverState }) {
      console.log("🔄 Aggiornamento stato dal server:", serverState);
      setGameState(serverState);
      setTurnTimer(60);
    }

    socket.on("gameStateUpdate", handleGameStateUpdate);

    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, []);

  // ✅ NUOVO: Ascolta evento "roundWon" dal server
  useEffect(() => {
    function handleRoundWon({ winnerName, countdown }) {
      console.log("🎉 Round vinto da:", winnerName);
      setWinnerName(winnerName);
      setBetweenRounds(true);
      setRoundCountdown(countdown);
    }

    socket.on("roundWon", handleRoundWon);

    return () => {
      socket.off("roundWon", handleRoundWon);
    };
  }, []);

  // ✅ NUOVO: Countdown tra i round
  useEffect(() => {
    if (!betweenRounds || roundCountdown <= 0) return;

    const id = setInterval(() => {
      setRoundCountdown((prev) => {
        if (prev <= 1) {
          setBetweenRounds(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [betweenRounds, roundCountdown]);

  // Ricalcolo tabellone mascherato
  useEffect(() => {
    if (!gameState) return;
    const rows = Array.isArray(gameState.rows) ? gameState.rows : [];
    const revealed = gameState.revealedLetters || [];

    try {
      const m = maskBoard(rows, revealed);
      setMaskedRows(Array.isArray(m) && m.length ? m : rows);
    } catch {
      setMaskedRows(rows);
    }
  }, [gameState?.rows, gameState?.revealedLetters]);

  // Timer turno
  useEffect(() => {
    if (!gameState) return;
    if (timerPaused) return;

    const isMyTurn = gameState.currentPlayerId === mySocketId;
    if (!isMyTurn) return;

    const id = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          handlePassTurn();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [gameState, timerPaused, mySocketId]);

  const handleRevealDone = () => setRevealQueue([]);

  const handlePanelChange = (panelName) => {
    setTimerPaused(panelName !== null);
  };

  // ✅ NUOVO: Handler per uscire dalla stanza
  const handleExitRoom = () => {
    const confirmed = window.confirm(
      "Sei sicuro di voler abbandonare la partita?\nNon potrai più rientrare in questa partita."
    );
    
    if (confirmed) {
      // Pulisci localStorage
      localStorage.removeItem("gameSession");
      
      // Disconnetti dal server
      if (roomCode) {
        socket.emit("leaveRoom", { roomCode });
      }
      
      // Torna alla lobby
      if (onExitToLobby) {
        onExitToLobby();
      } else {
        window.location.reload();
      }
    }
  };

  // === HANDLERS ===

  const handleSpin = () => {
    if (!roomCode) return;
    console.log("🎡 Richiesta spin al server…");

    socket.emit("spinWheel", { roomCode }, (res) => {
      if (!res?.ok) {
        console.error("❌ Errore spin:", res?.error);
        alert(res?.error || "Errore spin");
      }
    });
  };

  const handleWheelStop = (outcome) => {
    console.log("🎡 Ruota fermata (solo visivo):", outcome);
  };

  const handleConsonant = (letter) => {
    if (!roomCode) return;
    console.log("🔤 Invio consonante al server:", letter);

    socket.emit("playConsonant", { roomCode, letter }, (res) => {
      if (!res?.ok) {
        console.error("❌ Errore consonante:", res?.error);
        alert(res?.error || "Errore consonante");
      }
    });
  };

  const handleVowel = (letter) => {
    if (!roomCode) return;
    console.log("🔵 Invio vocale al server:", letter);

    socket.emit("playVowel", { roomCode, letter }, (res) => {
      if (!res?.ok) {
        console.error("❌ Errore vocale:", res?.error);
        alert(res?.error || "Errore vocale");
      }
    });
  };

  const handleSolution = (text) => {
    if (!roomCode) return;
    console.log("✅ Invio soluzione al server:", text);

    socket.emit("trySolution", { roomCode, text }, (res) => {
      if (!res?.ok) {
        console.error("❌ Errore soluzione:", res?.error);
        alert(res?.error || "Errore soluzione");
      }
    });
  };

  const handlePassTurn = () => {
    if (!roomCode) return;
    console.log("⏩ Invio passa turno al server");

    socket.emit("passTurn", { roomCode }, (res) => {
      if (!res?.ok) {
        console.error("❌ Errore passa turno:", res?.error);
        alert(res?.error || "Errore passa turno");
      }
    });
  };

  const handleChangePhrase = () => {
    console.log("🔄 Cambio frase non implementato in modalità online");
  };

  if (!gameState) {
    return (
      <div className="game-loading">
        <p>⏳ In attesa di avvio partita…</p>
      </div>
    );
  }

  if (gameState.gameOver) {
    return (
      <div className="game-wrapper">
        <FinalScoreboard players={gameState.players} onBackToLobby={handleExitRoom} />
      </div>
    );
  }

  const isMyTurn = gameState.currentPlayerId === mySocketId;

  const flashType = betweenRounds ? "success" : 
    gameState.gameMessage?.type === "error" &&
    gameState.gameMessage?.text === "Soluzione non corretta."
      ? "error"
      : null;

  return (
    <div className="game-wrapper">
      {/* ✅ NUOVO: Pulsante Esci in alto a destra */}
      <button className="btn-exit-room" onClick={handleExitRoom} title="Esci dalla stanza">
        ❌ Esci
      </button>

      <div className="game-players">
        <h3>Giocatori</h3>
        {gameState.players.map((p, i) => (
          <div
            key={i}
            className={`player-card ${
              i === gameState.currentPlayerIndex ? "player-active" : ""
            }`}
          >
            <div className="player-name">
              {p.name}
              {p.id === mySocketId && " (Tu)"}
            </div>
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
            onPassTurn={handlePassTurn}
            onPanelChange={handlePanelChange}
            lastTarget={gameState.lastSpinTarget}
            forceConsonant={gameState.awaitingConsonant === true}
            disabled={!isMyTurn || betweenRounds}
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
            <div className={`alert alert-enlarged ${gameState.gameMessage.type}`}>
              {gameState.gameMessage.text}
            </div>
          ) : (
            <div className="alert-placeholder">—</div>
          )}

          {!isMyTurn && !betweenRounds && (
            <div className="alert warning">
              ⏸️ Turno di {gameState.players[gameState.currentPlayerIndex]?.name}
            </div>
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

      {isMyTurn && turnTimer <= 10 && turnTimer > 0 && !betweenRounds && (
        <div className="turn-timer">{turnTimer}</div>
      )}

      {/* ✅ NUOVO: Overlay tra i round */}
      {betweenRounds && (
        <div className="round-won-overlay">
          <div className="round-won-box">
            <div className="round-won-title">🎉 FRASE INDOVINATA! 🎉</div>
            <div className="round-won-winner">{winnerName} ha vinto il round!</div>
            <div className="round-won-countdown">
              Il prossimo round inizia tra <span className="countdown-number">{roundCountdown}</span> secondi...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}