// src/pages/Game.jsx - CON SINCRONIZZAZIONE ANIMAZIONE RUOTA
import React, { useEffect, useState } from "react";
import "../styles/game-layout.css";
import "../styles/controls.css";
import "../styles/tiles.css";

import Controls from "../components/Controls";
import PhraseManager from "../components/PhraseManager";
import Wheel from "../components/Wheel";
import FinalScoreboard from "../components/FinalScoreboard";

import { maskBoard, buildBoard } from "../game/GameEngine";
import socket from "../socket";

export default function Game({ players = [], totalRounds = 3, state, onExitToLobby }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mySocketId, setMySocketId] = useState(socket.id);
  const [roomCode, setRoomCode] = useState(state?.roomCode || null);

  const [gameState, setGameState] = useState(() => {
    if (!state) return null;
    
    return {
      players: (state.room?.players || []).map(p => ({
        name: p.name,
        id: p.id,
        totalScore: 0,
        roundScore: 0
      })),
      totalRounds: state.room?.totalRounds || totalRounds || 3,
      currentRound: 1,
      currentPlayerIndex: 0,
      currentPlayerId: (state.room?.players || [])[0]?.id,
      
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
      
      roomCode: state.roomCode
    };
  });

  const [maskedRows, setMaskedRows] = useState([]);
  const [revealQueue, setRevealQueue] = useState([]);
  const [turnTimer, setTurnTimer] = useState(60);
  const [timerPaused, setTimerPaused] = useState(false);
  const [betweenRounds, setBetweenRounds] = useState(false);
  const [roundCountdown, setRoundCountdown] = useState(0);
  const [winnerName, setWinnerName] = useState("");

  // ⭐ NUOVO: Stati per sincronizzazione animazione ruota
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelSpinSeed, setWheelSpinSeed] = useState(null);
  const [wheelTargetAngle, setWheelTargetAngle] = useState(null);

  // Funzione toggle fullscreen
  const toggleFullscreen = async () => {
    const wrapper = document.querySelector('.game-wrapper');
    
    if (!isFullscreen) {
      try {
        wrapper?.classList.add('fullscreen-mode');
        const element = document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (error) {
        console.error('Errore fullscreen:', error);
        wrapper?.classList.remove('fullscreen-mode');
      }
    } else {
      try {
        wrapper?.classList.remove('fullscreen-mode');
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        setIsFullscreen(false);
      } catch (error) {
        console.error('Errore uscita fullscreen:', error);
      }
    }
  };

  useEffect(() => {
    if (roomCode && mySocketId) {
      localStorage.setItem("gameSession", JSON.stringify({
        roomCode,
        socketId: mySocketId,
        timestamp: Date.now()
      }));
    }
  }, [roomCode, mySocketId]);

  useEffect(() => {
    const savedSession = localStorage.getItem("gameSession");
    if (savedSession) {
      try {
        const { roomCode: savedRoom, timestamp } = JSON.parse(savedSession);
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          console.log("🔄 Tentativo riconnessione a:", savedRoom);
          setRoomCode(savedRoom);
        } else {
          localStorage.removeItem("gameSession");
        }
      } catch (e) {
        console.error("Errore parsing sessione:", e);
      }
    }
  }, []);

  useEffect(() => {
    setMySocketId(socket.id);
  }, []);

  // Listener per uscita fullscreen con ESC
  useEffect(() => {
    const handleChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFull && isFullscreen) {
        document.querySelector('.game-wrapper')?.classList.remove('fullscreen-mode');
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, [isFullscreen]);

  useEffect(() => {
    function handleGameStart({ gameState: serverState }) {
      console.log("🚀 GameStart dal server:", serverState);
      if (serverState) {
        setGameState(serverState);
        setTurnTimer(60);
        setBetweenRounds(false);
      }
    }

    socket.on("gameStart", handleGameStart);
    return () => socket.off("gameStart", handleGameStart);
  }, []);

  // ⭐ NUOVO: Listener per wheelSpinStart
  useEffect(() => {
    function handleWheelSpinStart({ spinning, spinSeed, targetAngle }) {
      console.log("🎡 wheelSpinStart ricevuto:", { spinning, spinSeed, targetAngle });
      setWheelSpinning(spinning);
      setWheelSpinSeed(spinSeed);
      setWheelTargetAngle(targetAngle);
    }

    socket.on("wheelSpinStart", handleWheelSpinStart);
    return () => socket.off("wheelSpinStart", handleWheelSpinStart);
  }, []);

  useEffect(() => {
    function handleGameStateUpdate({ gameState: serverState }) {
      console.log("🔄 Update dal server:", serverState);
      if (serverState) {
        setGameState(serverState);
        
        // ⭐ NUOVO: Ferma spinning quando finisce
        if (serverState && !serverState.spinning) {
          setWheelSpinning(false);
        }
        
        setTurnTimer(60);
      }
    }

    socket.on("gameStateUpdate", handleGameStateUpdate);
    return () => socket.off("gameStateUpdate", handleGameStateUpdate);
  }, []);

  useEffect(() => {
    function handleRoundWon({ winnerName, countdown }) {
      console.log("🎉 Round vinto da:", winnerName);
      setWinnerName(winnerName);
      setBetweenRounds(true);
      setRoundCountdown(countdown);
    }

    socket.on("roundWon", handleRoundWon);
    return () => socket.off("roundWon", handleRoundWon);
  }, []);

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

  const handleExitRoom = () => {
    const confirmed = window.confirm("Sei sicuro di voler abbandonare la partita?");
    
    if (confirmed) {
      localStorage.removeItem("gameSession");
      if (roomCode) {
        socket.emit("leaveRoom", { roomCode });
      }
      if (onExitToLobby) {
        onExitToLobby();
      } else {
        window.location.reload();
      }
    }
  };

  const handleSpin = () => {
    if (!roomCode) return;
    socket.emit("spinWheel", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore spin");
    });
  };

  const handleWheelStop = (outcome) => {
    console.log("🎡 Ruota fermata (visivo):", outcome);
  };

  const handleConsonant = (letter) => {
    if (!roomCode) return;
    socket.emit("playConsonant", { roomCode, letter }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore consonante");
    });
  };

  const handleVowel = (letter) => {
    if (!roomCode) return;
    socket.emit("playVowel", { roomCode, letter }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore vocale");
    });
  };

  const handleSolution = (text) => {
    if (!roomCode) return;
    socket.emit("trySolution", { roomCode, text }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore soluzione");
    });
  };

  const handlePassTurn = () => {
    if (!roomCode) return;
    socket.emit("passTurn", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore passa turno");
    });
  };

  const handleChangePhrase = () => {
    if (!roomCode) return;
    socket.emit("changePhrase", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore cambio frase");
    });
  };

  if (!gameState) {
    return (
      <div className="game-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Errore: dati partita mancanti</p>
        <button onClick={() => window.location.reload()}>Ricarica</button>
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
      <button className="btn-exit-room" onClick={handleExitRoom} title="Esci dalla stanza">
        ❌ Esci
      </button>

      <button 
        className="btn-fullscreen" 
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: '1vh',
          right: '12vw',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 'bold',
          background: '#4299e1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          zIndex: 1001
        }}
        title={isFullscreen ? "Esci da fullscreen" : "Vai fullscreen"}
      >
        {isFullscreen ? '⊡' : '⛶'}
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
            spinning={wheelSpinning}
            spinSeed={wheelSpinSeed}
            targetAngle={wheelTargetAngle}
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