// src/pages/Game.jsx - MODALITÀ PRESENTATORE
import React, { useEffect, useState } from "react";
import "../styles/game-layout.css";
import "../styles/controls.css";
import "../styles/tiles.css";
import "../styles/letter-grid.css";

import Controls from "../components/Controls";
import PhraseManager from "../components/PhraseManager";
import Wheel from "../components/Wheel";
import FinalScoreboard from "../components/FinalScoreboard";
import LetterGrid from "../components/LetterGrid";

import { buildGridWithCoordinates, maskGrid } from "../game/GameEngine";
import socket from "../socket";

export default function Game({ players = [], totalRounds = 3, state, onExitToLobby }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mySocketId, setMySocketId] = useState(socket.id);
  const [roomCode, setRoomCode] = useState(state?.roomCode || null);
  const [joinRequest, setJoinRequest] = useState(null);
  
  // ✅ NUOVO: Stati per modalità presentatore
  const [showPhrase, setShowPhrase] = useState(false);
  const [awaitingSolutionCheck, setAwaitingSolutionCheck] = useState(false);
  const [activeLetterType, setActiveLetterType] = useState(null); // "consonant" | "vowel" | null

  const [gameState, setGameState] = useState(() => {
    if (!state) return null;
    
    // ✅ Se il server ha già un gameState (partita in corso), usalo!
    if (state.gameState) {
      console.log("🎮 Usando gameState dal server (partita in corso)");
      return {
        ...state.gameState,
        roomCode: state.roomCode
      };
    }
    
    // ✅ Altrimenti crea nuovo gameState (partita appena iniziata)
    console.log("🆕 Creando nuovo gameState");
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

  const [grid, setGrid] = useState(null);
  const [maskedGrid, setMaskedGrid] = useState(null);
  const [revealQueue, setRevealQueue] = useState([]);
  const [pendingLetter, setPendingLetter] = useState(null); // ✅ Lettera in attesa di animazione
  const [turnTimer, setTurnTimer] = useState(60);
  const [timerPaused, setTimerPaused] = useState(false);
  const [betweenRounds, setBetweenRounds] = useState(false);
  const [roundCountdown, setRoundCountdown] = useState(0);
  const [winnerName, setWinnerName] = useState("");
  
  // Stati per tracciare consonanti/vocali finite
  const [consonantsFinished, setConsonantsFinished] = useState(false);
  const [vowelsFinished, setVowelsFinished] = useState(false);

  // ⭐ NUOVO: Stati per sincronizzazione animazione ruota
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelSpinSeed, setWheelSpinSeed] = useState(null);
  const [wheelTargetAngle, setWheelTargetAngle] = useState(null);

  // ✅ NUOVO: Colore random per round (mai bianco/nero)
  const [roundColor, setRoundColor] = useState(() => {
    const colors = [
      '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', 
      '#FFFF00', '#FF6600', '#FF0066', '#6600FF', '#00FF66',
      '#FF3300', '#33FF00', '#0033FF', '#FF0033', '#3300FF'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  });

  // ✅ Calcola dinamicamente se sei presentatore dal gameState
  const isPresenter = state?.room?.gameMode === "presenter" && 
                      gameState?.players?.find(p => p.id === mySocketId)?.isHost;

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

  // ✅ NUOVO: Riconnessione socket quando torni sull'app (fix crash)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Riconnetti socket se disconnesso
        if (!socket.connected) {
          console.log("🔄 Riconnessione socket...");
          socket.connect();
          
          // Richiedi aggiornamento stato
          if (roomCode) {
            socket.emit("requestGameState", { roomCode });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomCode]);

  // ✅ NUOVO: Listener per richieste join durante partita
  useEffect(() => {
    function handleJoinRequest(request) {
      console.log("🔔 Richiesta join:", request);
      setJoinRequest(request);
    }

    function handleJoinRequestResolved({ playerId }) {
      if (joinRequest && joinRequest.playerId === playerId) {
        console.log("✅ Richiesta già gestita");
        setJoinRequest(null);
      }
    }

    socket.on("joinRequest", handleJoinRequest);
    socket.on("joinRequestResolved", handleJoinRequestResolved);
    
    return () => {
      socket.off("joinRequest", handleJoinRequest);
      socket.off("joinRequestResolved", handleJoinRequestResolved);
    };
  }, [joinRequest]);

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
    function handleGameStateUpdate({ gameState: serverState, revealQueue: newRevealQueue, letterToReveal }) {
      if (serverState) {
        setGameState(serverState);
        
        // ✅ Aggiorna revealQueue se presente
        if (newRevealQueue && newRevealQueue.length > 0) {
          // ✅ CONVERSIONE: {r, c, ch} → {x, y, char}
          const converted = newRevealQueue.map(coord => ({
            x: coord.c || coord.x,
            y: coord.r || coord.y,
            char: coord.ch || coord.char
          }));
          setRevealQueue(converted);
          
          // ✅ Salva lettera da confermare dopo animazione
          if (letterToReveal) {
            setPendingLetter(letterToReveal);
          }
        }
        
        // ⭐ NUOVO: Ferma spinning quando finisce
        if (serverState && !serverState.spinning) {
          setWheelSpinning(false);
        }
        
        // ✅ PRESENTATORE: Reset griglia dopo azione completata
        if (isPresenter) {
          setActiveLetterType(null);
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
      
      // ✅ Genera nuovo colore per il prossimo round
      const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', 
        '#FFFF00', '#FF6600', '#FF0066', '#6600FF', '#00FF66',
        '#FF3300', '#33FF00', '#0033FF', '#FF0033', '#3300FF'
      ];
      setRoundColor(colors[Math.floor(Math.random() * colors.length)]);
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

  // ✅ NUOVO: Costruisci grid dalla frase
  useEffect(() => {
    if (!gameState || !gameState.phrase) {
      setGrid(null);
      setMaskedGrid(null);
      return;
    }

    try {
      // Costruisci grid con coordinate
      const newGrid = buildGridWithCoordinates(gameState.phrase, 16, 5); // ✅ 16 cols, 5 rows
      setGrid(newGrid);
      
      // Maschera grid
      const revealed = gameState.revealedLetters || [];
      const masked = maskGrid(newGrid, revealed);
      setMaskedGrid(masked);
    } catch (error) {
      console.error("❌ Errore costruzione grid:", error);
      setGrid(null);
      setMaskedGrid(null);
    }
  }, [gameState?.phrase, gameState?.revealedLetters]);

  // Calcola se consonanti e vocali sono finite
  useEffect(() => {
    if (!gameState) return;
    
    const phrase = gameState.phrase || "";
    const revealedLetters = gameState.revealedLetters || [];
    
    // Normalizza e estrai tutte le lettere dalla frase
    const allLetters = phrase.toUpperCase().replace(/[^A-ZÀÈÉÌÒÙ]/g, '').split('');
    
    // Vocali italiane
    const vowels = ['A', 'E', 'I', 'O', 'U', 'À', 'È', 'É', 'Ì', 'Ò', 'Ù'];
    
    // Lettere rivelate normalizzate
    const revealed = revealedLetters.map(l => l.toUpperCase());
    
    // Trova vocali e consonanti uniche nella frase
    const uniqueVowels = [...new Set(allLetters.filter(l => vowels.includes(l)))];
    const uniqueConsonants = [...new Set(allLetters.filter(l => !vowels.includes(l)))];
    
    // Controlla se tutte le vocali sono state rivelate
    const allVowelsRevealed = uniqueVowels.every(v => revealed.includes(v));
    setVowelsFinished(allVowelsRevealed);
    
    // Controlla se tutte le consonanti sono state rivelate
    const allConsonantsRevealed = uniqueConsonants.every(c => revealed.includes(c));
    setConsonantsFinished(allConsonantsRevealed);
    
  }, [gameState?.phrase, gameState?.revealedLetters]);

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

  const handleRevealDone = () => {
    // ✅ Manda conferma al server
    if (pendingLetter && roomCode) {
      socket.emit("animationComplete", { 
        roomCode: roomCode, 
        letter: pendingLetter 
      });
      setPendingLetter(null);
    }
    setRevealQueue([]);
  };

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

  // ✅ NUOVO: Gestione richieste join
  const handleAcceptJoin = () => {
    if (!joinRequest) return;
    socket.emit("acceptJoinRequest", {
      playerId: joinRequest.playerId,
      playerName: joinRequest.playerName,
      roomCode: joinRequest.roomCode,
      type: joinRequest.type,
      isReconnection: joinRequest.isReconnection || false // ✅ Passa flag
    });
    setJoinRequest(null);
  };

  const handleRejectJoin = () => {
    if (!joinRequest) return;
    socket.emit("rejectJoinRequest", {
      playerId: joinRequest.playerId,
      roomCode: joinRequest.roomCode
    });
    setJoinRequest(null);
  };

  // ✅ NUOVO: Handler modalità presentatore
  const handleViewPhrase = () => {
    setShowPhrase(!showPhrase); // Toggle on/off
  };

  const handleCorrectSolution = () => {
    if (!roomCode) return;
    socket.emit("presenterSolutionCheck", {
      roomCode,
      isCorrect: true
    });
    setAwaitingSolutionCheck(false);
  };

  const handleWrongSolution = () => {
    if (!roomCode) return;
    socket.emit("presenterSolutionCheck", {
      roomCode,
      isCorrect: false
    });
    setAwaitingSolutionCheck(false);
  };

  const handleLetterClick = (letter) => {
    if (!roomCode || !gameState) return;
    
    // Determina se è consonante o vocale
    const vowels = ["A", "E", "I", "O", "U"];
    const isVowel = vowels.includes(letter);
    
    if (isVowel) {
      socket.emit("playVowel", { roomCode, letter });
    } else {
      socket.emit("playConsonant", { roomCode, letter });
    }
    
    setActiveLetterType(null);
  };

  // ✅ NUOVO: Listener per richieste soluzione (presentatore)
  useEffect(() => {
    if (!isPresenter) return;
    
    function handleSolutionAttempt() {
      console.log("🎯 Giocatore ha tentato soluzione - attesa verifica");
      setAwaitingSolutionCheck(true);
    }
    
    socket.on("solutionAttempt", handleSolutionAttempt);
    return () => socket.off("solutionAttempt", handleSolutionAttempt);
  }, [isPresenter]);

  // ✅ NUOVO: Listener per mostrare griglia (presentatore)
  useEffect(() => {
    if (!isPresenter) return;
    
    function handleShowLetterGrid({ type }) {
      console.log("🔤 Mostra griglia:", type);
      setActiveLetterType(type); // "consonant" | "vowel"
    }
    
    socket.on("showLetterGrid", handleShowLetterGrid);
    return () => socket.off("showLetterGrid", handleShowLetterGrid);
  }, [isPresenter]);

  // ✅ NUOVO: Listener sincronizza stato pulsanti per TUTTI i client
  useEffect(() => {
    function handleButtonStateSync({ type, playerId }) {
      console.log("🔘 Sincronizza pulsante:", type, playerId);
      
      // Se sono il giocatore che ha premuto O sono il presentatore, illumino
      if (mySocketId === playerId || isPresenter) {
        setActiveLetterType(type); // "consonant" | "vowel" | "solution"
      }
    }
    
    socket.on("buttonStateSync", handleButtonStateSync);
    return () => socket.off("buttonStateSync", handleButtonStateSync);
  }, [mySocketId, isPresenter]);

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
    
    // ✅ MODALITÀ PRESENTATORE: Giocatore NON passa lettera, server notifica presentatore
    if (state?.room?.gameMode === "presenter" && !isPresenter) {
      setActiveLetterType("consonant"); // Illumina pulsante
      socket.emit("playConsonant", { roomCode, letter: null }, (res) => {
        if (!res?.ok) alert(res?.error || "Errore consonante");
      });
      return;
    }
    
    // ✅ Modalità normale o presentatore che clicca lettera
    socket.emit("playConsonant", { roomCode, letter }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore consonante");
    });
  };

  const handleVowel = (letter) => {
    if (!roomCode) return;
    
    // ✅ MODALITÀ PRESENTATORE: Giocatore NON passa lettera, server notifica presentatore
    if (state?.room?.gameMode === "presenter" && !isPresenter) {
      setActiveLetterType("vowel"); // Illumina pulsante
      socket.emit("playVowel", { roomCode, letter: null }, (res) => {
        if (!res?.ok) alert(res?.error || "Errore vocale");
      });
      return;
    }
    
    // ✅ Modalità normale o presentatore che clicca lettera
    socket.emit("playVowel", { roomCode, letter }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore vocale");
    });
  };

  const handleSolution = (text) => {
    if (!roomCode) return;
    
    // ✅ MODALITÀ PRESENTATORE: Giocatore NON passa testo, server notifica presentatore
    if (state?.room?.gameMode === "presenter" && !isPresenter) {
      setActiveLetterType("solution"); // Illumina pulsante
      socket.emit("trySolution", { roomCode, text: "" }, (res) => {
        if (!res?.ok) alert(res?.error || "Errore soluzione");
      });
      return;
    }
    
    // ✅ Modalità normale: Giocatore passa il testo della soluzione
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
    // ✅ Reset animazione prima di cambiare frase
    setRevealQueue([]);
    socket.emit("changePhrase", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore cambio frase");
    });
  };

  const handleRestartGame = () => {
    if (!roomCode) return;
    socket.emit("startGame", { roomCode }, (res) => {
      if (!res?.ok) alert(res?.error || "Errore riavvio partita");
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
        <FinalScoreboard 
          players={gameState.players} 
          onRestartGame={handleRestartGame}
          onBackToLobby={handleExitRoom} 
        />
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
        {gameState.players
          .filter(p => !p.isHost || state?.room?.gameMode !== "presenter") // ✅ Nascondi presentatore per TUTTI
          .map((p, i) => {
            // ✅ Ricalcola indice corretto per active
            const actualIndex = gameState.players.findIndex(player => player.id === p.id);
            return (
              <div
                key={i}
                className={`player-box ${
                  actualIndex === gameState.currentPlayerIndex ? "player-active" : ""
                }`}
              >
                <div className="player-name">
                  {p.name}
                  {p.id === mySocketId && " (Tu)"}
                </div>
                <div className="player-round">{p.roundScore} pt</div>
                <div className="player-total">Tot: {p.totalScore}</div>
              </div>
            );
          })}
      </div>

      <div>
        <div className="game-round-info">
          ROUND {gameState.currentRound} / {gameState.totalRounds}
        </div>

        {/* ✅ NUOVO: Info box nome stanza */}
        <div className="game-room-name">
          🏠 {roomCode}
        </div>

        {/* ✅ PRESENTATORE: Griglia QWERTY completa SEMPRE visibile */}
        {isPresenter && (
          <LetterGrid
            usedLetters={gameState.usedLetters || []}
            onLetterClick={handleLetterClick}
            onPassTurn={handlePassTurn}
            disabled={!activeLetterType} // Disabilitata finché giocatore non preme pulsante
            activeLetterType={activeLetterType}
          />
        )}

        {/* ✅ GIOCATORI: Ruota SEMPRE visibile */}
        {!isPresenter && (
          <div className="game-wheel-area">
            <Wheel
              slices={gameState.wheel}
              spinning={wheelSpinning}
              spinSeed={wheelSpinSeed}
              targetAngle={wheelTargetAngle}
              onStop={handleWheelStop}
            />
          </div>
        )}

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
            isPresenter={isPresenter}
            gameMode={state?.room?.gameMode || "classic"}
            showPhrase={showPhrase}
            onViewPhrase={handleViewPhrase}
            onCorrectSolution={handleCorrectSolution}
            onWrongSolution={handleWrongSolution}
            awaitingSolutionCheck={awaitingSolutionCheck}
            activeLetterType={activeLetterType}
          />
        </div>

        {/* Scritte consonanti/vocali finite */}
        {consonantsFinished && (
          <div className="consonants-finished">
            CONSONANTI FINITE
          </div>
        )}
        
        {vowelsFinished && (
          <div className="vowels-finished">
            VOCALI FINITE
          </div>
        )}

        <div className="game-board-area">
          <PhraseManager
            grid={showPhrase && isPresenter ? grid : maskedGrid}
            revealQueue={revealQueue}
            onRevealDone={handleRevealDone}
            category={gameState.category || "-"}
            onChangePhrase={handleChangePhrase}
            flash={flashType}
            roundColor={roundColor}
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

      {/* ✅ POPUP RICHIESTA JOIN */}
      {joinRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '30px',
            borderRadius: '12px',
            border: '2px solid #00ff55',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <h2 style={{ color: '#00ff55', marginBottom: '20px', fontSize: '1.5rem' }}>
              🔔 Nuova Richiesta
            </h2>
            <p style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '10px', color: 'white' }}>
              {joinRequest.playerName}
            </p>
            <p style={{ fontSize: '1rem', marginBottom: '30px', color: '#aaa' }}>
              {joinRequest.isReconnection 
                ? '🔄 sta riprendendo il suo giocatore'
                : `vuole unirsi come ${joinRequest.type === 'player' ? '🎮 GIOCATORE' : '👀 SPETTATORE'}`
              }
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={handleAcceptJoin} style={{
                padding: '12px 30px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: '#00ff55',
                color: 'black',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                ✅ ACCETTA
              </button>
              <button onClick={handleRejectJoin} style={{
                padding: '12px 30px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: '#ff3333',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                ❌ RIFIUTA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}