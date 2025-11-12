// Game.jsx - CORRETTO per animazione ruota sincronizzata
import React, { useEffect, useRef, useState } from "react";
import socket from "./socket";
import { maskBoard, letterOccurrences } from "./game/GameEngine";
import WheelVersionA from "./components/Wheel";
import Controls from "./components/Controls";
import Board from "./components/Board";
import "./styles/game-layout.css";

export default function Game({ state, onExitRoom }) {
  const [gameState, setGameState] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);

  const [maskedRows, setMaskedRows] = useState([]);
  const [revealQueue, setRevealQueue] = useState([]);
  const [turnTimer, setTurnTimer] = useState(60);
  const [timerPaused, setTimerPaused] = useState(false);
  const [betweenRounds, setBetweenRounds] = useState(false);
  const [roundCountdown, setRoundCountdown] = useState(0);
  const [winnerName, setWinnerName] = useState("");

  // ⭐ NUOVO: Stati per la ruota
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelSpinSeed, setWheelSpinSeed] = useState(null);

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

  // Inizializza gameState
  useEffect(() => {
    if (state) {
      setGameState({
        players: state.players || [],
        totalRounds: state.totalRounds || 3,
        currentRound: 1,
        currentPlayerIndex: 0,
        currentPlayerId: state.players?.[0]?.id || null,

        phrase: state.phrase || "",
        rows: Array.isArray(state.rows) ? state.rows : [],
        category: state.category || "",

        revealedLetters: [],
        usedLetters: [],

        wheel: [],
        spinning: false,
        mustSpin: true,
        awaitingConsonant: false,
        pendingDouble: false,
        lastSpinTarget: 0,

        gameMessage: { type: "info", text: "🎬 Inizia il gioco!" },
        gameOver: false,

        roomCode: state.roomCode,
      });
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
    return () => socket.off("gameStart", handleGameStart);
  }, []);

  // ⭐ NUOVO: Ascolta wheelSpinStart per ANIMAZIONE
  useEffect(() => {
    function handleWheelSpinStart({ spinning, spinSeed }) {
      console.log("🎡 wheelSpinStart ricevuto:", { spinning, spinSeed });
      setWheelSpinning(spinning);
      setWheelSpinSeed(spinSeed);
    }

    socket.on("wheelSpinStart", handleWheelSpinStart);
    return () => socket.off("wheelSpinStart", handleWheelSpinStart);
  }, []);

  // 🔄 ASCOLTA AGGIORNAMENTI STATO DAL SERVER
  useEffect(() => {
    function handleGameStateUpdate({ gameState: serverState }) {
      console.log("🔄 Aggiornamento stato dal server:", serverState);
      setGameState(serverState);
      
      // ⭐ Quando arriva l'update finale, ferma lo spinning
      if (serverState && !serverState.spinning) {
        setWheelSpinning(false);
      }
      
      setTurnTimer(60);
    }

    socket.on("gameStateUpdate", handleGameStateUpdate);
    return () => socket.off("gameStateUpdate", handleGameStateUpdate);
  }, []);

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

  // Timer turno con pausa
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

  // Countdown tra i round
  useEffect(() => {
    if (!betweenRounds || roundCountdown <= 0) return;

    const id = setInterval(() => {
      setRoundCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setBetweenRounds(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [betweenRounds, roundCountdown]);

  const handleRevealDone = () => setRevealQueue([]);

  const handlePanelChange = (panelName) => {
    setTimerPaused(panelName !== null);
  };

  // === HANDLERS ===

  const handleSpin = () => {
    if (!roomCode) return;
    console.log("🎡 Richiesta spin al server");
    
    socket.emit("spinWheel", { roomCode }, (response) => {
      if (response?.ok) {
        console.log("✅ Spin avviato");
      } else {
        console.error("❌ Errore spin:", response?.error);
        alert(response?.error || "Errore spin");
      }
    });
  };

  const handleWheelStop = (outcome) => {
    console.log("🛑 Ruota fermata con outcome:", outcome);
    // Il server gestisce già l'outcome, non serve fare nulla qui
  };

  const handleConsonant = (letter) => {
    if (!roomCode) return;
    console.log("📝 Invio consonante:", letter);

    socket.emit("playConsonant", { roomCode, letter }, (response) => {
      if (!response?.ok) {
        alert(response?.error || "Errore consonante");
      }
    });
  };

  const handleVowel = (letter) => {
    if (!roomCode) return;
    console.log("📝 Invio vocale:", letter);

    socket.emit("buyVowel", { roomCode, letter }, (response) => {
      if (!response?.ok) {
        alert(response?.error || "Errore vocale");
      }
    });
  };

  const handleSolution = (text) => {
    if (!roomCode) return;
    console.log("💡 Tentativo soluzione:", text);

    socket.emit("trySolution", { roomCode, solutionText: text }, (response) => {
      if (!response?.ok) {
        alert(response?.error || "Errore soluzione");
      }
    });
  };

  const handlePassTurn = () => {
    if (!roomCode) return;
    console.log("⏭️ Passa turno");

    socket.emit("passTurn", { roomCode }, (response) => {
      if (!response?.ok) {
        alert(response?.error || "Errore passa turno");
      }
    });
  };

  const handleChangePhrase = (newPhrase, newCategory) => {
    if (!roomCode) return;
    console.log("🔄 Cambio frase:", newPhrase);

    socket.emit("changePhrase", { roomCode, newPhrase, newCategory }, (response) => {
      if (!response?.ok) {
        alert(response?.error || "Errore cambio frase");
      }
    });
  };

  const handleExitRoom = () => {
    if (roomCode) {
      socket.emit("leaveRoom", { roomCode });
      localStorage.removeItem("gameSession");
    }
    onExitRoom && onExitRoom();
  };

  if (!gameState) {
    return (
      <div className="game-wrapper">
        <div className="center-overlay">
          <div className="center-box">
            <p>⏳ Caricamento partita...</p>
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = gameState.currentPlayerId === mySocketId;
  const currentPlayer = gameState.players?.find((p) => p.id === gameState.currentPlayerId);

  return (
    <div className="game-wrapper">
      {/* USCITA */}
      <button className="btn-exit-room" onClick={handleExitRoom}>
        ❌ Esci
      </button>

      {/* TIMER */}
      {isMyTurn && !betweenRounds && (
        <div className="turn-timer">⏱️ {turnTimer}s</div>
      )}

      {/* INFO ROUND */}
      <div className="game-round-info">
        Round {gameState.currentRound}/{gameState.totalRounds} • {gameState.category || "Categoria"}
      </div>

      {/* TABELLONE */}
      <div className="game-board-area">
        <Board rows={maskedRows} revealQueue={revealQueue} onRevealDone={handleRevealDone} />
      </div>

      {/* RUOTA - ⭐ USA wheelSpinning e wheelSpinSeed */}
      <WheelVersionA
        slices={gameState.wheel || []}
        spinning={wheelSpinning}
        spinSeed={wheelSpinSeed}
        onStop={handleWheelStop}
      />

      {/* CONTROLLI */}
      <div className="controls-area">
        <Controls
          onSpin={handleSpin}
          onConsonant={handleConsonant}
          onVowel={handleVowel}
          onSolution={handleSolution}
          onPassTurn={handlePassTurn}
          lastTarget={gameState.lastSpinTarget}
          forceConsonant={gameState.awaitingConsonant}
          disabled={!isMyTurn || betweenRounds}
          onPanelChange={handlePanelChange}
        />

        {/* MESSAGGI */}
        <div className="game-alerts">
          {gameState.gameMessage ? (
            <div className={`alert ${gameState.gameMessage.type || "info"} alert-enlarged`}>
              {gameState.gameMessage.text}
            </div>
          ) : (
            <div className="alert-placeholder">In attesa di azione...</div>
          )}
        </div>
      </div>

      {/* GIOCATORI */}
      <div className="game-players">
        {gameState.players?.map((p) => (
          <div
            key={p.id}
            className={`player-card ${p.id === gameState.currentPlayerId ? "player-active" : ""}`}
          >
            <div className="player-name">{p.name}</div>
            <div className="player-score">{p.roundScore} pt</div>
          </div>
        ))}
      </div>

      {/* CLASSIFICA */}
      <div className="scoreboard">
        <h4>🏆 Classifica</h4>
        {gameState.players
          ?.slice()
          .sort((a, b) => b.totalScore - a.totalScore)
          .map((p) => (
            <div key={p.id} className="score-row">
              <span>{p.name}</span>
              <span>{p.totalScore}</span>
            </div>
          ))}
      </div>

      {/* OVERLAY ROUND VINTO */}
      {betweenRounds && (
        <div className="round-won-overlay">
          <div className="round-won-box">
            <div className="round-won-title">🎉 ROUND COMPLETATO!</div>
            <div className="round-won-winner">Vincitore: {winnerName}</div>
            <div className="round-won-countdown">
              Prossimo round tra: <span className="countdown-number">{roundCountdown}</span>s
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState.gameOver && (
        <div className="center-overlay">
          <div className="center-box">
            <h2>🏁 PARTITA TERMINATA!</h2>
            <p>
              Vincitore:{" "}
              {gameState.players?.reduce((max, p) => (p.totalScore > max.totalScore ? p : max))?.name}
            </p>
            <button className="btn-primary" onClick={handleExitRoom}>
              Torna alla Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}